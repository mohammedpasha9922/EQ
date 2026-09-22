// PART 32 — SMART DOCUMENTS: DRAFTS LIST / RESUME & DELETE (مسوداتك)
// Behavioral test in real Chrome via Puppeteer. Covers: draft creation,
// "Your drafts" list (name + last-modified), resume in the SAME editor,
// protected delete (confirm dialog), multiple independent drafts,
// empty state, RTL/LTR, responsive 1280..360, no alert/confirm/prompt,
// no JS errors, no horizontal overflow.
// Run:  node tests/part32_smart_drafts.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8332;
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
const URLBASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p32_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

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
  await page.goto(URLBASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
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
async function openSmartHome(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}
// Clean local draft state (IndexedDB + metadata) for deterministic sections.
async function cleanDrafts(page) {
  await page.evaluate(async () => {
    try {
      localStorage.removeItem('eq-smart-doc-meta-v1');
      localStorage.removeItem('eq-smart-doc-backend-v1');
      localStorage.removeItem('eq-smart-doc-draft-v1');
      const list = await window.__smartDrafts.list();
      for (const en of list.list) await window.__smartDrafts.remove(en.key);
      const rec = await new Promise((res) => {
        const op = indexedDB.open('eq_smart_docs_db', 1);
        op.onsuccess = () => res(op.result);
        op.onerror = () => res(null);
      });
      if (rec) {
        await new Promise((res) => {
          try {
            const tx = rec.transaction('documents', 'readwrite');
            tx.objectStore('documents').clear();
            tx.oncomplete = () => res();
            tx.onerror = () => res();
          } catch (e) { res(); }
        });
        rec.close();
      }
    } catch (e) {}
  });
  await sleep(250);
}
// CHUNK2
async function seedText(page, txt) {
  await page.evaluate((t) => {
    window.__smartBlank.insertElement('text');
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) ||
      Array.from(holder.querySelectorAll('.smart-blank-canvas')).pop();
    const surface = cv.querySelector('.smart-document-content');
    const p = surface.querySelector('.smart-doc-text-block:last-child');
    if (p) p.textContent = t;
  }, txt);
  await sleep(250);
}
// Create + save a named draft and go back to Smart Documents home.
// Does NOT clean existing drafts — call cleanDrafts() first when needed.
async function makeDraft(page, locale, name, body, pages = 1) {
  await openSmartHome(page, locale);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
  await seedText(page, body);
  for (let i = 1; i < pages; i++) {
    await page.evaluate(() => window.__smartPages.add());
    await sleep(300);
    await seedText(page, body + ' P' + (i + 1));
  }
  await page.evaluate((n) => window.__smartDocName.set(n), name);
  await sleep(150);
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click());
  await sleep(500);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(500);
}
const listState = (page) => page.evaluate(() => ({  sectionHidden: document.getElementById('smartDraftsSection').hidden,
  emptyHidden: document.getElementById('smartDraftsEmpty').hidden,
  items: Array.from(document.querySelectorAll('#smartDraftsList .smart-draft-item')).map((r) => ({
    key: r.getAttribute('data-key'),
    name: r.querySelector('.smart-draft-item-name').textContent.trim(),
    time: r.querySelector('.smart-draft-item-time').textContent.trim()
  })),
  heading: document.querySelector('.smart-drafts-heading').textContent.trim(),
  overflow: document.documentElement.scrollWidth - window.innerWidth
}));
// Poll until cond(st) holds or timeout — async UI updates must settle.
async function waitForList(page, cond, timeout = 6000) {
  const t0 = Date.now();
  let st = await listState(page);
  while (!cond(st) && Date.now() - t0 < timeout) {
    await sleep(200);
    st = await listState(page);
  }
  return st;
}

// ============================================================
// A) Draft creation + list appears
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, 'en');
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Rent contract Mohamed', 'PART32 body A');
  const st = await listState(page);
  check('1) "Your drafts" section is visible after saving + leaving', st.sectionHidden === false, JSON.stringify(st.sectionHidden));
  check('2) Section heading shown', st.heading.length > 0, st.heading);
  check('3) Draft listed with its PART 24 name', st.items.length >= 1 && st.items.some((i) => i.name === 'Rent contract Mohamed'), JSON.stringify(st.items.map((i) => i.name)));
  check('4) Last-modified time shown (friendly)', st.items.length > 0 && st.items[0].time.length > 0, st.items[0] && st.items[0].time);
  check('5) No JS errors (creation + list)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// B) Resume restores content, pages and name in the SAME editor
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, 'en');
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Two pager', 'RESUME PAGE ONE', 2);
  let st = await listState(page);
  check('6) Saved two-page draft listed once (no duplicates)', st.items.filter((i) => i.name === 'Two pager').length === 1, JSON.stringify(st.items.map((i) => i.name)));
  await page.evaluate(() => document.querySelector('#smartDraftsList .smart-draft-item-resume').click());
  await sleep(700);
  const r = await page.evaluate(() => {
    const surfaces = Array.from(document.querySelectorAll('#smartBlankCanvasHolder .smart-document-content'));
    return {
      editorVisible: document.getElementById('smartBlankView').classList.contains('blank-visible'),
      pages: surfaces.length,
      p1: surfaces[0] ? surfaces[0].textContent.includes('RESUME PAGE ONE') : false,
      p2: surfaces[1] ? surfaces[1].textContent.includes('RESUME PAGE ONE P2') : false,
      nameShown: document.getElementById('smartBlankDocTitle').textContent.trim(),
      dirty: window.__smartSave.getState().dirty
    };
  });
  check('7) Resume opens the existing editor', r.editorVisible === true);
  check('8) Resume restores BOTH pages in order', r.pages === 2 && r.p1 && r.p2, JSON.stringify({ pc: r.pages, p1: r.p1, p2: r.p2 }));
  check('9) Resume restores the document name', r.nameShown === 'Two pager', r.nameShown);
  check('10) Resumed document starts CLEAN (no unintended dirty)', r.dirty === false);
  check('B) No JS errors (resume flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// C) Protected delete — cancel keeps, confirm deletes ONLY that draft
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, 'en');
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Keep me', 'KEEP BODY');
  await makeDraft(page, 'en', 'Delete me', 'DELETE BODY');
  let st = await listState(page);
  check('11) Both drafts listed separately', st.items.length === 2 && st.items.some((i) => i.name === 'Keep me') && st.items.some((i) => i.name === 'Delete me'), JSON.stringify(st.items.map((i) => i.name)));
  await page.evaluate(() => document.querySelector('#smartDraftsList .smart-draft-item-delete').click());
  await sleep(350);
  check('12) Delete asks for confirmation first (no instant delete)', await page.evaluate(() => window.__smartDrafts.deleteVisible()) === true);
  check('13) No native confirm() used', (await page.evaluate(() => window.__dialogs.confirm)) === 0);
  await page.evaluate(() => document.getElementById('smartDraftDelCancelBtn').click());
  await sleep(350);
  st = await listState(page);
  check('14) Cancel keeps BOTH drafts', st.items.length === 2, JSON.stringify(st.items.length));
  await page.evaluate(() => document.querySelector('#smartDraftsList .smart-draft-item-delete').click());
  await sleep(300);
  await page.evaluate(() => document.getElementById('smartDraftDelConfirmBtn').click());
  st = await waitForList(page, (s) => s.items.length === 1);
  check('15) Confirmed draft removed from the list immediately', st.items.length === 1 && st.items[0].name === 'Keep me', JSON.stringify(st.items.map((i) => i.name)));
  const idbKeys = await page.evaluate(async () => (await window.__smartDrafts.list()).list.map((e) => e.key));
  check('16) Other draft untouched in IndexedDB', idbKeys.length === 1, JSON.stringify(idbKeys));
  check('17) List updated WITHOUT page reload', (await page.evaluate(() => performance.getEntriesByType('navigation').length)) === 1);
  check('C) No JS errors (delete flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// D) Multiple drafts — separate entries, correct resume target
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, 'en');
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Alpha doc', 'ALPHA BODY UNIQUE');
  await makeDraft(page, 'ar', 'عقد إيجار محمد', 'نص عربي فريد');
  const st = await listState(page);
  check('18) Arabic-named draft shows its real name (not "New Document")', st.items.some((i) => i.name === 'عقد إيجار محمد'), JSON.stringify(st.items.map((i) => i.name)));
  check('19) Two separate draft entries', st.items.length === 2, JSON.stringify(st.items.length));
  const okOpen = await page.evaluate(async () => {
    const rows = Array.from(document.querySelectorAll('#smartDraftsList .smart-draft-item'));
    const row = rows.find((r) => r.querySelector('.smart-draft-item-name').textContent.trim() === 'Alpha doc');
    if (!row) return false;
    row.querySelector('.smart-draft-item-resume').click();
    await new Promise((res) => setTimeout(res, 700));
    return true;
  });
  const r = await page.evaluate(() => ({
    name: window.__smartDocName.get(),
    body: document.querySelector('#smartBlankCanvasHolder .smart-document-content').textContent.includes('ALPHA BODY UNIQUE')
  }));
  check('20) Resume opens the CORRECT draft', okOpen && r.name === 'Alpha doc' && r.body, JSON.stringify(r));
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(500);
  await page.evaluate(async () => {
    const rows = Array.from(document.querySelectorAll('#smartDraftsList .smart-draft-item'));
    const row = rows.find((x) => x.querySelector('.smart-draft-item-name').textContent.trim() === 'Alpha doc');
    row.querySelector('.smart-draft-item-delete').click();
    await new Promise((res) => setTimeout(res, 300));
    document.getElementById('smartDraftDelConfirmBtn').click();
  });
  const st2 = await waitForList(page, (s) => s.items.length === 1 && s.items[0].name === 'عقد إيجار محمد');
  check('21) After deleting Alpha, Arabic draft remains intact', st2.items.length === 1 && st2.items[0].name === 'عقد إيجار محمد', JSON.stringify(st2.items.map((i) => i.name)));
  check('D) No JS errors (multiple drafts)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// E) Deleting the CURRENT/latest draft clears it completely (§7)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, 'en');
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Latest one', 'LATEST BODY');
  await page.evaluate(() => document.querySelector('#smartDraftsList .smart-draft-item-delete').click());
  await sleep(300);
  await page.evaluate(() => document.getElementById('smartDraftDelConfirmBtn').click());
  await waitForList(page, (s) => s.items.length === 0);
  const gone = await page.evaluate(async () => {
    const list = await window.__smartDrafts.list();
    return {
      n: list.list.length,
      mirror: !localStorage.getItem('eq-smart-doc-meta-v1'),
      bannerHidden: document.getElementById('smartDraftBanner').hidden
    };
  });
  check('22) Deleted latest draft never reappears', gone.n === 0 && gone.mirror && gone.bannerHidden, JSON.stringify(gone));
  check('E) No JS errors (current-draft delete)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// F) Empty state + blank-document path reuses existing entry point
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, 'en');
  await cleanDrafts(page);
  await page.evaluate(() => window.__smartDrafts.refresh()); await sleep(500);
  let st = await listState(page);
  check('23) Empty state visible when no drafts exist', st.emptyHidden === false, JSON.stringify(st.emptyHidden));
  const emptyText = await page.evaluate(() => document.querySelector('.smart-drafts-empty-text').textContent.trim());
  check('24) Empty state text is localized', emptyText.length > 3, emptyText);
  await page.evaluate(() => document.getElementById('smartDraftsNewBtn').click());
  await sleep(500);
  const opened = await page.evaluate(() => document.getElementById('smartBlankView').classList.contains('blank-visible'));
  check('25) Empty-state button opens a NEW blank document (existing path)', opened === true);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(500);
  st = await listState(page);
  check('26) Unsaved new document does NOT create a phantom draft entry', st.items.length === 0, JSON.stringify(st.items.length));
  check('F) No JS errors (empty state)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// G) RTL / LTR — Arabic + English
// ============================================================
for (const [locale, expectRTL, headingRe, resumeRe] of [
  ['ar', true, /مسوداتك/, /متابعة التحرير/],
  ['en', false, /Your drafts/, /Resume editing/i]
]) {
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, locale);
  await cleanDrafts(page);
  await makeDraft(page, locale, locale === 'ar' ? 'مستند تجريبي' : 'Sample doc', 'BODY RTL TEST');
  const r = await page.evaluate(() => {
    const sec = document.getElementById('smartDraftsSection');
    const btn = document.querySelector('#smartDraftsList .smart-draft-item-resume');
    return {
      dir: getComputedStyle(sec).direction,
      heading: document.querySelector('.smart-drafts-heading').textContent.trim(),
      resume: btn.textContent.trim(),
      overflow: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  check(`27) [${locale}] Section direction is ${expectRTL ? 'RTL' : 'LTR'}`, (r.dir === 'rtl') === expectRTL, r.dir);
  check(`28) [${locale}] Heading localized`, headingRe.test(r.heading), r.heading);
  check(`29) [${locale}] Resume button localized`, resumeRe.test(r.resume), r.resume);
  check(`30) [${locale}] No horizontal overflow at 1280`, r.overflow <= 0, String(r.overflow));
  check(`G-${locale}) No JS errors`, errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// H) Responsive — 1280 / 768 / 430 / 390 / 360 (Arabic RTL, long name)
// ============================================================
{
  let allOk = true; const details = [];
  for (const w of [1280, 768, 430, 390, 360]) {
    const { page } = await newPage({ width: w, height: 800 });
    await openSmartHome(page, 'ar');
    await cleanDrafts(page);
    await makeDraft(page, 'ar', 'عقد طويل جداً للاختبار على الشاشات الصغيرة جداً 12345', 'نص');
    await page.evaluate(() => window.__smartDrafts.refresh()); await sleep(400);
    const st = await listState(page);
    const btnBox = await page.evaluate(() => {
      const b = document.querySelector('#smartDraftsList .smart-draft-item-resume');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { h: r.height, inView: r.left >= 0 && r.right <= window.innerWidth + 1 };
    });
    const ok = st.sectionHidden === false && st.items.length === 1 && st.overflow <= 0 &&
      btnBox && btnBox.h >= 30 && btnBox.inView;
    allOk = allOk && ok;
    details.push(`${w}:${ok ? 'ok' : 'FAIL'} ov=${st.overflow} btn=${btnBox ? Math.round(btnBox.h) : 'x'}px`);
    await page.close();
  }
  check('31) Responsive 1280/768/430/390/360: no overflow, usable buttons, long name safe', allOk, details.join(' | '));
}

// ============================================================
// I) Stability — dialogs & errors across flows
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openSmartHome(page, 'en');
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Stability doc', 'STABILITY BODY');
  await page.evaluate(() => document.querySelector('#smartDraftsList .smart-draft-item-resume').click());
  await sleep(700);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(500);
  const d = await page.evaluate(() => window.__dialogs);
  check('32) alert/confirm/prompt count = 0 across flows', d.alert === 0 && d.confirm === 0 && d.prompt === 0, JSON.stringify(d));
  check('33) No JS errors (stability sweep)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

await browser.close();
server.close();
const fails = results.filter((r) => !r.ok).length;
fs.appendFileSync(OUT, `DONE ${results.length - fails}/${results.length} PASS\n`);
console.log(`DONE ${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);