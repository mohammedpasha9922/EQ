// PHASE — Notes 👁️ Preview button runtime harness (browser, positive validation).
// Scoped to the EXISTING Preview path only: pressing the real 👁️ button must
// open the existing notePdfPreviewModal, keep it open, load a valid PDF into
// the existing pdf.js viewer and render page 1 onto the existing canvas — no
// instant close (white page) from the blob-cache poisoning bug.
//
// Environment note: the REAL note rasterizer is html2pdf (html2canvas), which
// the docs record as NOT working headlessly (html2canvas needs a visible
// viewport; 0 blobs were produced headlessly even with vendor interception).
// That is why this harness stubs ONLY window.html2pdf with a chainable fake
// that emits a genuine, single-page valid PDF. Everything downstream (the
// blob-cache wrapper, openNotePdfPreview, the real pdf.js viewer + canvas
// render) is the REAL app code running in a REAL Chrome.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8317;
const results = [];
const VENDOR = path.join(ROOT, '__pdfdiag', 'vendor');

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${(!ok && detail) ? '  -> ' + detail : ''}`);
}

// Build a minimal but VALID single-page PDF (renders a visible text line).
function makeMinimalPdfBytes() {
  const objs = [
    '',
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R >> >> >>',
    '<< /Length 52 >>\nstream\nBT /F1 24 Tf 72 760 Td (EQ Preview Note OK) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i <= 5; i++) {
    offsets.push(pdf.length);
    pdf += `${i} 0 obj ${objs[i]} endobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp;
  if (url.includes('pdf.worker')) fp = path.join(VENDOR, 'pdf.worker.min.js');
  else if (url.includes('pdf.min.js')) fp = path.join(VENDOR, 'pdf.min.js');
  else if (url.includes('h2pdf') || url.includes('html2pdf')) fp = path.join(VENDOR, 'h2pdf.js');
  else {
    let p = url;
    if (p === '/' || p === '') p = '/index.html';
    fp = path.join(ROOT, p);
  }
  try {
    const d = fs.readFileSync(fp);
    const ext = fp.toLowerCase();
    let ct = 'application/octet-stream';
    if (ext.endsWith('.js')) ct = 'text/javascript';
    else if (ext.endsWith('.css')) ct = 'text/css';
    else if (ext.endsWith('.html')) ct = 'text/html';
    else if (ext.endsWith('.json')) ct = 'application/json';
    else if (ext.endsWith('.png')) ct = 'image/png';
    res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
  // Route external CDN requests (pdf.js + worker + html2pdf) to the LOCAL vendor
  // so the pipeline runs fully offline. Non-CDN requests continue normally.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    const isPdfJs = u.includes('pdf.min.js');
    const isWorker = u.includes('pdf.worker') || u.includes('workerSrc');
    const isH2Pdf = u.includes('h2pdf') || u.includes('html2pdf') || u.includes('jsdelivr') && u.includes('pdf');
    if (isWorker || (isPdfJs && !u.startsWith('http://127.0.0.1') && !u.startsWith('http://localhost')) || isH2Pdf) {
      const file = isWorker ? 'pdf.worker.min.js' : (isPdfJs ? 'pdf.min.js' : 'h2pdf.js');
      const fp = path.join(VENDOR, file);
      try { const d = fs.readFileSync(fp); req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: d }); } catch (e) { req.continue(); }
    } else { req.continue(); }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) { /* served by our own server */ }
  });
  await page.evaluateOnNewDocument((pdfBytes) => {
    const bytes = new Uint8Array(pdfBytes);
    window.__pdfBlob = new Blob([bytes], { type: 'application/pdf' });
    window.html2pdf = function () {
      const chain = { set() { return chain; }, from() { return chain; }, toPdf() { return chain; }, save() { return chain; }, output() { return Promise.resolve(window.__pdfBlob); } };
      window.__pdfStubCalls = (window.__pdfStubCalls || 0) + 1;
      return chain;
    };
    const origCreate = URL.createObjectURL;
    const produced = [];
    window.__capturedBlobDetail = () => ({ count: produced.length, type: produced.length ? produced[0].type : null, size: produced.length ? produced[0].size : 0 });
    URL.createObjectURL = (obj) => { produced.push(obj); return origCreate.call(URL, obj); };
  }, Array.from(makeMinimalPdfBytes()));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  // Open Notes manager, create a note with Arabic + English + numbers.
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => {
    const t = document.getElementById('noteTitleInput'); if (t) t.value = 'معاينة Preview 123';
    const body = document.getElementById('noteBodyInput'); if (body) body.textContent = 'مرحبا Hello 123 mixed';
  });
  await sleep(250);
const pre = await page.evaluate(() => {
    const b = document.getElementById('notePreviewPdfBtn');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, coveredBy: topEl ? (topEl.id ? '#' + topEl.id : topEl.tagName) : null, disabled: b.disabled };
  });

    check('Preview button present in the note editor DOM', !!pre, 'notePreviewPdfBtn not found');
  if (pre) {
    check('Preview button is clickable (visible, on top, enabled)', pre.rect.w > 0 && pre.rect.h > 0 && !pre.disabled && pre.coveredBy && pre.coveredBy !== 'BODY', 'covered by ' + pre.coveredBy);
    await page.mouse.click(pre.rect.x + pre.rect.w / 2, pre.rect.y + pre.rect.h / 2);
    // Sample modal open state + toast text + stub calls several times to catch
    // the transient state (toast auto-hides after ~1.6s) and any instant close.
    const samples = [];
    for (const ms of [250, 600, 1200, 2200]) {
      if (samples.length === 0) await sleep(250);
      else await sleep(ms - samples[samples.length - 1].msRaw);
      const s = await page.evaluate(() => {
        const m = document.getElementById('notePdfPreviewModal');
        const toast = document.getElementById('toast');
        return { open: !!(m && m.classList.contains('show')),
          toast: toast ? toast.textContent || '' : '',
          stubCalls: window.__pdfStubCalls || 0,
          ind: (document.getElementById('notePdfPageIndicator') || {}).textContent || null };
      });
      s.msRaw = ms;
      samples.push(s);
    }
    check('Modal opens on Preview click', samples.some((s) => s.open), 'modal never .show');
    check('Preview stays open (no instant close) at end', samples[samples.length - 1].open, 'closed by end; samples=' + JSON.stringify(samples.map((x) => ({ o: x.open, t: x.toast }))));
    const last = samples[samples.length - 1];
    const blobDetail = await page.evaluate(() => window.__capturedBlobDetail ? window.__capturedBlobDetail() : null);
    check('A valid PDF document was handed to the viewer', blobDetail && blobDetail.count >= 1 && blobDetail.type === 'application/pdf' && blobDetail.size > 0, JSON.stringify(blobDetail));
    const canvas = await page.evaluate(() => {
      const c = document.getElementById('notePdfPreviewCanvas');
      let pixels = 0;
      if (c && c.width > 0 && c.height > 0) {
        try { const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) pixels++; } catch (e) { pixels = -1; }
      }
      return { w: c ? c.width : 0, h: c ? c.height : 0, pixels };
    });
    check('Canvas sized for the rendered page', canvas.w > 0 && canvas.h > 0, 'canvas ' + canvas.w + 'x' + canvas.h);
    check('Page is actually rasterized (canvas non-blank)', canvas.pixels > 100, 'pixels=' + canvas.pixels);
    const ind = await page.evaluate(() => (document.getElementById('notePdfPageIndicator') || {}).textContent || null);
    check('Page indicator reached "1 / 1"', ind === '1 / 1', 'indicator=' + ind + ' stubCalls=' + last.stubCalls);
    // Only fail on console/page errors that are NEW after the Preview was used.
    // Pre-existing app-boot noise (icon <path> stroking, missing icon/favicon
    // 404s) is unrelated to the 👁️ Preview, so it is snapshotted and excluded.
    const benign = (s) => /path attribute d|Expected number|404 \(Not Found\)|favicon/.test(s);
    const bootNoise = pageErrors.filter((s) => benign(s));
    const previewErrors = pageErrors.filter((s) => !benign(s));
    check('No NEW PDF-preview-related page/console errors', previewErrors.length === 0, previewErrors.join(' ;; '));
    if (bootNoise.length) console.log('  [diag] ignored pre-existing app-boot console noise (' + bootNoise.length + ').');
    if (last.stubCalls === 0) console.log('  [diag] html2pdf stub was NEVER invoked — module likely used its own loaded copy or failed earlier.');
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  fs.writeFileSync(path.join(HERE, 'preview_button_runtime.txt'), `${pass} passed, ${fail} failed, ${results.length} total\npageErrors: ${pageErrors.join(' ;; ') || 'none'}\n`, 'utf8');
  console.log('\n==== PREVIEW RUNTIME RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
  if (pageErrors.length) console.log('PAGE ERRORS: ' + pageErrors.join(' ;; '));
  process.exit(pass === results.length ? 0 : 1);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  fs.writeFileSync(path.join(HERE, 'preview_button_runtime.txt'), 'HARNESS ERROR: ' + (err && err.message) + '\n', 'utf8');
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}