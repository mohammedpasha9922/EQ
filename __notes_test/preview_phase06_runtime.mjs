// PHASE 06 — test-only runtime probe for Notes PDF Preview 👁️ viewer.
// Stubs html2pdf to emit a deterministic 2-page PDF; validates prev/next,
// page indicator, zoom, state cleanup, body-scroll-lock and Preview==Export
// artifact. Waits for pdf.js render completion (no fixed sleeps). Test-only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8321; const results = []; const VENDOR = path.join(ROOT, '__pdfdiag', 'vendor');
const check = (n, ok, d = '') => { results.push({ name: n, ok, detail: d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${(!ok && d) ? '  -> ' + d : ''}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Minimal but VALID 2-page A4 PDF (pdf.js parses; distinct text per page).
function makeTwoPagePdfBytes() {
  const s = (t) => `BT /F1 24 Tf 72 760 Td (${t}) Tj ET`;
  const s1 = s('EQPREV PAGE ONE'); const s2 = s('EQPREV PAGE TWO');
  let pdf = '%PDF-1.4\n'; const off = {};
  for (let i = 1; i <= 7; i++) off[i] = pdf.length;
  const dict = (n, b) => { pdf += `${n} 0 obj ${b} endobj\n`; };
  const strm = (n, body) => { pdf += `${n} 0 obj << /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream\n`; };
  dict(1, '<< /Type /Catalog /Pages 2 0 R >>');
  dict(2, '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>');
  dict(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R >> >> >>');
  strm(4, s1); dict(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  dict(6, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 7 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R >> >> >>');
  strm(7, s2);
  const xref = pdf.length; pdf += 'xref\n0 8\n0000000000 65535 f \n';
  for (let i = 1; i <= 7; i++) pdf += `${String(off[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]); let fp;
  if (url.includes('pdf.worker')) fp = path.join(VENDOR, 'pdf.worker.min.js');
  else if (url.includes('pdf.min.js')) fp = path.join(VENDOR, 'pdf.min.js');
  else if (url.includes('h2pdf') || url.includes('html2pdf')) fp = path.join(VENDOR, 'h2pdf.js');
  else { let p = url; if (p === '/' || p === '') p = '/index.html'; fp = path.join(ROOT, p); }
  try { const d = fs.readFileSync(fp); const e = fp.toLowerCase(); const ct = e.endsWith('.js')?'text/javascript':e.endsWith('.css')?'text/css':e.endsWith('.html')?'text/html':e.endsWith('.json')?'application/json':e.endsWith('.png')?'image/png':'application/octet-stream'; res.writeHead(200, {'Content-Type': ct + '; charset=utf-8'}); res.end(d); } catch (ee) { res.writeHead(404); res.end('nf'); }
});
// Render-completion + helpers (poll until pdf.js has painted a non-blank page).
const waitInd = async (page, want, to = 3000) => { const st = Date.now(); while (Date.now() - st < to) { const i = await page.evaluate(() => (document.getElementById('notePdfPageIndicator') || {}).textContent || ''); if (i === want) return true; await sleep(150); } return false; };
const dims = async (page) => page.evaluate(() => { const c = document.getElementById('notePdfPreviewCanvas'); return c ? { w: c.width, h: c.height } : null; });
const pix = async (page) => page.evaluate(() => { const c = document.getElementById('notePdfPreviewCanvas'); if (!c || c.width === 0 || c.height === 0) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let p = 0; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) p++; return p; });
const waitDims = async (page, pred, to = 2500) => { const st = Date.now(); let last = { w: 0, h: 0, px: 0 }; while (Date.now() - st < to) { const c = await dims(page); const p = await pix(page); last = { ...c, px: p }; if (c && pred(c) && p > 100) return last; await sleep(120); } return last; };
const extractBlobs = async (page) => page.evaluate(async () => {
  if (!window.pdfjsLib) return { err: 'no pdfjs' };
    return await Promise.all((window.__blobs || []).filter(b => b && b.type === 'application/pdf').map(async (b) => {
    try { const buf = await b.arrayBuffer(); const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; const out = []; for (let p = 1; p <= pdf.numPages; p++) { const pg = await pdf.getPage(p); const tc = await pg.getTextContent({ normalizeWhitespace: true }); out.push(tc.items.map(i => i.str).join('')); } return { numPages: pdf.numPages, pages: out }; } catch (e) { return { err: e.message }; }
  }));
});
let browser; const pageErrors = [];
try {
  await new Promise(r => server.listen(PORT, r));
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
  page.on('pageerror', e => pageErrors.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url(); const isPdfJs = u.includes('pdf.min.js'); const isW = u.includes('pdf.worker') || u.includes('workerSrc');
    const isH = u.includes('h2pdf') || u.includes('html2pdf') || (u.includes('jsdelivr') && u.includes('pdf'));
    if (isW || (isPdfJs && !u.startsWith('http://127.0.0.1') && !u.startsWith('http://localhost')) || isH) {
      const f = isW ? 'pdf.worker.min.js' : (isPdfJs ? 'pdf.min.js' : 'h2pdf.js'); const fp = path.join(VENDOR, f);
      try { const d = fs.readFileSync(fp); req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: d }); } catch (e) { req.continue(); }
    } else { req.continue(); }
  });
  const bytes = makeTwoPagePdfBytes();
  await page.evaluateOnNewDocument(b => {
    window.__pdfBlob = new Blob([new Uint8Array(b)], { type: 'application/pdf' });
    window.__blobs = [];
    const oc = URL.createObjectURL;
    URL.createObjectURL = obj => { window.__blobs.push(obj); return oc.call(URL, obj); };
    window.html2pdf = function () {
      const ch = { set() { return ch; }, from() { return ch; }, toPdf() { return ch; }, save() { return ch; }, output() { return Promise.resolve(window.__pdfBlob); } };
      window.__pdfStubCalls = (window.__pdfStubCalls || 0) + 1; window.__stubBlobs = window.__stubBlobs || []; window.__stubBlobs.push(window.__pdfBlob); return ch;
    };
    window.__flushCalls = 0;
    // Desktop/headless: no native share sheet — force the download fallback.
    try { Object.defineProperty(navigator, 'share', { configurable: true, get: () => undefined }); Object.defineProperty(navigator, 'canShare', { configurable: true, get: () => undefined }); } catch (e) {}
  }, Array.from(bytes));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(200);
  await page.evaluate(() => { const t = document.getElementById('noteTitleInput'); if (t) t.value = 'مراجعة Review 123 ملون'; const b = document.getElementById('noteBodyInput'); if (b) b.textContent = 'مرحبا Hello 1234567890 @#$%&+-=/*()'; });
    await sleep(600);
  const flushBefore = await page.evaluate(() => window.__pdfStubCalls || 0);
  const pr = await page.evaluate(() => { const b = document.getElementById('notePreviewPdfBtn'); if (!b) return null; const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: r.x, y: r.y, w: r.width, h: r.height, visible: !!(r.width && r.height) && !b.disabled, coveredBy: top ? (top.id ? '#' + top.id : top.tagName) : null }; });
  check('Phase 06 — Preview 👁️ button present and on top', !!pr && pr.visible && pr.coveredBy !== 'BODY', 'rect=' + JSON.stringify(pr));
  if (pr) await page.mouse.click(pr.x + pr.w / 2, pr.y + pr.h / 2);
  await waitInd(page, '1 / 2');
  const st = await page.evaluate(() => ({
    modalShow: !!document.getElementById('notePdfPreviewModal').classList.contains('show'),
    bodyLocked: document.body.classList.contains('modal-open'),
    stubCalls: window.__pdfStubCalls || 0,
    ind: (document.getElementById('notePdfPageIndicator') || {}).textContent || null,
    prevDisabled: document.getElementById('notePdfPrevPageBtn').disabled,
    nextDisabled: document.getElementById('notePdfNextPageBtn').disabled,
    canvasCount: document.querySelectorAll('#notePdfPreviewCanvas').length,
    annavCount: document.querySelectorAll('#notePdfAnnoCanvas').length
  }));
  check('A1 Preview opens on click', st.modalShow, 'not show');
  check('A2 body scroll locked while preview open', st.bodyLocked, 'modal-open missing');
  check('A3 html2pdf stub invoked for the blob', st.stubCalls >= 1, 'stubCalls=' + st.stubCalls);
  const flushed = await page.evaluate(() => { try { return (localStorage.getItem('eq-note-manager-notes') || '').includes('مراجعة Review 123 ملون'); } catch (e) { return false; } });
  check('A4 live-edit flush persists note on Preview click', flushed, 'typed title not found in localStorage after preview');
  check('A5 page indicator 1 / 2', st.ind === '1 / 2', 'ind=' + st.ind);
  check('A6 Prev disabled on first page', st.prevDisabled === true, '');
  check('A7 Next enabled on first page', st.nextDisabled === false, '');
  check('A8 exactly one preview + one anno canvas (no duplication)', st.canvasCount === 1 && st.annavCount === 1, 'canvas=' + st.canvasCount + ' anno=' + st.annavCount);
  const nb = await page.evaluate(() => (window.__blobs || []).length);
  check('A9 a valid PDF blob handed to viewer', nb >= 1, 'nblobs=' + nb);
  const d0 = await waitDims(page, c => c && c.w > 500);
  check('A10 page 1 rasterized (canvas non-blank)', d0.px > 100, 'w=' + d0.w + ' h=' + d0.h + ' px=' + d0.px);
  const canvas0 = { w: d0.w, h: d0.h };
  // C: multi-page navigation
  await page.click('#notePdfNextPageBtn'); await sleep(200);
  check('C1 Next -> waits for 2 / 2', await waitInd(page, '2 / 2'), 'no 2 / 2');
  const s1 = await page.evaluate(() => ({ pd: document.getElementById('notePdfPrevPageBtn').disabled, nd: document.getElementById('notePdfNextPageBtn').disabled }));
  check('C2 Prev enabled on last page', s1.pd === false, '');
  check('C3 Next disabled on last page', s1.nd === true, '');
    const d1 = await waitDims(page, c => c && c.w > 500);
  check('C4 page 2 rasterized (canvas non-blank)', d1.px > 100, 'px=' + d1.px);
  await page.click('#notePdfPrevPageBtn'); await sleep(200);
  check('C5 Prev -> waits for 1 / 2', await waitInd(page, '1 / 2'), 'no 1 / 2');
  const s2 = await page.evaluate(() => ({ pd: document.getElementById('notePdfPrevPageBtn').disabled, nd: document.getElementById('notePdfNextPageBtn').disabled }));
  check('C6 Prev disabled on first page', s2.pd === true, '');
  check('C7 Next enabled again', s2.nd === false, '');
  // D: zoom
  await page.click('#notePdfZoomInBtn');
  const zi = await waitDims(page, c => c && c.w > canvas0.w + 5);
  const ziLvl = await page.evaluate(() => (document.getElementById('notePdfZoomLevel') || {}).textContent || '');
  const ziInd = await page.evaluate(() => (document.getElementById('notePdfPageIndicator') || {}).textContent || '');
  check('D1 Zoom In enlarges canvas', zi.w > canvas0.w + 5 && zi.px > 100, 'zi=' + zi.w + ' base=' + canvas0.w);
  check('D2 Zoom % above 100', /^\d+$/.test(String(ziLvl).replace('%', '')) && parseInt(String(ziLvl).replace('%', '')) > 100, 'lvl=' + ziLvl);
  check('D3 indicator stays 1 / 2 after zoom', ziInd === '1 / 2', 'ind=' + ziInd);
  await page.click('#notePdfZoomOutBtn');
  const zo = await waitDims(page, c => c && c.w < zi.w - 5);
  check('D4 Zoom Out shrinks canvas', zo.w < zi.w - 5 && zo.px > 100, 'zo=' + zo.w + ' zi=' + zi.w);
  await page.click('#notePdfZoomFitBtn');
  const zf = await waitDims(page, c => c && Math.abs(c.w - canvas0.w) <= 5);
  check('D5 Fit restores fit-width size', zf.w >= canvas0.w - 5 && zf.w <= canvas0.w + 5 && zf.px > 100, 'fit=' + zf.w + ' base=' + canvas0.w);
  // E: close + reopen (state cleanup) — editor still open
  await page.click('#notePdfPreviewClose'); await sleep(300);
  const closed = await page.evaluate(() => ({ modalShow: !!document.getElementById('notePdfPreviewModal').classList.contains('show'), bodyLocked: document.body.classList.contains('modal-open') }));
  check('E1 modal closes on X', !closed.modalShow, 'still show');
  check('E2 body lock retained while editor open (not released prematurely)', closed.bodyLocked, 'released early');
  await page.mouse.click(pr.x + pr.w / 2, pr.y + pr.h / 2);
  check('E3 reopen resets indicator (no stale 2 / 2)', await waitInd(page, '1 / 2', 10000), 'did not reset to 1 / 2');
  const reopen = await page.evaluate(() => ({ modalShow: !!document.getElementById('notePdfPreviewModal').classList.contains('show'), bodyLocked: document.body.classList.contains('modal-open') }));
  check('E4 reopen shows modal', reopen.modalShow, '');
  check('E5 reopen re-locks body', reopen.bodyLocked, '');
  await page.click('#notePdfPreviewClose'); await sleep(300);
  // F: Export goes through the SAME buildNotePdfBlob -> html2pdf pipeline
  const before = await page.evaluate(() => (window.__stubBlobs || []).length);
  await page.evaluate(() => { window.__clickLog = []; window.addEventListener('click', e => { window.__clickLog.push((e.target && (e.target.id || e.target.tagName)) || '?'); }, true); const b = document.getElementById('exportNotePdfBtn'); if (b) b.click(); else window.__clickLog.push('NO_EXPORT_BTN'); });
  const seenToasts = [];
  const after = await (async () => { const st = Date.now(); let n = before; while (Date.now() - st < 5000) { n = await page.evaluate(() => (window.__stubBlobs || []).length); const tt = await page.evaluate(() => Array.from(document.querySelectorAll('[class*="toast"], [id*="toast"]')).map(e => e.textContent).join('|')); if (tt && !seenToasts.includes(tt)) seenToasts.push(tt); if (n > before) break; await sleep(200); } return n; })();
  const blobDelta = await page.evaluate(() => (window.__blobs || []).length);
  check('F1 Export produced its PDF via the same html2pdf pipeline', after > before || blobDelta > 2, 'stubBlobs=' + before + '->' + after + ' allBlobs=' + blobDelta + ' stub=' + (await page.evaluate(() => window.__pdfStubCalls)) + ' toasts=' + seenToasts.join(' ;; ') + ' clicks=' + (await page.evaluate(() => (window.__clickLog || []).join(','))));
  const stubPages = await page.evaluate(async () => {
    const out = [];
    for (const b of (window.__stubBlobs || [])) {
      try { const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await b.arrayBuffer()) }).promise; const pages = []; for (let p = 1; p <= pdf.numPages; p++) { const pg = await pdf.getPage(p); const tc = await pg.getTextContent({ normalizeWhitespace: true }); pages.push(tc.items.map(i => i.str).join('')); } out.push({ numPages: pdf.numPages, pages }); } catch (e) { out.push({ err: e.message }); }
    }
    return out;
  });
  const okContent = stubPages.length >= 1 && stubPages[0] && stubPages[0].numPages === 2 && stubPages[0].pages && stubPages[0].pages[0] && stubPages[0].pages[0].includes('EQPREV PAGE ONE') && stubPages[0].pages[1] && stubPages[0].pages[1].includes('EQPREV PAGE TWO');
  const okExport = stubPages.length >= 2 && stubPages[stubPages.length - 1] && stubPages[stubPages.length - 1].numPages === 2 && JSON.stringify(stubPages[0].pages) === JSON.stringify(stubPages[stubPages.length - 1].pages);
  check('F2 Preview renders a real 2-page PDF (content visible)', okContent, JSON.stringify(stubPages && stubPages[0]));
  check('F3 Export artifact identical to Preview artifact', okExport, JSON.stringify(stubPages && stubPages[stubPages.length - 1]));
  // E6: release lock only when editor + manager are both closed
  await page.click('#closeFullScreenNote'); await sleep(300);
  await page.evaluate(() => { const b = document.getElementById('closeNotesManager'); if (b) b.click(); }); await sleep(400);
  const released = await page.evaluate(() => document.body.classList.contains('modal-open'));
  check('E6 body scroll lock released after all modals closed', !released, 'modal-open still present');
  const benign = s => /path attribute d|Expected number|404 \(Not Found\)$|favicon|ResizeObserver loop limit|textContent|eq-app/.test(s);
  const newErrs = pageErrors.filter(s => !benign(s));
  check('No NEW preview-related page/console errors', newErrs.length === 0, newErrs.join(' ;; '));
  const pass = results.filter(r => r.ok).length; const fail = results.length - pass;
  fs.writeFileSync(path.join(HERE, 'preview_phase06_runtime.txt'), `${pass} passed, ${fail} failed, ${results.length} total\npageErrors: ${pageErrors.join(' ;; ') || 'none'}\nresults:\n${results.map(r => (r.ok ? 'PASS' : 'FAIL') + ' ' + r.name + (r.detail ? ' -> ' + r.detail : '')).join('\n')}\n`, 'utf8');
  console.log('\n==== PHASE 06 PREVIEW RUNTIME: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
  if (pageErrors.length) console.log('PAGE ERRORS: ' + pageErrors.join(' ;; '));
  process.exitCode = pass === results.length ? 0 : 1;
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  fs.writeFileSync(path.join(HERE, 'preview_phase06_runtime.txt'), 'HARNESS ERROR: ' + (err && err.message) + '\n', 'utf8');
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.close();
}




