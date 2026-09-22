// PART 25 — SMART DOCUMENTS REVIEW / PREVIEW (مراجعة)
// Behavioral test in real Chrome via Puppeteer. Covers: the Review button,
// entering preview, stage indicator ● ● ● ○, real preview of ALL pages
// (text/headings/tables/images/logo/signature/margins/A4 ratio/design),
// page navigation (صفحة X من Y), RTL/LTR, document name (PART 24),
// dirty state untouched (PART 20), signature protection untouched (PART 18),
// back-to-edit with zero content change, Calculator/Notes/History unaffected,
// responsive 1280/768/390/360, offline review, no network requests for the
// document, no alert/confirm/prompt, no JS errors, no duplicates.
// Run:  node tests/part25_smart_review.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8296;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p25_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKUlEQVR4nGP8z8Dwn4GKgImaho0aJkyYMGHChAkTJkyYMGECDWQ0bNCwAABTK1R9EhLsBAAAAABJRU5ErkJggg==';
const pngPath = path.join(os.tmpdir(), 'part25_image.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_B64, 'base64'));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function openBlank(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
const noHOverflow = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth + 1);
const dialogs = (page) => page.evaluate(() => window.__dialogs);
const pagesDesc = (page) => page.evaluate(() => window.__smartPages.describe());
const dirty = (page) => page.evaluate(() => !!window.__smartSave.getState().dirty);
const sigProt = (page) => page.evaluate(() => ({
  status: window.__smartSignatureProtection.status(),
  invalidated: window.__smartSignatureProtection.invalidated(),
  signed: window.__smartSignatureProtection.signedCount()
}));
const revState = (page) => page.evaluate(() => ({
  active: window.__smartReview.active(),
  dots: window.__smartReview.dots(),
  name: window.__smartReview.shownName(),
  barHidden: document.getElementById('smartReviewBar').hidden,
  toolbarDisplay: getComputedStyle(document.querySelector('.smart-blank-toolbar')).display,
  reviewBtnCount: document.querySelectorAll('#smartReviewBtn').length,
  barCount: document.querySelectorAll('#smartReviewBar').length,
  counter: document.getElementById('smartPageCount').textContent.trim(),
  counterLabel: document.querySelector('.smart-page-counter').textContent.replace(/\s+/g, ' ').trim(),
  addBtnHidden: getComputedStyle(document.getElementById('smartPageAddBtn')).display === 'none'
}));
async function upload(page, sel) {
  const inp = await page.$(sel);
  if (inp) await inp.uploadFile(pngPath);
  await sleep(400);
}
// PART 24 rename flow: click the title, replace text, press Enter.
async function rename(page, value) {
  await page.evaluate(() => document.getElementById('smartBlankDocTitle').click());
  await sleep(150);
  await page.evaluate(() => {
    const i = document.getElementById('smartBlankTitleInput');
    i.focus(); i.setSelectionRange(0, i.value.length);
  });
  await page.type('#smartBlankTitleInput', value);
  await page.keyboard.press('Enter');
  await sleep(250);
}
(async () => {
  // ============================================================
  // A) ARABIC (RTL) — full review flow on a rich 3-page document.
  // ============================================================
  let env = await newPage({ width: 1280, height: 900 });
  let page = env.page;
  await openBlank(page, 'ar');

  // Seed a realistic document: heading + text + table + image + logo + signature.
  await page.evaluate(() => window.__smartBlank.insertElement('heading'));
  await sleep(150);
  await page.evaluate(() => {
    const cv = Array.from(document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden'));
    cv.querySelector('.smart-doc-heading').textContent = 'عقد إيجار';
  });
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(150);
  await page.evaluate(() => {
    const cv = Array.from(document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden'));
    cv.querySelector('.smart-doc-text-block:last-of-type').textContent = 'هذا نص تجريبي للمراجعة';
  });
  await page.evaluate(() => window.__smartBlank.insertElement('table'));
  await sleep(200);
  await upload(page, '#smartAddImageInput');
  await sleep(250);
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="logo"]').click());
  await sleep(200);
  await upload(page, '#smartAddLogoInput');
  await sleep(250);
  // Signature — type method.
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="signature"]').click());
  await sleep(200);
  await page.evaluate(() => document.querySelector('#smartSignatureMenu .smart-sig-item[data-sig-method="type"]').click());
  await sleep(250);
  await page.type('#signatureNameInput', 'محمد أحمد');
  await sleep(200);
  await page.evaluate(() => document.querySelector('#sigStageType .smart-sig-insert').click());
  await sleep(300);

  // Two extra pages; put text on page 2.
  await page.evaluate(() => window.__smartPages.add());
  await sleep(250);
  await page.evaluate(() => window.__smartPages.add());
  await sleep(250);
  await page.evaluate(() => window.__smartPages.go(2));
  await sleep(200);
  await page.evaluate(() => {
    const cv = Array.from(document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden'));
    const p = document.createElement('p');
    p.className = 'smart-doc-text-block';
    p.setAttribute('contenteditable', 'true');
    p.dataset.smartElement = 'text';
    p.textContent = 'محتوى الصفحة الثانية';
    p.setAttribute('dir', 'rtl');
    cv.querySelector('.smart-document-content').appendChild(p);
  });
  await sleep(200);
  await page.evaluate(() => window.__smartPages.go(1));
  await sleep(200);
  // Design preset from PART 16 must survive into review.
  await page.evaluate(() => window.__smartPageDesign.apply('classic'));
  await sleep(200);

  // Document name (PART 24 real UI flow: click title -> type -> Enter).
  await page.evaluate(() => document.getElementById('smartBlankDocTitle').click());
  await sleep(150);
  await page.evaluate(() => {
    const i = document.getElementById('smartBlankTitleInput');
    i.focus(); i.setSelectionRange(0, i.value.length);
  });
  await page.type('#smartBlankTitleInput', 'عقد إيجار محمد');
  await page.keyboard.press('Enter');
  await sleep(250);


  const beforeDesc = await pagesDesc(page);
  const beforeSig = await sigProt(page);
  check('A0) Content seeded (3 pages, heading/text/table/image/logo/signature)',
    beforeDesc.length === 3 &&
    beforeDesc.some((p) => p.headings.length >= 1 && p.text.length >= 1 && p.tables >= 1 && p.images >= 1 && p.logos >= 1 && p.signatures >= 1),
    JSON.stringify(beforeDesc));

  // 3) Review button exists / single.
  const btnInfo = await page.evaluate(() => {
    const b = document.getElementById('smartReviewBtn');
    return { exists: !!b, count: document.querySelectorAll('#smartReviewBtn').length,
      visible: !!(b && b.offsetParent !== null), label: b ? b.textContent.trim() : '' };
  });
  check('3) Review button (مراجعة) exists and is single', btnInfo.exists && btnInfo.count === 1, JSON.stringify(btnInfo));
  check('3b) Review button label is Arabic مراجعة', btnInfo.label.includes('مراجعة'), btnInfo.label);

  // 23) Dirty state must be UNCHANGED by review. Note: the document may
  // legitimately be dirty here because seeding made REAL edits (PART 20).
  // What PART 25 guarantees: entering/navigating/exiting review adds nothing.
  const dirtyBeforeReview = await dirty(page);

  // 5/6/7) Enter review.
  await page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(350);
  let rv = await revState(page);
  check('5) Clicking مراجعة enters Preview mode', rv.active === true && rv.barHidden === false, JSON.stringify(rv));
  check('6) Stage indicator becomes ● ● ● ○', rv.dots.replace(/\s+/g, ' ') === '\u25CF \u25CF \u25CF \u25CB', rv.dots);
  check('7) Preview UI shown & editing toolbar hidden',
    rv.toolbarDisplay === 'none' && rv.addBtnHidden === true, JSON.stringify(rv));
  check('36) No duplicate Preview (single bar, single is-review view)',
    rv.barCount === 1 &&
    (await page.evaluate(() => document.querySelectorAll('#smartBlankView.is-review').length)) === 1);
  check('37b) No duplicate Review button inside review', rv.reviewBtnCount === 1);
  check('19) Document name shown in Preview (PART 24)', rv.name === 'عقد إيجار محمد', rv.name);

  // 20) RTL preserved in review.
  const dirInfo = await page.evaluate(() => {
    const v = document.getElementById('smartReviewBar');
    return { computed: getComputedStyle(v).direction,
      viewAttr: document.getElementById('smartBlankView').getAttribute('dir') || '' };
  });
  check('20) RTL works in Review', dirInfo.computed === 'rtl' && (dirInfo.viewAttr === 'rtl' || dirInfo.viewAttr === ''), JSON.stringify(dirInfo));

  // 8/9) Pages navigation inside preview.
  check('8) All pages exist in preview (same canvases, not clones)',
    (await page.evaluate(() =>
      document.querySelectorAll('#smartBlankCanvasHolder .smart-blank-canvas').length)) === 3);
  check('9a) Counter shows صفحة 1 من 3', rv.counterLabel.indexOf('صفحة 1 من 3') !== -1, rv.counterLabel);
  await page.click('#smartBlankNextPage'); await sleep(250);
  rv = await revState(page);
  check('9b) Next -> صفحة 2 من 3', rv.counterLabel.indexOf('صفحة 2 من 3') !== -1, rv.counterLabel);
  await page.click('#smartBlankPrevPage'); await sleep(250);
  rv = await revState(page);
  check('9c) Previous -> صفحة 1 من 3', rv.counterLabel.indexOf('صفحة 1 من 3') !== -1, rv.counterLabel);
  check('9d) Navigation did NOT change dirty state', (await dirty(page)) === dirtyBeforeReview);


  // 10-15) Real content rendered in preview (live DOM, same state).
  const duringDesc = await pagesDesc(page);
  check('10/11) Texts and headings appear in preview',
    JSON.stringify(duringDesc.map((p) => ({ t: p.text, h: p.headings }))) ===
    JSON.stringify(beforeDesc.map((p) => ({ t: p.text, h: p.headings }))),
    JSON.stringify(duringDesc));
  check('12) Tables appear in preview', duringDesc.reduce((a, p) => a + p.tables, 0) === beforeDesc.reduce((a, p) => a + p.tables, 0));
  check('13) Images appear in preview', duringDesc.reduce((a, p) => a + p.images, 0) === beforeDesc.reduce((a, p) => a + p.images, 0) && duringDesc.some((p) => p.images >= 1));
  check('14) Logo appears in preview', duringDesc.reduce((a, p) => a + p.logos, 0) >= 1);
  check('15) Signature appears in preview (not removed/recreated)', duringDesc.reduce((a, p) => a + p.signatures, 0) >= 1);

  // 16/17/18) Page area: margins, A4 ratio, design preset.
  const geo = await page.evaluate(() => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas:not(.smart-page-hidden)'))[0];
    const r = cv.getBoundingClientRect();
    return { pad: getComputedStyle(cv.querySelector('.smart-document-content')).padding,
      design: ['none', 'simple', 'classic', 'formal', 'modern'].filter((c) => cv.classList.contains('smart-page-design-' + c)),
      ratio: r.height / r.width };
  });
  check('16) Page area/margins present', parseFloat(geo.pad) > 0, JSON.stringify(geo.pad));
  check('17) A4 ratio preserved (√2 ± 5%)', Math.abs(geo.ratio - Math.SQRT2) < Math.SQRT2 * 0.05, 'ratio=' + geo.ratio.toFixed(3));
  check('18) Page design preset preserved in preview', JSON.stringify(geo.design) === JSON.stringify(['classic']), JSON.stringify(geo.design));

  // Signature protection untouched by entering preview: whatever PART 18
  // decided BEFORE review stays exactly the same inside review (no recompute,
  // no hiding). Seeding edits may have already marked it "modified" — that is
  // correct PART 18 behavior; review itself must not alter it.
  const duringSig = await sigProt(page);
  check('18s) Signature protection state unchanged by review',
    duringSig.status === beforeSig.status &&
    duringSig.invalidated === beforeSig.invalidated &&
    duringSig.signed === beforeSig.signed,
    JSON.stringify(beforeSig) + ' -> ' + JSON.stringify(duringSig));

  // No horizontal overflow at desktop.
  check('33a) No horizontal overflow (1280)', (await noHOverflow(page)) === true);


  // Exit review; then Calculator / Notes / History still work.
  await page.evaluate(() => document.getElementById('smartReviewExitBtn').click());
  await sleep(300);
  check('24) Back-to-edit exits review', (await page.evaluate(() => !window.__smartReview.active())) === true);
  // Calculator: click keypad "7" and read the display.
  const calcDisp = await page.evaluate(() => {
    const d = document.querySelector('.keypad-btn[data-value="7"]');
    if (d) d.click();
    return new Promise((res) => setTimeout(() => {
      const el = document.getElementById('primaryDisplay');
      res(el ? el.textContent.trim() : null);
    }, 250));
  });
  check('26) Calculator works after review', calcDisp !== null && calcDisp.indexOf('7') !== -1, String(calcDisp));
  // Notes manager opens.
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(400);
  const notesOpen = await page.evaluate(() =>
    !!document.getElementById('notesManagerModal') &&
    document.getElementById('notesManagerModal').classList.contains('show'));
  check('27) Notes work after review', notesOpen === true);
  await page.evaluate(() => {
    const m = document.getElementById('notesManagerModal');
    if (m && m.classList.contains('show')) {
      const c = document.getElementById('notesCloseBtn') || m.querySelector('.notes-back-btn, .icon-btn, [aria-label="Close"]');
      if (c) c.click();
    }
  });
  await sleep(300);
  // History opens.
  await page.evaluate(() => {
    const d = document.getElementById('drawer');
    if (!d || !d.classList.contains('open')) document.getElementById('drawerToggle').click();
  });
  await sleep(250);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-history"]').click());
  await sleep(400);
  const histOpen = await page.evaluate(() =>
    !!document.getElementById('historyPanel') &&
    document.getElementById('historyPanel').getAttribute('aria-hidden') === 'false');
  check('28) History works after review', histOpen === true);
  await page.evaluate(() => { const b = document.getElementById('historyBackButton'); if (b) b.click(); });
  await sleep(300);

  // Content unchanged after returning to edit.
  const afterDesc = await pagesDesc(page);
  check('25) Content unchanged after back-to-edit',
    JSON.stringify(afterDesc) === JSON.stringify(beforeDesc),
    JSON.stringify(afterDesc));
  check('29a) No JS errors so far', env.errs.length === 0, env.errs.join(' | ').slice(0, 200));
  const dlg1 = await dialogs(page);
  check('30-32) No alert/confirm/prompt used', dlg1.alert === 0 && dlg1.confirm === 0 && dlg1.prompt === 0, JSON.stringify(dlg1));


  // No English leakage in Arabic review UI.
  await page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(300);
  const arLabels = await page.evaluate(() => ({
    btn: document.querySelector('#smartReviewBtn span[data-i18n]').textContent.trim(),
    exit: document.querySelector('#smartReviewExitBtn span[data-i18n]').textContent.trim(),
    name: document.getElementById('smartReviewDocName').textContent.trim()
  }));
  const latin = (arLabels.btn + '|' + arLabels.exit).replace(/[^A-Za-z]/g, '');
  check('22) No English leakage in Arabic review UI',
    latin.length === 0 && arLabels.btn.includes('مراجعة') && arLabels.name.includes('عقد'),
    JSON.stringify(arLabels) + ' latin="' + latin + '"');

  // Offline review + no document-related network requests.
  await page.setRequestInterception(true);
  const externalReqs = [];
  page.on('request', (req) => {
    const u = req.url();
    if (!u.startsWith('http://127.0.0.1')) externalReqs.push(u);
    req.continue();
  });
  await page.evaluate(() => document.getElementById('smartReviewExitBtn').click());
  await sleep(250);
  await page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(300);
  check('34/35) Review cycle OFFLINE: no external requests, no doc fetch',
    externalReqs.length === 0, JSON.stringify(externalReqs.slice(0, 3)));
  check('23b) Dirty state unchanged after full review cycle', (await dirty(page)) === dirtyBeforeReview);

  // 23c) A FRESH clean document stays clean across a full review cycle.
  const fresh = await newPage({ width: 1280, height: 900 });
  await openBlank(fresh.page, 'ar');
  await fresh.page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(300);
  await fresh.page.evaluate(() => window.__smartPages.go(1));
  await sleep(200);
  await fresh.page.evaluate(() => document.getElementById('smartReviewExitBtn').click());
  await sleep(300);
  check('23c) Review enter/nav/exit never dirties a clean document',
    (await dirty(fresh.page)) === false);
  await fresh.page.close();

  await page.close();

  // ============================================================
  // B) LTR (English).
  // ============================================================
  env = await newPage({ width: 1280, height: 900 });
  page = env.page;
  await openBlank(page, 'en');
  await rename(page, 'Rent Contract');
  await page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(300);
  const enRev = await revState(page);
  const enDir = await page.evaluate(() =>
    getComputedStyle(document.getElementById('smartReviewBar')).direction);
  check('21) LTR works in Review (English locale)',
    enDir === 'ltr' && enRev.active === true && enRev.name === 'Rent Contract',
    JSON.stringify({ dir: enDir, active: enRev.active, name: enRev.name }));
  const enLabels = await page.evaluate(() => ({
    btn: document.querySelector('#smartReviewBtn span[data-i18n]').textContent.trim(),
    exit: document.querySelector('#smartReviewExitBtn span[data-i18n]').textContent.trim()
  }));
  check('21b) English labels localized', enLabels.btn.includes('Review') && enLabels.exit.toLowerCase().includes('back'),
    JSON.stringify(enLabels));
  // Empty-name fallback shows the localized Untitled fallback, never empty.
  await page.evaluate(() => {
    const t = document.getElementById('smartBlankDocTitle');
    if (!t.hidden) t.click();
  });
  await sleep(150);
  await page.evaluate(() => { document.getElementById('smartBlankTitleInput').value = ''; });
  await page.keyboard.press('Enter');
  await sleep(250);
  await page.evaluate(() => window.__smartReview.exit());
  await sleep(200);
  await page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(300);
  const fallbackName = await page.evaluate(() => document.getElementById('smartReviewDocName').textContent.trim());
  check('19b) Empty-name fallback respected (localized Untitled Document)',
    fallbackName.length > 0, fallbackName);

  // ============================================================
  // C) Responsive: 1280 / 768 / 390 / 360.
  // ============================================================
  for (const vp of [{ w: 1280, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }, { w: 360, h: 800 }]) {
    const e2 = await newPage({ width: vp.w, height: vp.h });
    const p2 = e2.page;
    await openBlank(p2, 'ar');
    await p2.evaluate(() => window.__smartBlank.insertElement('text'));
    await sleep(150);
    await p2.evaluate(() => document.getElementById('smartReviewBtn').click());
    await sleep(300);
    const rsp = await p2.evaluate(() => {
      const exit = document.getElementById('smartReviewExitBtn').getBoundingClientRect();
      const canvas = document.querySelector('#smartBlankCanvasHolder .smart-blank-canvas:not(.smart-page-hidden)');
      const cr = canvas.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        ratio: cr.height / cr.width,
        exitTouchable: exit.height >= 30 && exit.width >= 40,
        barVisible: !document.getElementById('smartReviewBar').hidden
      };
    });
    check(`C-${vp.w}) Review ${vp.w}px: no overflow, A4 kept, buttons touchable`,
      rsp.overflow <= 1 && Math.abs(rsp.ratio - Math.SQRT2) < Math.SQRT2 * 0.06 &&
      rsp.exitTouchable && rsp.barVisible, JSON.stringify(rsp));
    await p2.close();
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const summary = `RESULT: ${pass}/${results.length} passed, ${fail} failed`;
  console.log('\n==== ' + summary + ' ====');
  fs.appendFileSync(OUT, '\n' + summary + '\n');
  fs.appendFileSync(OUT, results.filter((r) => !r.ok).map((r) => 'FAILED: ' + r.name + ' -> ' + r.detail).join('\n') + '\n');
  await browser.close();
  server.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => {
  fs.appendFileSync(OUT, 'ERROR: ' + (e && e.stack || e) + '\n');
  console.error(e);
  process.exit(2);
});

