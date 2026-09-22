// Live verification (Chrome via puppeteer) — Smart Documents PDF workspace:
// the ONLY change is removal of the toolbar page-navigation control
// ("Page 1 of 2" label + Previous/Next arrows). Everything else must keep
// working exactly as before (import, continuous scroll, tools, no JS errors).
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e, buf) => {
    if (e) { console.log('  [404] ' + req.url); res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => srv.listen(0, r));
const url = 'http://127.0.0.1:' + srv.address().port + '/';

// Multi-page PDF (3 pages) built with the repo's own vendor pdf-lib build
// (same approach as tests/pdfv1_phase2_live.test.mjs).
const PDFMod = await import('../__pdfdiag/vendor/pdf-lib.min.js').catch(() => null);
const PDFLib = PDFMod ? (PDFMod.default && PDFMod.default.PDFDocument ? PDFMod.default : null) : null;
if (!PDFLib) { console.log('FATAL: pdf-lib vendor build unavailable'); process.exit(2); }
const doc = await PDFLib.PDFDocument.create();
for (let i = 0; i < 3; i++) doc.addPage([612, 792]);
const tmpPdf = path.join(root, 'tests', '_pagenav_regr.pdf');
fs.writeFileSync(tmpPdf, await doc.save());

let fails = 0, checks = 0;
function check(name, ok, d = '') { checks++; if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (d ? '  -> ' + String(d).slice(0, 220) : '')); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, hasTouch: true, isMobile: false });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'networkidle2' });
await sleep(500);

// --- Open Smart Documents (same flow as a real user) ---
await page.evaluate(() => {
  const b = document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]')
    || document.querySelector('[data-action="open-smart-docs"]');
  if (b) b.click(); else throw new Error('open-smart-docs button not found');
});
await sleep(450);
check('1) Smart Documents opens', await page.evaluate(() => document.getElementById('smartDocsModal').classList.contains('show')));

// --- Upload the PDF through the Smart Documents PDF workspace input ---
const input = await page.$('#smartPdfFileInput');
await input.uploadFile(tmpPdf);
await sleep(1800);
const wsState = await page.evaluate(() => ({
  ws: !document.getElementById('smartPdfWorkspace').hidden,
  empty: document.getElementById('smartPdfEmpty').hidden,
  toolbar: !!document.getElementById('smartPdfToolbar'),
  pages: document.querySelectorAll('#smartPdfPages .smart-pdf-page').length,
  canvas: document.querySelectorAll('#smartPdfPages canvas').length,
  total: (window.smartPdfState && window.smartPdfState.totalPages) || null,
  errHidden: document.getElementById('smartPdfError') ? document.getElementById('smartPdfError').hidden : null,
  errText: document.getElementById('smartPdfError') ? document.getElementById('smartPdfError').textContent : ''
}));
check('2) PDF opens in Smart Documents workspace (import works)', wsState.ws && wsState.empty && wsState.toolbar, JSON.stringify(wsState));
check('3) Continuous multi-page render shows pages', wsState.pages >= 3 || wsState.canvas >= 3, 'pages=' + wsState.pages + ' canvases=' + wsState.canvas);

// --- Page navigation control must be gone (the actual change) ---
const gone = await page.evaluate(() => ({
  pageCountEl: !!document.getElementById('smartPdfPageCount'),
  lblText: (document.getElementById('smartPdfPageCount') || {}).textContent || '',
  toolbarHtml: (document.getElementById('smartPdfToolbar') || {}).innerHTML || ''
}));
const navRemoved = !gone.pageCountEl
  || (/of\s*<\/span>/i.test(gone.toolbarHtml) === false && /^\s*$/.test(gone.lblText) && !/Page\s+\d+\s+of\s+\d+/i.test(gone.lblText));
check('4) No "Page N of M" indicator in Smart Documents toolbar (count label only shows total pages)', navRemoved, JSON.stringify(gone).slice(0, 180));
const arrows = await page.evaluate(() => {
  const tb = document.getElementById('smartPdfToolbar');
  if (!tb) return { found: true, n: -1 };
  const btns = Array.from(tb.querySelectorAll('button'));
  const nav = btns.filter((b) => /prev(ious)?\s*(overlay\s*)?page|next\s*(overlay\s*)?page/i.test(b.getAttribute('aria-label') || '') || b.id === 'smartPdfPrevPg' || b.id === 'smartPdfNextPg');
  return { found: nav.length > 0, n: nav.length };
});
check('5) No Previous/Next page arrows in Smart Documents toolbar', !arrows.found, 'nav buttons=' + arrows.n);

// __PART2__

// --- Smart Documents PDF toolbar still works ---
const tbState = await page.evaluate(() => {
  const tb = document.getElementById('smartPdfToolbar');
  const btns = tb ? Array.from(tb.querySelectorAll('button')).map((b) => b.id) : [];
  return { btns, count: btns.length };
});
check('7) Smart Documents toolbar still has its buttons (Back/View/Edit/Change another)', tbState.count >= 4 && tbState.btns.includes('smartPdfBackBtn') && tbState.btns.includes('smartPdfViewBtn') && tbState.btns.includes('smartPdfEditBtn') && tbState.btns.includes('smartPdfChangeBtn'), JSON.stringify(tbState.btns));

// Toggle Edit mode and back to View (PDF text editing flow entry)
await page.evaluate(() => document.getElementById('smartPdfEditBtn').click());
await sleep(400);
const editOn = await page.evaluate(() => ({
  editPressed: document.getElementById('smartPdfEditBtn').getAttribute('aria-pressed') === 'true',
  viewPressed: document.getElementById('smartPdfViewBtn').getAttribute('aria-pressed') === 'false'
}));
check('8) PDF Text Editing mode still activates', editOn.editPressed && editOn.viewPressed, JSON.stringify(editOn));
await page.evaluate(() => document.getElementById('smartPdfViewBtn').click());
await sleep(300);

// --- The separate pdfReportsWorkspace (the workspace opened from Smart Documents
// --- navigation): "Page 1 of 2" + Previous/Next arrows must be GONE, other buttons intact.
await page.evaluate(() => { const x = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (x) x.click(); });
await sleep(400);
const pagerGone = await page.evaluate(() => {
  const tools = document.getElementById('pdfV1Tools');
  const lbl = document.getElementById('pdfV1PgLabel');
  const prev = document.getElementById('pdfV1PrevPg');
  const next = document.getElementById('pdfV1NextPg');
  const txt = tools ? tools.textContent : '';
  return {
    tools: !!tools,
    lbl: !!lbl, prev: !!prev, next: !!next,
    pageOfText: /Page\s+\d+\s+of\s+\d+|صفحة\s+\d+\s+من\s+\d+/.test(txt),
    arrowChars: /‹|›/.test(txt)
  };
});
check('6) "Page 1 of 2" label removed from PDF workspace toolbar', pagerGone.tools && !pagerGone.lbl && !pagerGone.pageOfText, JSON.stringify(pagerGone));
check('7) Previous/Next page arrows removed from PDF workspace toolbar', !pagerGone.prev && !pagerGone.next && !pagerGone.arrowChars, JSON.stringify(pagerGone));
const other = await page.evaluate(() => {
  const ids = ['pdfV1CloseBtn', 'pdfV1StampBtn', 'pdfV1SigDrawBtn', 'pdfV1SigUploadBtn', 'pdfV1TextBtn', 'pdfV1DateBtn', 'pdfV1DelBtn', 'pdfV1ExportBtn'];
  return { open: document.getElementById('pdfReportsWorkspace').classList.contains('show'), missing: ids.filter((i) => !document.getElementById(i)) };
});
check('8) Other PDF toolbar buttons all intact', other.open && other.missing.length === 0, JSON.stringify(other.missing));
await page.evaluate(() => { const b = document.getElementById('pdfReportsBackBtn'); if (b) b.click(); });
await sleep(250);

// --- Calculator + Notes regressions (exact patterns from tests/part9_smart_toolbar_scroll.test.mjs) ---
await page.evaluate(() => { const b = document.querySelector('.keypad-btn[data-value="7"]'); if (b) b.click(); });
await sleep(150);
const calcDisp = await page.evaluate(() => (document.getElementById('primaryDisplay') || {}).textContent || '');
check('9) Calculator unaffected (keypad works)', calcDisp.includes('7'), 'display=' + calcDisp);

await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await sleep(450);
check('10) Notes unaffected (manager opens)', await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));

const errs2 = errs.filter((e) => !/favicon/i.test(e));
check('11) No JavaScript/console errors during the whole flow', errs2.length === 0, errs2.join(' | '));

await browser.close();
console.log(fails === 0 ? 'PAGE-NAV REMOVAL LIVE: ALL PASS (' + checks + ' checks)' : 'PAGE-NAV REMOVAL LIVE: FAILURES ' + fails + '/' + checks);
try { fs.unlinkSync(tmpPdf); } catch (e) {}
process.exit(fails === 0 ? 0 : 1);
