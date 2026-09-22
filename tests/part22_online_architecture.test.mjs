// PART 22 — ONLINE EXTENSIBILITY / SERVER INDEPENDENCE (الاستقلالية عن الخادم)
// Behavioral test in REAL Chrome via Puppeteer. Proves Smart Documents V1 is
// fully server-independent: every non-localhost request is ABORTED (no external
// server reachable) AND every attempted external request is AUDITED so a
// server-side Smart Documents service can never hide. Local authoring (create,
// text, tables, images, logo, signature, signature-protection, page management,
// save/resume) works with zero backend. Verifies the clean boundary future
// online-only features report ("requires an internet connection") without
// blocking the editor, plus RTL/LTR responsiveness. No server, no cloud, no auth.
// Run:  node tests/part22_online_architecture.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8302;
const DRAFT_KEY = 'eq-smart-doc-draft-v1';
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
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URLBASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p22_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

// SERVER-INDEPENDENCE AUDIT: every external host the whole run mentions is
// recorded. A real backend would appear and fail the run. Only well-known
// asset/CDN/currency hosts are allowed.
const KNOWN_EXTERNAL_HOSTS = new Set([
  'cdn.jsdelivr.net',        // decimal.js + html2pdf (History/Notes PDF export)
  'cdnjs.cloudflare.com',    // Font Awesome icons
  'api.exchangerate-api.com' // live currency rates (non-smart feature)
]);
const EXTERNAL_HOSTS = new Set();
const SMART_SERVICE_HOSTS = new Set();
const isSmartServiceHost = (h) => {
  const s = h.toLowerCase();
  return /supabase|firebase|cloud|backend|saaS|docsrv|\.app\.|online|sync|share|dropbox|drive\.google/i.test(s);
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8z8DwnwEPYMInOWwUAACaVAEbTM10zwAAAABJRU5ErkJggg==';
const pngPath = path.join(os.tmpdir(), 'part22_image.png');
fs.writeFileSync(pngPath, Buffer.from(PNG_B64, 'base64'));
async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    let host = '';
    try { host = new URL(url).host; } catch (e) {}
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) {
      // Record requests that escape to the internet. Known asset/CDN/currency
      // hosts are tracked but never treated as a Smart Documents backend.
      if (host && !KNOWN_EXTERNAL_HOSTS.has(host)) {
        EXTERNAL_HOSTS.add(host);
        if (isSmartServiceHost(host)) SMART_SERVICE_HOSTS.add(host);
      }
      req.abort();
    } else req.continue();
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true });
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(URLBASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
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
async function openSmartHome(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}
async function openBlank(page, locale) {
  await openSmartHome(page, locale);
  await page.evaluate((k) => localStorage.removeItem(k), DRAFT_KEY);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
const st = (page) => page.evaluate(() => window.__smartBlank.getState());
const pagesDesc = (page) => page.evaluate(() => window.__smartPages.describe());
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const dialogs = (page) => page.evaluate(() => window.__dialogs);
async function seedText(page, txt) {
  await page.evaluate((t) => {
    window.__smartBlank.insertElement('text');
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) || holder.lastElementChild;
    const surface = cv.querySelector('.smart-document-content');
    const p = surface.querySelector('.smart-doc-text-block:last-of-type');
    if (p) p.textContent = t;
  }, txt);
  await sleep(180);
}
async function typeAndEdit(page) {
  await seedText(page, '');
  await page.evaluate(() => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas')).find((c) => !c.classList.contains('smart-page-hidden'));
    const b = cv.querySelector('.smart-doc-text-block:last-of-type');
    b.focus();
    const sel = window.getSelection(); const rg = document.createRange();
    rg.selectNodeContents(b); sel.removeAllRanges(); sel.addRange(rg);
    document.execCommand('delete');
  });
  await page.keyboard.type('Local first draft');
  await sleep(120);
  await page.keyboard.down('Shift');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.up('Shift');
  await page.keyboard.type('document');
  await sleep(120);
  return page.evaluate(() => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas')).find((c) => !c.classList.contains('smart-page-hidden'));
    const b = cv.querySelector('.smart-doc-text-block:last-of-type');
    return b ? b.textContent.trim() : '';
  });
}
async function createTable(page, rows, cols) {
  await page.evaluate(() =>
    document.querySelector('[data-toolbar="blank-doc"] button[data-tool="table"]').click());
  await sleep(250);
  await page.evaluate(([r, c]) => {
    const ri = document.getElementById('smartTableRows');
    const ci = document.getElementById('smartTableCols');
    ri.value = String(r); ci.value = String(c);
    ri.dispatchEvent(new Event('input', { bubbles: true }));
    ci.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-table-create="confirm"]').click();
  }, [rows, cols]);
  await sleep(300);
}
async function tableCmd(page, cmd) {
  await page.evaluate((c) =>
    document.querySelector(`#smartTableToolbar [data-tablecmd="${c}"]`).click(), cmd);
  await sleep(180);
}
async function typeInCell(page, r, c, text) {
  await page.evaluate(([r2, c2]) => {
    const t = document.querySelector('.smart-doc-table[data-smart-element="table"]');
    const td = t.rows[r2].cells[c2];
    td.focus();
    const sel = window.getSelection(); const rg = document.createRange();
    rg.selectNodeContents(td); sel.removeAllRanges(); sel.addRange(rg);
    document.execCommand('delete');
  }, [r, c]);
  await page.keyboard.type(text);
  await sleep(60);
}
async function signDraw(page) {
  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="signature"]').click());
  await sleep(200);
  await page.evaluate(() => document.querySelector('#smartSignatureMenu .smart-sig-item[data-sig-method="draw"]').click());
  await sleep(250);
  const box = await page.evaluate(() => {
    const r = document.getElementById('signatureCanvas').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.5);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box.x + box.w * (0.2 + 0.6 * i / 8), box.y + box.h * (0.5 + 0.25 * Math.sin(i)));
    await sleep(15);
  }
  await page.mouse.up();
  await sleep(120);
  await page.evaluate(() => document.querySelector('#sigStageDraw .smart-sig-insert').click());
  await sleep(300);
}
try {
// ============================================================
// A) Boot with ALL external servers unreachable
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  check('1) No reachable server: navigator.onLine=false inside the page',
    await page.evaluate(() => navigator.onLine === false));
  check('2) App loads with NO server-side Smart Documents service (calculator visible)',
    await page.evaluate(() => !!document.getElementById('primaryDisplay')));
  check('3) No JS errors on server-independent boot', errs.length === 0, errs.join(' | ').slice(0, 160));
  const ov0 = await overflow(page);
  check('4) No horizontal overflow on boot', ov0 <= 1, 'ov=' + ov0);
  await page.close();
}

// ============================================================
// B) V1 authoring — every fundamental is LOCAL (zero backend)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  let s = await st(page);
  check('5) Smart Documents opens with no backend (editor visible)', s.editorVisible === true);
  check('6) Creating a document works (A4 surface ready)',
    s.pageSurfaces >= 1 && s.pageSize === 'A4', JSON.stringify({ p: s.pageSurfaces, sz: s.pageSize }));

  const typed = await typeAndEdit(page);
  check('7) Editing text works (typing + replace selection)', /Local first documents?/.test(typed), JSON.stringify(typed));

  await page.evaluate(() => document.querySelector('[data-toolbar="blank-doc"] button[data-tool="add"]').click());
  await sleep(220);
  await page.evaluate(() => document.querySelector('#smartAddMenu .smart-add-item[data-add="heading"]').click());
  await sleep(250);
  await page.evaluate(() => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas')).find((c) => !c.classList.contains('smart-page-hidden'));
    const h = cv.querySelector('.smart-doc-heading:last-of-type');
    if (h) h.textContent = 'Local Heading';
  });
  await sleep(120);
  const d0 = await pagesDesc(page);
  check('8) Headings work (no backend)', d0[0].headings.indexOf('Local Heading') !== -1, JSON.stringify(d0[0].headings));

  await createTable(page, 3, 3);
  await typeInCell(page, 0, 0, 'CellA');
  let ts = await page.evaluate(() => window.__smartTable.getState());
  check('9) Tables work (create 3×3)', ts.rows === 3 && ts.cols === 3, JSON.stringify({ r: ts.rows, c: ts.cols }));
  check('10) Table cell editable', (await page.evaluate(() => window.__smartTable.cellText(0, 0))) === 'CellA');
  await tableCmd(page, 'add-row'); await tableCmd(page, 'add-col');
  ts = await page.evaluate(() => window.__smartTable.getState());
  check('11) Add row/column works (4×4)', ts.rows === 4 && ts.cols === 4, JSON.stringify({ r: ts.rows, c: ts.cols }));
  await tableCmd(page, 'del-row'); await tableCmd(page, 'del-col');
  ts = await page.evaluate(() => window.__smartTable.getState());
  check('12) Delete row/column works (3×3)', ts.rows === 3 && ts.cols === 3, JSON.stringify({ r: ts.rows, c: ts.cols }));

  let inp = await page.$('#smartAddImageInput');
  await inp.uploadFile(pngPath); await sleep(450);
  inp = await page.$('#smartAddLogoInput');
  await inp.uploadFile(pngPath); await sleep(450);
  const assets = await page.evaluate(() => ({
    img: !!document.querySelector('#smartBlankCanvasHolder .smart-doc-image-wrap'),
    logo: !!document.querySelector('#smartBlankCanvasHolder .smart-doc-logo-wrap img.smart-doc-logo')
  }));
  check('13) Images work (local file insert)', assets.img);
  check('14) Logo works (local file insert)', assets.logo);
await signDraw(page);
  const d1 = await pagesDesc(page);
  check('15) Signature works (draw → insert)', d1[0].signatures >= 1, JSON.stringify({ sig: d1[0].signatures }));
  const prot = await page.evaluate(() => window.__smartSignatureProtection.status());
  check('16) Signature protection works (signed/unsigned)', prot === 'signed' || prot === 'unsigned', prot);

  await page.evaluate(() => window.__smartPageDesign.apply('classic')); await sleep(280);
  const d2 = await pagesDesc(page);
  check('17) Page design applies', d2.every((p) => p.design.indexOf('classic') !== -1), JSON.stringify(d2.map((p) => p.design)));

  const nBefore = (await pagesDesc(page)).length;
  await page.evaluate(() => window.__smartPages.add()); await sleep(230);
  await seedText(page, 'Second local page');
  const afterAdd = await pagesDesc(page);
  await page.evaluate(() => window.__smartPages.copy()); await sleep(260);
  let dd = await pagesDesc(page);
  check('18) Page add works (+1 page)', afterAdd.length === nBefore + 1, `before=${nBefore} after=${afterAdd.length}`);
  check('19) Page copy works (+1 page)', dd.length === nBefore + 2, `now=${dd.length}`);
  await page.evaluate(() => window.__smartPages.move(-1)); await sleep(260);
  dd = await pagesDesc(page);
  check('20) Page reorder works (content bound to its page)',
    dd.some((p) => p.text.indexOf('Second local page') !== -1), JSON.stringify(dd.map((x) => x.text)));
  await page.evaluate(() => document.getElementById('smartPageDeleteBtn').click()); await sleep(260);
  dd = await pagesDesc(page);
  check('21) Page delete works (-1 page)', dd.length === nBefore + 1, `now=${dd.length}`);

  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click());
  await sleep(400);
  // PART 23 — the draft now persists in IndexedDB (not one big localStorage value).
  let draft = await page.evaluate(() => window.__smartStorage.idbRead());
  if (!draft || !Array.isArray(draft.pages)) draft = await page.evaluate(() => window.__smartSave.readDraft());
  check('22) Local save/resume: draft persisted on-device', !!draft && draft.pages.length === nBefore + 1,
    JSON.stringify({ n: draft && draft.pages.length }));
  check('23) Local save holds the local content', JSON.stringify(draft.pages).includes('Local first document'));
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(400);
  await openSmartHome(page, 'en');
  const bannerVisible = await page.evaluate(() => !document.getElementById('smartDraftBanner').hidden);
  check('24) Draft banner visible locally after saving', bannerVisible);
  await page.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
  await sleep(600);
  const resumed = await pagesDesc(page);
  const stAfterResume = await st(page);
  check('25) Resume draft works (server-independent)',
    stAfterResume.editorVisible === true && JSON.stringify(resumed).includes('Local first document'),
    JSON.stringify(resumed.map((p) => p.text)));
  check('26) No JS errors through the whole authoring flow', errs.length === 0, errs.join(' | ').slice(0, 160));
  const dgB = await dialogs(page);
  check('27) No alert/confirm/prompt (native dialogs banned)',
    dgB.alert === 0 && dgB.confirm === 0 && dgB.prompt === 0, JSON.stringify(dgB));
  const ovB = await overflow(page);
  check('28) No horizontal overflow after full authoring', ovB <= 1, 'ov=' + ovB);
  await page.close();
}
// ============================================================
// C) Clean boundary for online-only features — they report a clear message
// and never block the local editor (currency is the existing online feature).
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  // Clean boundary for online-only features: the existing online feature here is
  // live currency. Trigger the offline path through the REAL UI and assert the
  // translated reporting boundary fires (clear, no freeze) and never blocks the
  // local editor. This is the exact seam future OCR/cloud/sync/sharing use.
  const toastText = (page) => page.evaluate(() => (document.getElementById('toast') || { textContent: '' }).textContent.trim());
  await setLang(page, 'en');
  await page.evaluate(() => document.getElementById('currencyMenuButton').click());
  await sleep(250);
  await page.evaluate(() => document.querySelector('#currencyMenuPopover .currency-popover-item[data-action="prices"]').click());
  await sleep(500);
  const convOpen = await page.evaluate(() => {
    const m = document.getElementById('currencyConverterModal');
    return m ? m.classList.contains('show') : false;
  });
  check('29) Online currency feature opens its local UI (not blocked by boundary)', convOpen);
  // Offline refresh → clear localized "requires an internet connection" message.
  await page.evaluate(() => document.getElementById('refreshRatesButton').click());
  let msg = '';
  for (let i = 0; i < 40; i++) { await sleep(100); msg = await toastText(page); if (/internet connection/i.test(msg)) break; }
  check('30) Online boundary reports clearly: requires an internet connection', /internet connection/i.test(msg), msg);
  // The boundary never breaks the local editor — Smart Documents still opens.
  await openBlank(page, 'en');
  check('31) Online boundary never blocks the local editor (editor visible)',
    (await st(page)).editorVisible === true);
  check('32) No JS errors on the online-boundary path', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// D) Responsive + RTL/LTR + no English leakage (1280/768/390/360)
// ============================================================
{
  const vps = [
    { name: 'Desktop 1280', width: 1280, height: 800 },
    { name: 'Tablet 768', width: 768, height: 1024 },
    { name: 'iPhone 390', width: 390, height: 844 },
    { name: 'Android 360', width: 360, height: 800 }
  ];
  let n = 33;
  for (const vp of vps) {
    {
      const { page, errs } = await newPage({ width: vp.width, height: vp.height });
      await openBlank(page, 'en');
      await seedText(page, 'vp');
      const dirOk = await page.evaluate(() => document.documentElement.getAttribute('dir') !== 'rtl');
      const ov = await overflow(page);
      check(`${n}) ${vp.name} EN: LTR + no horizontal overflow`, dirOk && ov <= 1, `dir ok=${dirOk} ov=${ov}`);
      check(`${n}.b) ${vp.name} EN: no JS errors`, errs.length === 0, errs.join(' | ').slice(0, 120));
      await page.close();
      n++;
    }
    {
      const { page, errs } = await newPage({ width: vp.width, height: vp.height });
      await openBlank(page, 'ar');
      const rtl = await page.evaluate(() => ({
        docDir: document.documentElement.getAttribute('dir'),
        homeHeading: (document.querySelector('.smart-docs-heading') || {}).textContent || ''
      }));
      const ov = await overflow(page);
      const headingAr = /[\u0600-\u06FF]/.test(rtl.homeHeading);
      check(`${n}) ${vp.name} AR: RTL applied`, rtl.docDir === 'rtl', rtl.docDir);
      check(`${n}.b) ${vp.name} AR: labels Arabic (no English leakage)`, headingAr, rtl.homeHeading);
      check(`${n}.c) ${vp.name} AR: no horizontal overflow`, ov <= 1, 'ov=' + ov);
      check(`${n}.d) ${vp.name} AR: no JS errors`, errs.length === 0, errs.join(' | ').slice(0, 120));
      await page.close();
      n++;
    }
  }
}
// ============================================================
// E) Regression safety — other EQ local features unaffected
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="7"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="+"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="3"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
  await sleep(250);
  const calc = await page.evaluate(() => document.getElementById('primaryDisplay').textContent.trim());
  check('64) Calculator works (7+3=10)', calc === '10', calc);
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(500);
  check('65) Notes opens (localStorage-based)',
    await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));
  const dg = await dialogs(page);
  check('66) No alert/confirm/prompt in regression run', dg.alert === 0 && dg.confirm === 0 && dg.prompt === 0, JSON.stringify(dg));
  check('67) No JS errors in regression run', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
// F) Final server-independence audit — no request ever touched a backend
// ============================================================
{
  const unexpected = Array.from(EXTERNAL_HOSTS).filter((h) => !KNOWN_EXTERNAL_HOSTS.has(h));
  check('68) Zero external hosts outside the known asset set', unexpected.length === 0,
    unexpected.join(', ') || Array.from(EXTERNAL_HOSTS).join(',') || '(no external hosts)');
  check('69) No request ever targeted a server-side Smart Documents service',
    SMART_SERVICE_HOSTS.size === 0, Array.from(SMART_SERVICE_HOSTS).join(','));
}

} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
fs.appendFileSync(OUT, `\nTOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}\n`);
console.log(`\nPART 22 RESULT: TOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}`);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + (f.detail ? ' -> ' + f.detail : '')));
}
process.exit(failed.length ? 1 : 0);