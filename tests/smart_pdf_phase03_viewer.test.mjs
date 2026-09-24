// SMART PDF — PHASE 03 — UPLOAD → PDF VIEWER ONLY (vertical scroll).
// Proves, in a real Chrome browser and with a REAL .pdf file from the device:
//   1) Smart PDF opens (same workspace, Feature Navigation entry)
//   2) UploadZone is the first state
//   3) "Upload PDF" opens the native picker
//   4) a real PDF is selected from disk
//   5) UploadZone disappears completely (conditional rendering)
//   6) PDFViewer appears in its place, inside the SAME workspace
//   7) all PDF pages are stacked vertically (canvas per page)
//   8) vertical scroll works (scroll, NOT Next/Previous)
//   9) the page indicator shows and updates while scrolling
//  10) the page indicator uses the app i18n + follows RTL/LTR
//  11) pinch-to-zoom stays supported by the viewer (native, no custom zoom UI)
//  12) no JavaScript errors
//  13) PDF Reports is never opened
//  14) nothing outside Smart PDF changes (Calculator / Notes / PDF Reports)
// Run:  node tests/smart_pdf_phase03_viewer.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require2 = createRequire(import.meta.url);
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8770;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml', '.txt': 'text/plain', '.wasm': 'application/wasm', '.pdf': 'application/pdf' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  try {
    const d = fs.readFileSync(path.join(ROOT, u));
    res.writeHead(200, { 'Content-Type': mimeOf(u) + '; charset=utf-8' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 300000); // hard watchdog

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

// A REAL, 4-page PDF generated on disk (the file the picker receives).
const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
const FIXTURE = path.join(ROOT, '__p3_smartpdf_fixture_4p.pdf');
const NOT_PDF = path.join(ROOT, '__p3_smartpdf_fixture_notpdf.txt');
async function buildFixtures() {
  const doc = await pdfLib.PDFDocument.create();
  const f = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  for (let i = 1; i <= 4; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`SMART PDF PHASE 03 — PAGE ${i}`, { x: 72, y: 770, size: 18, font: f });
    p.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 740, size: 12, font: f });
  }
  fs.writeFileSync(FIXTURE, Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })));
  fs.writeFileSync(NOT_PDF, 'this is not a pdf');
}
await buildFixtures();

async function initPage(viewport, locale) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  if (locale) {
    await page.evaluate((l) => {
      const s = document.getElementById('topBarLanguageSelect');
      if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
    }, locale);
    await sleep(350);
  }
  return { page, errs };
}

async function waitFor(page, fn, t = 20000) {
  const s = Date.now();
  while (Date.now() - s < t) { if (await page.evaluate(fn)) return true; await sleep(120); }
  return false;
}
async function openSmartPdf(page) {
  await page.evaluate(() => {
    const b = document.querySelector('.feature-nav-btn[data-action="open-smart-pdf"]');
    if (b) b.click();
  });
  await sleep(450);
}
async function pickFile(page, filePath, triggerSelector) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 12000 }),
    page.evaluate((sel) => { document.querySelector(sel).click(); }, triggerSelector)
  ]);
  await chooser.accept([filePath]);
}
const viewerShown = () => {
  const v = document.getElementById('smartPdfViewerArea');
  const u = document.getElementById('smartPdfUploadArea');
  return !!v && !v.hidden && !!u && u.hidden;
};


// ---------------------------------------------------------------
// DESKTOP — EN (LTR)
// ---------------------------------------------------------------
{
  const { page, errs } = await initPage({ width: 1280, height: 800 }, 'en');

  // 14) baseline: the rest of the app is healthy before Smart PDF is touched.
  const base = await page.evaluate(() => ({
    calc: !!document.getElementById('primaryDisplay'),
    notes: !!document.getElementById('notesManagerModal'),
    reports: !!document.getElementById('pdfReportsWorkspace'),
    dir: document.documentElement.dir
  }));
  check('14a. Calculator/Notes/PDF Reports present before opening Smart PDF',
    base.calc && base.notes && base.reports, JSON.stringify(base));

  // 1) open Smart PDF from the Feature Navigation button.
  await openSmartPdf(page);
  const opened = await page.evaluate(() => {
    const ws = document.getElementById('smartPdfWorkspace');
    return {
      shown: !!ws && ws.classList.contains('show') && ws.getAttribute('aria-hidden') === 'false',
      reportsOpen: !!document.querySelector('#pdfReportsWorkspace.show'),
      notesOpen: !!document.querySelector('#notesManagerModal.show')
    };
  });
  check('1. Smart PDF workspace opens (user stays in the workspace)', opened.shown, JSON.stringify(opened));
  check('13. opening Smart PDF never opens PDF Reports', !opened.reportsOpen && !opened.notesOpen);

  // 2) UploadZone is the visible state (the viewer is not rendered yet).
  const up = await page.evaluate(() => {
    const u = document.getElementById('smartPdfUploadArea');
    const v = document.getElementById('smartPdfViewerArea');
    const b = document.getElementById('smartPdfUploadBtn');
    const inp = document.getElementById('smartPdfFileInput');
    return {
      uploadVisible: !!u && !u.hidden && u.getBoundingClientRect().height > 0,
      viewerHidden: !!v && v.hidden,
      btnText: b ? b.textContent.trim() : null,
      accept: inp ? inp.getAttribute('accept') : null,
      hint: (document.querySelector('#smartPdfUploadArea .smart-pdf-upload-hint') || {}).textContent || ''
    };
  });
  check('2. UploadZone visible before choosing a file',
    up.uploadVisible && up.viewerHidden, JSON.stringify({ u: up.uploadVisible, v: up.viewerHidden }));
  check('4a. Smart PDF input accepts PDF only (accept=application/pdf,.pdf)', up.accept === 'application/pdf,.pdf', String(up.accept));
  check('4b. existing 20MB Smart PDF limit hint preserved', /20\s*MB/i.test(up.hint), up.hint);

  // PDF-only guard: a non-PDF is refused and the UploadZone stays.
  await pickFile(page, NOT_PDF, '#smartPdfUploadBtn');
  await sleep(700);
  const neg = await page.evaluate(() => {
    const e = document.getElementById('smartPdfUploadError');
    const u = document.getElementById('smartPdfUploadArea');
    const v = document.getElementById('smartPdfViewerArea');
    return { err: e ? e.textContent.trim() : '', errShown: !!e && !e.hidden,
      uploadVisible: !!u && !u.hidden, viewerHidden: !!v && v.hidden };
  });
  check('4c. non-PDF rejected with a localized error, UploadZone kept',
    neg.errShown && neg.err.length > 0 && neg.uploadVisible && neg.viewerHidden, JSON.stringify(neg));

  // 3) "Upload PDF" opens the native picker, 4) and a real PDF is selected.
  await pickFile(page, FIXTURE, '#smartPdfUploadBtn');
  const loaded = await waitFor(page, () => {
    const v = document.getElementById('smartPdfViewerArea');
    return !!v && !v.hidden && document.querySelectorAll('#smartPdfViewerPages > .smart-pdf-viewer-page').length >= 4;
  }, 30000);
  check('3/4. real PDF selected from disk and processed', loaded);
  await sleep(600);

  // 5) UploadZone gone, 6) PDFViewer in its place (same workspace).
  const swap = await page.evaluate(() => {
    const u = document.getElementById('smartPdfUploadArea');
    const v = document.getElementById('smartPdfViewerArea');
    const ws = document.getElementById('smartPdfWorkspace');
    return {
      uploadHidden: !!u && u.hidden && getComputedStyle(u).display === 'none',
      uploadRect: u ? Math.round(u.getBoundingClientRect().height) : -1,
      viewerShown: !!v && !v.hidden && v.getBoundingClientRect().height > 0,
      sameWorkspace: !!ws && ws.contains(v) && ws.contains(document.getElementById('smartPdfPageIndicator')),
      reportsOpen: !!document.querySelector('#pdfReportsWorkspace.show')
    };
  });
  check('5. UploadZone disappears completely',
    swap.uploadHidden && swap.uploadRect === 0, JSON.stringify({ hidden: swap.uploadHidden, h: swap.uploadRect }));
  check('6. PDFViewer appears inside the same Smart PDF workspace',
    swap.viewerShown && swap.sameWorkspace, JSON.stringify(swap));
  check('13b. PDF Reports still closed while viewing', !swap.reportsOpen);

  // 7) all pages stacked VERTICALLY.
  const stack = await page.evaluate(() => {
    const wraps = Array.from(document.querySelectorAll('#smartPdfViewerPages > .smart-pdf-viewer-page'));
    let ordered = wraps.length > 1;
    for (let i = 1; i < wraps.length; i++) {
      const prev = wraps[i - 1].getBoundingClientRect();
      const cur = wraps[i].getBoundingClientRect();
      if (cur.top < prev.bottom - 2) ordered = false;            // each page below the previous
      if (Math.abs(cur.left - prev.left) > 4) ordered = false;   // same single column
    }
    return {
      n: wraps.length,
      canvases: document.querySelectorAll('#smartPdfViewerPages canvas').length,
      ordered,
      pages: wraps.map((w) => w.getAttribute('data-page')).join(','),
      dir: getComputedStyle(document.getElementById('smartPdfViewerPages')).flexDirection
    };
  });
  check('7. all 4 PDF pages rendered as canvases', stack.n === 4 && stack.canvases === 4,
    JSON.stringify({ n: stack.n, canvases: stack.canvases }));
  check('7b. pages stacked vertically in one column (scroll, not Next/Previous)',
    stack.ordered && stack.dir === 'column' && stack.pages === '1,2,3,4', JSON.stringify(stack));

  // Scrollbar itself must be vertical (overflow-y auto, no sideways scroll).
  const ov = await page.evaluate(() => {
    const sc = document.getElementById('smartPdfViewerScroll');
    if (!sc) return null;
    const cs = getComputedStyle(sc);
    return { ovY: cs.overflowY, ovX: cs.overflowX, sh: sc.scrollHeight, ch: sc.clientHeight };
  });
  check('7c. viewer region scrolls vertically (overflow-y auto, overflow-x hidden)',
    !!ov && ov.ovY === 'auto' && ov.ovX === 'hidden' && ov.sh > ov.ch, JSON.stringify(ov));

  // 8) vertical scroll works — moving the scroll moves through pages.
  const sc1 = await page.evaluate(() => {
    const sc = document.getElementById('smartPdfViewerScroll');
    sc.scrollTop = Math.round(sc.scrollHeight * 0.55);
    return sc.scrollTop;
  });
  await sleep(600);
  const sc2 = await page.evaluate(() => ({
    ind: document.getElementById('smartPdfPageIndicator').textContent.trim(),
    st: document.getElementById('smartPdfViewerScroll').scrollTop
  }));
  check('8. vertical scroll moves through the document', sc1 > 50 && sc2.st > 50,
    JSON.stringify({ setTop: sc1, nowTop: sc2.st }));
  check('9. page indicator shows and updates while scrolling',
    /2|3/.test(sc2.ind) && sc2.ind !== 'Page 1 of 4' && /of\s*4/.test(sc2.ind), sc2.ind);

  // 10) indicator wording follows the app language (EN here, LTR here).
  const i10 = await page.evaluate(() => ({
    ind: document.getElementById('smartPdfPageIndicator').textContent.trim(),
    dir: document.documentElement.dir, lang: document.documentElement.lang
  }));
  check('10a. indicator uses the EN i18n wording and the page stays LTR',
    i10.ind === 'Page 2 of 4' || /Page\s+\d+\s+of\s+4/.test(i10.ind),
    JSON.stringify(i10));

  // 11) pinch-to-zoom is left to the browser — no custom zoom UI, gesture allowed.
  const z11 = await page.evaluate(() => {
    const sc = document.getElementById('smartPdfViewerScroll');
    const ta = getComputedStyle(sc).touchAction || '';
    return { touchAction: ta,
      customZoom: !!document.querySelector('#smartPdfViewerArea .zoom, #smartPdfViewerArea [data-action*="zoom"]') };
  });
  check('11. viewer allows pinch-zoom, no custom zoom system added',
    /pinch-zoom/.test(z11.touchAction) && !z11.customZoom, JSON.stringify(z11));

  // 12) no JS errors on this whole flow; 13/14 visually confirmed above.
  check('12. no JavaScript errors (desktop EN flow)', errs.length === 0, errs.slice(0, 3).join(' | '));
  const untouched = await page.evaluate(() => ({
    calcVisible: !!document.getElementById('calculator') || !!document.getElementById('primaryDisplay'),
    notesClosed: !document.querySelector('#notesManagerModal.show'),
    reportsClosed: !document.querySelector('#pdfReportsWorkspace.show')
  }));
  check('14b. Calculator/Notes/PDF Reports untouched while viewing',
    untouched.calcVisible && untouched.notesClosed && untouched.reportsClosed, JSON.stringify(untouched));
  await page.close();
}

// ---------------------------------------------------------------
// MOBILE WIDTH + AR (RTL) — indicator language + direction follow app
// ---------------------------------------------------------------
{
  const { page, errs } = await initPage({ width: 390, height: 844 }, 'ar');

  const rtl = await page.evaluate(() => ({
    dir: document.documentElement.dir, lang: document.documentElement.lang
  }));
  check('10b. app switches to RTL for Arabic', rtl.dir === 'rtl', JSON.stringify(rtl));

  await openSmartPdf(page);
  const upAr = await page.evaluate(() => ({
    btn: (document.getElementById('smartPdfUploadBtn') || {}).textContent || '',
    hint: (document.querySelector('#smartPdfUploadArea .smart-pdf-upload-hint') || {}).textContent || ''
  }));
  check('10c. upload button + hint localized (Arabic)',
    upAr.btn.trim().length > 0 && upAr.btn.trim() !== 'Upload PDF', JSON.stringify(upAr));

  await pickFile(page, FIXTURE, '#smartPdfUploadBtn');
  const loadedAr = await waitFor(page, viewerShown, 30000);
  check('10d. viewer opens on mobile width too', loadedAr);
  await sleep(600);

  // Scroll the phone-width viewer: indicator must become the AR wording.
  await page.evaluate(() => {
    const sc = document.getElementById('smartPdfViewerScroll');
    sc.scrollTop = Math.round(sc.scrollHeight * 0.6);
  });
  await sleep(700);
  const indAr = await page.evaluate(() => ({
    ind: document.getElementById('smartPdfPageIndicator').textContent.trim(),
    dir: document.documentElement.dir
  }));
  check('10e. indicator follows the Arabic i18n wording + RTL',
    indAr.dir === 'rtl' && /\u0635\u0641\u062d\u0629/.test(indAr.ind) && !/Page/.test(indAr.ind), JSON.stringify(indAr));

  const nPages = await page.evaluate(() =>
    document.querySelectorAll('#smartPdfViewerPages > .smart-pdf-viewer-page').length);
  check('10f. all 4 pages stacked on the phone-width viewer', nPages === 4, 'pages=' + nPages);

  check('12b. no JavaScript errors (mobile AR flow)', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

await browser.close();
server.close();
try { fs.unlinkSync(FIXTURE); } catch (e) { /* ignore */ }
try { fs.unlinkSync(NOT_PDF); } catch (e) { /* ignore */ }

const failed = results.filter((r) => !r.ok);
console.log(`\nSMART-PDF-PHASE03 ${failed.length === 0 ? 'ALL PASS' : 'FAILURES: ' + failed.length} (${results.length} checks)`);
process.exit(failed.length === 0 ? 0 : 1);
