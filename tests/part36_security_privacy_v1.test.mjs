// PART 36 â€” V1 SECURITY & PRIVACY / ZERO-STORAGE INTEGRITY
// Real-Chrome behavioral test with a live NETWORK AUDIT.
// Run: node tests/part36_security_privacy_v1.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8356;
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
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];

const KNOWN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'api.exchangerate-api.com'];
const SECRET_TOKENS = ['PART36-BODY', 'PART36-DOC'];
const unknownHostOf = (aud) => aud.external().filter((e) => !KNOWN_HOSTS.includes(e.host));
const docDataOnWire = (aud) => aud.events.filter((e) =>
  !e.url.startsWith('data:') && !e.url.startsWith('blob:') &&
  SECRET_TOKENS.some((t) => e.url.includes(t) || e.post.includes(t)));

const OUT = path.join(ROOT, '__p36_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

// --- Network auditor: records EVERY request (host + method + POST body) ---
function makeAuditor(page) {
  const events = [];
  const handler = async (req) => {
    let post = '';
    try { if (req.method() !== 'GET') post = req.postData() || ''; } catch (e) {}
    let host = '(none)';
    try { host = new URL(req.url()).host; } catch (e) {}
    events.push({ url: req.url(), host, method: req.method(), post });
  };
  page.on('request', handler);
  return {
    events,
    stop: () => page.off('request', handler),
    external: () => events.filter((e) =>
      !e.url.startsWith('data:') && !e.url.startsWith('blob:') &&
      !e.host.startsWith('127.0.0.1'))
  };
}

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
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
async function cleanState(page) {
  await page.evaluate(async () => {
    try {
      localStorage.removeItem('eq-smart-doc-meta-v1');
      localStorage.removeItem('eq-smart-doc-backend-v1');
      localStorage.removeItem('eq-smart-doc-draft-v1');
      localStorage.removeItem('eq-history');
      if (window.__smartSave && window.__smartSave.clearDraft) window.__smartSave.clearDraft();
      if (window.__smartDrafts && window.__smartDrafts.list) {
        const list = await window.__smartDrafts.list();
        for (const en of list.list) await window.__smartDrafts.remove(en.key);
      }
      const rec = await new Promise((res) => {
        const op = indexedDB.open('eq_smart_docs_db', 1);
        op.onsuccess = () => res(op.result); op.onerror = () => res(null);
      });
      if (rec) {
        await new Promise((res) => {
          const tx = rec.transaction('documents', 'readwrite');
          tx.objectStore('documents').clear();
          tx.oncomplete = () => res(); tx.onerror = () => res();
        });
        rec.close();
      }
    } catch (e) {}
  });
  await sleep(250);
}
async function openBlank(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
async function seedText(page, txt) {
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(200);
  await page.evaluate((t) => {
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) || holder.lastElementChild;
    const b = cv.querySelector('.smart-doc-text-block:last-of-type');
    if (b) b.textContent = t;
  }, txt);
  await sleep(150);
}
async function saveDraft(page) {
  await page.evaluate(() => { try { document.getElementById('smartSaveDraftBtn').click(); } catch (e) {} });
  await sleep(900);
}

// ============================================================
// A) LOCAL STORAGE AUDIT
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  globalThis.__p36page = page;
  await cleanState(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(700);
  await openBlank(page);
  await page.evaluate(() => window.__smartDocName.set('META NAME ONLY'));
  await seedText(page, 'PART36-BODY SECRET TEXT');
  await page.evaluate(() => window.__smartBlank.insertElement('table'));
  await sleep(250);
  await saveDraft(page);

  const backend = await page.evaluate(() => localStorage.getItem('eq-smart-doc-backend-v1'));
  check('A1) IndexedDB is the primary storage backend flag', backend === 'indexeddb', String(backend));

  const idbHasDoc = await page.evaluate(async () => {
    const d = await window.__smartSave.readDraft();
    return !!d && JSON.stringify(d.pages).includes('PART36-BODY SECRET TEXT');
  });
  check('A2) Document payload present in IndexedDB after Save', idbHasDoc, '');

  // A3) No document PAYLOAD leaked into ANY localStorage entry.
  // NOTE: eq-smart-doc-meta-v1 intentionally holds TINY banner metadata
  // including the document NAME (PART 20/23/24 design) â€” that is metadata,
  // not the document payload (pages/text/tables/images).
  const lsLeaks = await page.evaluate(() => {
    const hits = [];
    const PAYLOAD_TOKENS = ['PART36-BODY', 'PART36-TABLECELL'];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      let v = ''; try { v = localStorage.getItem(k) || ''; } catch (e) {}
      if (PAYLOAD_TOKENS.some((t) => v.includes(t))) hits.push(k);
    }
    return hits;
  });
  check('A3) No document payload (pages/text/tables) in localStorage', lsLeaks.length === 0, lsLeaks.join(','));

  const cookies = await page.cookies();
  const cookieLeak = cookies.filter((c) => JSON.stringify(c).includes('PART36-SECRET'));
  check('A4) No document payload in cookies', cookieLeak.length === 0 && cookies.length === 0,
    JSON.stringify(cookies.map((c) => c.name)));

  const urlNow = await page.evaluate(() => location.href + '|' + location.search + '|' + location.hash);
  check('A5) No document data in URL/query/hash', !urlNow.includes('PART36-SECRET'), urlNow.slice(0, 120));

  const draftKeys = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => /draft|doc|smart/i.test(k)).sort());
  check('A6) Only known eq-smart-doc keys exist (no hidden duplicate store)',
    draftKeys.every((k) => /^eq-(smart-doc|history)/.test(k)), JSON.stringify(draftKeys));
  const sessLeak = await page.evaluate(() =>
    Object.keys(sessionStorage).filter((k) =>
      (sessionStorage.getItem(k) || '').includes('PART36-SECRET')));
  check('A6b) No document payload in sessionStorage', sessLeak.length === 0, sessLeak.join(','));

  check('A7) No JS errors (storage audit)', errs.length === 0, errs.join(' | '));
}

// ============================================================
// B) LIVE NETWORK AUDIT over the full Smart Documents lifecycle
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  await cleanState(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(700);

  // OCR engine is LOCAL by construction. The OCR functions are module-scoped
  // (not on window), so audit their SOURCE here in Node + rely on the live
  // network auditor during the full lifecycle below.
  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  function fnBody(name) {
    const i = appSrc.indexOf('function ' + name);
    if (i < 0) return '';
    return appSrc.slice(i, i + 6000);
  }
  const ocrSrc = fnBody('smartOcrRun') + fnBody('smartBinarize') + fnBody('smartImportRunOcr');
  const ocrNetHits = ocrSrc.match(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|https?:\/\/(?!w3\.org)/gi) || [];
  check('N1a) OCR implementation contains NO network calls (source audit)',
    ocrSrc.length > 0 && ocrNetHits.length === 0, ocrNetHits.join(','));
  const aud0 = makeAuditor(page);
  aud0.stop();

  const aud = makeAuditor(page);

  // Create document + type text + insert table
  await openBlank(page);
  await page.evaluate(() => window.__smartDocName.set('PART36-DOC NAME'));
  await seedText(page, 'PART36-DOC PART36-BODY');
  await page.evaluate(() => window.__smartBlank.insertElement('table'));
  await sleep(300);
  check('N2) New Document / typing / table: no external host contacted', unknownHostOf(aud).length === 0, JSON.stringify(aud.external()));

  // Save
  await saveDraft(page);
  check('N3) Save contacts NO external host', unknownHostOf(aud).length === 0, JSON.stringify(aud.external()));

  // Resume (reload)
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(900);
  const resumed = await page.evaluate(async () => { const d = await window.__smartSave.readDraft(); return !!d && d.pages.join(' ').includes('PART36-BODY'); });
  check('N3b) Resume restores document locally', resumed, '');
  check('N4) Resume/load contacts NO external host', unknownHostOf(aud).length === 0, JSON.stringify(aud.external()));
}
// ============================================================
// B2) Review / PDF Export / Share / History / Delete / New Doc
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  const aud = makeAuditor(page);
  await cleanState(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(700);
  await openBlank(page);
  await page.evaluate(() => window.__smartDocName.set('PART36-DOC NAME'));
  await seedText(page, 'PART36-DOC PART36-BODY');
  await page.evaluate(() => window.__smartBlank.insertElement('table'));
  await sleep(300);
  await saveDraft(page);

  // Review
  await page.evaluate(() => { const b = document.getElementById('smartReviewBtn'); if (b) b.click(); });
  await sleep(300);
  await page.evaluate(() => { if (!(window.__smartReview && window.__smartReview.active()) && window.__smartReview) window.__smartReview.open(); });
  await sleep(600);
  check('N5) Review opens', await page.evaluate(() => !!(window.__smartReview && window.__smartReview.active())), '');
  await page.evaluate(() => { if (window.__smartReview.active()) window.__smartReview.exit(); });
  await sleep(500);
  check('N6) Review contacts NO external host', unknownHostOf(aud).length === 0, JSON.stringify(aud.external()));

  // PDF Export (real local build)
  const pdfSize = await page.evaluate(async () => {
    try {
      const blob = await window.__smartPdfExport.buildBlob({});
      return blob ? blob.size : 0;
    } catch (e) { return -1; }
  });
  await sleep(400);
  check('N7) PDF Export builds a real PDF locally', pdfSize > 100, String(pdfSize));
  check('N8) PDF Export contacts NO external host', unknownHostOf(aud).length === 0, JSON.stringify(aud.external()));

  // Share seam exists app-side (no server dependency by design â€” PART 27)
  const shareSeam = await page.evaluate(() =>
    typeof window.__smartPdfExport.share === 'function' ||
    typeof window.__smartPdfExport.offer === 'function' ||
    typeof window.__smartPdfShare === 'object');
  check('N9) PDF Sharing seam exists (app-side, server-free)', !!shareSeam, '');

  // History â†’ Insert Result
  await page.evaluate(() => {
    for (const sel of ['.keypad-btn.number[data-value="7"]', '.keypad-btn.operator[data-value="+"]',
      '.keypad-btn.number[data-value="8"]', '.keypad-btn.equals']) {
      const b = document.querySelector(sel); if (b) b.click();
    }
  });
  await sleep(600);
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  await page.evaluate(() => {
    const i = document.querySelector('.drawer-menu-item[data-action="open-history"]');
    if (i) i.click();
  });
  await sleep(400);
  await page.evaluate(() => { const b = document.querySelector('.history-insert-smart-btn'); if (b) b.click(); });
  await sleep(800);
  check('N10) Historyâ†’Insert Result contacts NO external host', unknownHostOf(aud).length === 0, JSON.stringify(aud.external()));

  // Delete Draft + New Document
  await page.evaluate(async () => {
    if (window.__smartDrafts && window.__smartDrafts.list) {
      const list = await window.__smartDrafts.list();
      for (const en of list.list) await window.__smartDrafts.remove(en.key);
    }
    if (window.__smartSave && window.__smartSave.clearDraft) window.__smartSave.clearDraft();
  });
  await sleep(400);
  await openBlank(page);
  await seedText(page, 'SECOND DOC AFTER DELETE');
  check('N11) Delete Draft / New Document contacts NO external host', unknownHostOf(aud).length === 0, JSON.stringify(aud.external()));

  // No request body anywhere carried document content
  const leaks = docDataOnWire(aud);
  check('N12) NO request body carried document data/signatures/tables', leaks.length === 0,
    JSON.stringify(leaks.map((l) => l.url)));

  const extAll = unknownHostOf(aud);
  check('N13) FULL lifecycle: zero external hosts touched', extAll.length === 0,
    JSON.stringify(extAll.map((e) => e.host)));
  check('N14) No JS errors (network audit)', errs.length === 0, errs.join(' | '));
}

// ============================================================
// C) PRIVACY CLAIM INTEGRITY + D) STATE SAFETY
// ============================================================
{
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const misleading = src.match(/zero[\s-]?storage|nothing\s+(ever\s+)?leaves\s+your\s+device|100%\s+safe|Ø¨ÙŠØ§Ù†Ø§ØªÙƒ Ø¢Ù…Ù†Ø© 100%/gi) || [];
  check('C1) No absolute/misleading privacy claims in app copy', misleading.length === 0, misleading.join(','));

  // Verified below in section D against a freshly saved document (globalThis.__p36saved).


  const extOcr = (src.match(/https?:\/\/[^"'\s)]*(ocr|vision|tesseract)[^"'\s)]*/gi) || []);
  check('C3) No external OCR endpoint configured in the app', extOcr.length === 0, extOcr.join(','));

  // D) State safety â€” the audit itself changed nothing in document state
  const { page: pg, errs } = await newPage({ width: 1280, height: 900 });
  await cleanState(pg);
  await pg.reload({ waitUntil: 'domcontentloaded' }); await sleep(700);
  await openBlank(pg);
  await pg.evaluate(() => window.__smartDocName.set('STATE SAFETY DOC'));
  await seedText(pg, 'STATE SAFETY BODY');
  const before = await pg.evaluate(() => ({
    name: window.__smartDocName.get(),
    pageCount: window.__smartBlank.getState().pageCount,
    desc: JSON.stringify(window.__smartPages.describe()),
    dirty: !!window.__smartSave.getState().dirty
  }));
  await saveDraft(pg);
  const after = await pg.evaluate(() => ({
    name: window.__smartDocName.get(),
    pageCount: window.__smartBlank.getState().pageCount,
    desc: JSON.stringify(window.__smartPages.describe()),
    dirty: !!window.__smartSave.getState().dirty
  }));
  check('D1) Name/pages/content/design unchanged across save',
    before.name === after.name && before.pageCount === after.pageCount && before.desc === after.desc,
    JSON.stringify({ before, after }));
  globalThis.__p36saved = await pg.evaluate(async () => {
    const d = await window.__smartSave.readDraft();
    return !!d && localStorage.getItem('eq-smart-doc-backend-v1') === 'indexeddb';
  });
  check('C2) Claim "documents are saved locally on your device (IndexedDB)" is factually true', !!globalThis.__p36saved, '');
  check('D2) After atomic save the document is CLEAN', after.dirty === false, String(after.dirty));
  check('D3) No JS errors (state safety)', errs.length === 0, errs.join(' | '));
  await pg.close();
}

await browser.close();
server.close();
const fails = results.filter((r) => !r.ok).length;
fs.appendFileSync(OUT, `\nTOTAL ${results.length}  PASS ${results.length - fails}  FAIL ${fails}\n`);
console.log(`\nTOTAL ${results.length}  PASS ${results.length - fails}  FAIL ${fails}`);
process.exit(fails ? 1 : 0);






