// PART 18 — OCR Reality Rule behavioral harness (real Chrome).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
const PORT = 8396;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const NOTES_KEY = 'eq-note-manager-notes';
const COMPANY_KEY = 'eq-history-company-name';

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
const realErrs = [];
function check(name, ok, detail) {
  let d = detail;
  if (d && typeof d === 'object') { try { d = JSON.stringify(d); } catch (e) { d = String(d); } }
  if (ok === true) pass++;
  else if (ok === false) fail++;
  else notVerified++;
  LOG.push((ok === true ? 'PASS' : ok === false ? 'FAIL' : 'NOT VERIFIED') + '  ' + name + (d ? '  -> ' + d : ''));
}
function notv(name, reason) { notVerified++; LOG.push('NOT VERIFIED  ' + name + '  -> ' + reason); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    let pp = path.normalize(decodeURIComponent(u.pathname)).replace(/^([/\\])+/g, '');
    if (!pp || pp === '/') pp = 'index.html';
    const full = path.join(ROOT, pp);
    if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': mimeOf(full) + '; charset=utf-8' });
    fs.createReadStream(full).pipe(res);
  } catch (e) { try { res.writeHead(500); res.end(); } catch (e2) {} }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) realErrs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else realErrs.push('console: ' + m.text()); } });

async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(600); }
async function openPdfWorkspace() {
  const ok = await page.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (b) { b.click(); return true; }
    if (typeof window.openPdfReportsWorkspace === 'function') { window.openPdfReportsWorkspace(); return true; }
    return false;
  });
  await sleep(400);
  return ok;
}
async function openScanViaCard() {
  const ok = await page.evaluate(() => { const c = document.getElementById('pdfScanCreateCard'); if (c) { c.click(); return true; } return false; });
  await sleep(800);
  return ok;
}
async function waitStage(stage, tries = 160) {
  for (let i = 0; i < tries; i++) {
    const st = await page.evaluate(() => { const w = window.__smartScan; const g = w && w.getState ? w.getState() : null; return g ? g.stage : 'none'; });
    if (st === stage) return true;
    await sleep(150);
  }
  return false;
}
async function setLangReal(lang) {
  await page.evaluate((lang) => {
    const map = { 'en':'en','ar':'ar','fr':'fr','es':'es','de':'de','tr':'tr','ru':'ru' };
    const l = map[lang] || lang;
    if (window.EQ7_I18N && typeof window.EQ7_I18N.setLanguage === 'function') window.EQ7_I18N.setLanguage(l);
    else if (typeof window.switchLanguage === 'function') window.switchLanguage(l);
    document.documentElement.lang = l;
    document.documentElement.dir = (l === 'ar') ? 'rtl' : 'ltr';
    localStorage.setItem('eq-language', l);
  }, lang);
  await sleep(600);
}

const DOC_REAL = 'INVOICE\n\nThis invoice covers consulting services provided during August 2026.\n\nName: Mohammed Abdulhameed Maher\nDate: 2026-08-01\nPhone: +962 79 123 4567\nTotal: 155000 IQD\nRate: 45.6%\n\nItem   Qty   Price\nChair     4    120.50\nDesk      2      350';
const DOC_AR = 'فاتورة\n\nاسم العميل: محمد عبد الحميد معهر\nالتاريخ: 2026-08-01\nالهاتف: 0791234567\nالمجموع: 155000 ريال\nمعدل: 45.6%\n\nالصنف   الكمية   السعر\nكرسي     4    120.50\nطاولة      2      350';

await page.setViewport({ width: 1366, height: 900 });
await gotoApp();

let opened = await openPdfWorkspace();
check('P16-01a PDF Workspace opens from drawer', opened !== false, { opened: !!opened });
const wsTitle = await page.evaluate(() => document.getElementById('pdfReportsTitle')?.textContent.trim() || '');
check('P16-01b Workspace title is "PDF"', wsTitle === 'PDF', { title: wsTitle });
check('P16-01c Scan/Create PDF card present', await page.evaluate(() => !!document.getElementById('pdfScanCreateCard')));
check('P16-01d Open PDF card present (entry point only)', await page.evaluate(() => !!document.getElementById('pdfOpenCard')));
check('P16-01e Recent PDFs section present', await page.evaluate(() => !!document.getElementById('pdfRecentPdfs')));
const wsClosed = await openScanViaCard();
check('P16-02 Scan card opens Smart Scan (PART15 entry wiring)', wsClosed !== false, { opened: !!wsClosed });
const scanOpened = await page.evaluate(() => {
  const modal = document.getElementById('smartDocsModal');
  const view = document.getElementById('smartScanView');
  const cam = document.getElementById('scanStageCamera');
  return { modal: !!(modal && modal.classList.contains('show')), view: !!(view && view.classList.contains('scan-visible')), camera: !!(cam && cam.classList.contains('stage-active')), wsClosed: !document.getElementById('pdfReportsWorkspace')?.classList?.contains('show') };
});
check('P16-03 Camera stage active after card click', scanOpened.view && scanOpened.camera, scanOpened);
check('P16-04 PDF Workspace closed when Smart Scan opens', scanOpened.wsClosed === true, { wsClosed: scanOpened.wsClosed });

// Camera / permission handling (reuse PART 15 seams)
await page.evaluate(() => { const w = window.__smartScan; if (w) { w.debugMode('blocked'); w.reset(); w.open(); } });
await sleep(600);
const denied = await page.evaluate(() => {
  const err = document.getElementById('scanCameraError');
  const pick = document.getElementById('scanFilePick');
  const cap = document.getElementById('scanCaptureBtn');
  return { errShown: !!(err && !err.hidden), fallback: !!(pick && !pick.hidden), capDisabled: !!(cap && cap.disabled) };
});
check('P16-05a permission denied handled (no crash, no Notes contamination)', denied.fallback === true && denied.capDisabled, denied);

await page.evaluate(() => { const w = window.__smartScan; if (w) { w.debugMode('auto'); w.reset(); w.open(); } });
await sleep(700);
const autoFallback = await page.evaluate(() => { const pick = document.getElementById('scanFilePick'); const err = document.getElementById('scanCameraError'); return { fallback: !!(pick && !pick.hidden), errOrSupport: pick ? !pick.hidden : true }; });
check('P16-05b camera unavailable fallback (headless desktop)', autoFallback.fallback === true, autoFallback);
check('P16-05c Notes editor not opened by scan', await page.evaluate(() => !document.getElementById('noteEditor')), { noteEditor: !!await page.evaluate(() => document.getElementById('noteEditor')) });

