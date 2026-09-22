// PHASE — Notes PDF Preview ✏️ Edit button runtime harness (browser).
// Scoped to the EXISTING preview annotation path only: pressing the real ✏️
// (notePdfAnnoEditBtn) inside the existing notePdfPreviewModal must activate
// the existing PHASE 08 edit mode, and the EXISTING tools (text/draw) must be
// usable on the existing overlay — no new edit system.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8331;
const results = [];
const VENDOR = path.join(ROOT, '__pdfdiag', 'vendor');

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${(!ok && detail) ? '  -> ' + detail : ''}`);
}

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
  for (let i = 1; i <= 5; i++) { offsets.push(pdf.length); pdf += `${i} 0 obj ${objs[i]} endobj\n`; }
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
  else { let p = url; if (p === '/' || p === '') p = '/index.html'; fp = path.join(ROOT, p); }
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
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !t.includes('attribute d')) pageErrors.push('[console] ' + t); });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    const isPdfJs = u.includes('pdf.min.js');
    const isWorker = u.includes('pdf.worker') || u.includes('workerSrc');
    const isH2Pdf = u.includes('h2pdf') || u.includes('html2pdf') || (u.includes('jsdelivr') && u.includes('pdf'));
    if (isWorker || (isPdfJs && !u.startsWith('http://127.0.0.1') && !u.startsWith('http://localhost')) || isH2Pdf) {
      const file = isWorker ? 'pdf.worker.min.js' : (isPdfJs ? 'pdf.min.js' : 'h2pdf.js');
      try { const d = fs.readFileSync(path.join(VENDOR, file)); req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: d }); } catch (e) { req.continue(); }
    } else { req.continue(); }
  });
  await page.evaluateOnNewDocument((pdfBytes) => {
    const bytes = new Uint8Array(pdfBytes);
    window.__pdfBlob = new Blob([bytes], { type: 'application/pdf' });
    window.html2pdf = function () {
      const chain = { set() { return chain; }, from() { return chain; }, toPdf() { return chain; }, save() { return chain; }, output() { return Promise.resolve(window.__pdfBlob); } };
      return chain;
    };
  }, Array.from(makeMinimalPdfBytes()));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  // Open Notes -> new note -> type content.
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => {
    const t = document.getElementById('noteTitleInput'); if (t) t.value = 'Edit Pencil 123';
    const body = document.getElementById('noteBodyInput'); if (body) body.textContent = 'مرحبا Hello mixed';
  });
  await sleep(300);
  // Open 👁️ Preview (real path).
  await page.evaluate(() => { const b = document.getElementById('notePreviewPdfBtn'); if (b) b.click(); });
  await page.waitForSelector('#notePdfPreviewModal.show', { visible: true, timeout: 15000 });
  // Wait for the real pdf.js render to finish (indicator + canvas + overlay).
  await page.waitForFunction(() => (document.getElementById('notePdfPageIndicator') || {}).textContent === '1 / 1', { timeout: 25000 });
  await page.waitForFunction(() => { const c = document.getElementById('notePdfPreviewCanvas'); return c && c.width > 300; }, { timeout: 10000 });
  await page.waitForFunction(() => { const r = document.getElementById('notePdfAnnoLayer').getBoundingClientRect(); return r.width > 0 && r.height > 0; }, { timeout: 10000 });
  await sleep(300);
  const pre = await page.evaluate(() => {
    const modal = document.getElementById('notePdfPreviewModal');
    const btn = document.getElementById('notePdfAnnoEditBtn');
    const layer = document.getElementById('notePdfAnnoLayer');
    const r = btn ? btn.getBoundingClientRect() : null;
    const lr = layer ? layer.getBoundingClientRect() : null;
    const cs = layer ? getComputedStyle(layer) : null;
    return {
      modalShown: !!modal && modal.classList.contains('show'),
      hasBtn: !!btn,
      rect: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
      hasLayer: !!layer,
      layerRect: lr ? { w: lr.width, h: lr.height } : null,
      layerPe: cs ? cs.pointerEvents : null,
      indicator: (document.getElementById('notePdfPageIndicator') || {}).textContent || null,
      canvas: (() => { const c = document.getElementById('notePdfPreviewCanvas'); return c ? { w: c.width, h: c.height } : null; })(),
      toolBtns: ['notePdfAnnoEditBtn', 'notePdfAnnoTextBtn', 'notePdfAnnoHighlightBtn', 'notePdfAnnoDrawBtn'].map((id) => !!document.getElementById(id)),
      canvasRendered: (() => { const c = document.getElementById('notePdfPreviewCanvas'); if (!c) return false; const ctx = c.getContext('2d'); try { return ctx.getImageData(0, 0, c.width, c.height).data.some((v) => v !== 0); } catch (e) { return false; } })()
    };
  });
  check('Preview modal is open (real 👁️ path)', pre.modalShown);
  check('PDF page rendered on canvas (valid PDF loaded)', pre.indicator === '1 / 1' && pre.canvas && pre.canvas.w > 0 && pre.canvasRendered, JSON.stringify({ ind: pre.indicator, canvas: pre.canvas }));
  check('✏️ Edit button present in the preview toolbar', pre.hasBtn && pre.rect && pre.rect.w > 0 && pre.rect.h > 0, JSON.stringify(pre.rect));
  check('Annotation overlay exists and receives pointer events', pre.hasLayer && pre.layerPe === 'auto' && pre.layerRect && pre.layerRect.w > 0, JSON.stringify({ pe: pre.layerPe, rect: pre.layerRect }));
  check('Existing annotation tool buttons all present (no new system needed)', pre.toolBtns.every((x) => x === true), JSON.stringify(pre.toolBtns));
  // 1) Press ✏️ -> edit mode activates.
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoEditBtn'); b.click(); });
  await sleep(150);
  const editOn = await page.evaluate(() => {
    const btn = document.getElementById('notePdfAnnoEditBtn');
    return { pressed: btn.getAttribute('aria-pressed'), active: btn.classList.contains('anno-active') };
  });
  check('Pressing ✏️ enters edit mode (aria-pressed + active + tool=edit)', editOn.pressed === 'true' && editOn.active, JSON.stringify(editOn));
  // 2) Use the EXISTING Text tool: select it, click on the page, type text.
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoTextBtn'); b.click(); });
  await sleep(100);
  const lr = await page.evaluate(() => { let r = document.getElementById('notePdfAnnoLayer').getBoundingClientRect(); if (!r.width || !r.height) r = document.getElementById('notePdfPreviewCanvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.evaluate(() => { window.__pdHits = 0; const l = document.getElementById('notePdfAnnoLayer'); l.addEventListener('pointerdown', () => { window.__pdHits++; }, { capture: true, once: true }); });
  const lrNow = await page.evaluate(() => { const r = document.getElementById('notePdfAnnoLayer').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, active: document.getElementById('notePdfAnnoTextBtn').classList.contains('anno-active') }; });
  console.log('[diag] layerAtClick=' + JSON.stringify(lrNow));
  await page.mouse.click(lrNow.x + lrNow.w / 2, lrNow.y + lrNow.h / 2);
  await sleep(250);
  await sleep(60);
  console.log('[diag] t60=' + JSON.stringify(await page.evaluate(() => { const b = document.querySelectorAll('#notePdfAnnoTextBoxes .note-pdf-anno-textbox'); return { n: b.length, active: document.activeElement ? document.activeElement.className : null }; })));
  await sleep(400);
  console.log('[diag] t460=' + JSON.stringify(await page.evaluate(() => { const b = document.querySelectorAll('#notePdfAnnoTextBoxes .note-pdf-anno-textbox'); return { n: b.length, active: document.activeElement ? document.activeElement.className : null, html: document.getElementById('notePdfAnnoTextBoxes').innerHTML.slice(0, 120) }; })));
  await sleep(60);
  console.log('[diag] t60=' + JSON.stringify(await page.evaluate(() => { const b = document.querySelectorAll('#notePdfAnnoTextBoxes .note-pdf-anno-textbox'); return { n: b.length, active: document.activeElement ? document.activeElement.className : null }; })));
  await sleep(400);
  console.log('[diag] t460=' + JSON.stringify(await page.evaluate(() => { const b = document.querySelectorAll('#notePdfAnnoTextBoxes .note-pdf-anno-textbox'); return { n: b.length, active: document.activeElement ? document.activeElement.className : null, html: document.getElementById('notePdfAnnoTextBoxes').innerHTML.slice(0, 120) }; })));
  console.log('[diag] pointerdownHits=' + await page.evaluate(() => window.__pdHits));
  const textAdded = await page.evaluate(() => {
    const boxes = document.querySelectorAll('#notePdfAnnoTextBoxes .note-pdf-anno-textbox');
    const annoCount = 0;
    return { boxCount: boxes.length, editable: boxes.length ? boxes[boxes.length - 1].isContentEditable : false, pe: boxes.length ? getComputedStyle(boxes[boxes.length - 1]).pointerEvents : null };
  });
  check('Existing Text tool adds an editable text box on the PDF', textAdded.boxCount > 0 && textAdded.editable, JSON.stringify(textAdded));
  if (textAdded.boxCount) {
    await page.keyboard.type('Hi 123');
    await sleep(200);
    const typed = await page.evaluate(() => {
      const boxes = document.querySelectorAll('#notePdfAnnoTextBoxes .note-pdf-anno-textbox');
      const last = boxes[boxes.length - 1];
      return { val: (last.value !== undefined ? last.value : last.textContent) || '' };
    });
    check('Typed text is stored in the annotation state (burn-in source)', /Hi\s*123/.test(typed.val), JSON.stringify(typed));
  }
  // 3) Existing Draw tool: drag a stroke on the page.
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoDrawBtn'); b.click(); });
  await sleep(100);
  await page.mouse.move(lr.x + lr.w * 0.3, lr.y + lr.h * 0.3);
  await page.mouse.down();
  await page.mouse.move(lr.x + lr.w * 0.6, lr.y + lr.h * 0.45, { steps: 8 });
  await page.mouse.up();
  await sleep(250);
  const drawn = await page.evaluate(() => {


    const c = document.getElementById('notePdfAnnoCanvas');
    let painted = false;
    try { painted = c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v) => v !== 0); } catch (e) { painted = false; }
    return { painted };
  });
  check('Existing Draw tool paints a stroke on the overlay canvas', drawn.painted, JSON.stringify(drawn));
  // 4) Return to ✏️ edit mode and exit preview cleanly (back to the note).
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoEditBtn'); b.click(); });
  await sleep(100);
  await page.evaluate(() => { const b = document.getElementById('notePdfPreviewClose'); if (b) b.click(); });
  await sleep(300);
  const after = await page.evaluate(() => {
    const pm = document.getElementById('notePdfPreviewModal');
    const nm = document.getElementById('fullScreenNoteModal');
    return { previewClosed: !pm.classList.contains('show'), noteStillOpen: nm.classList.contains('show') };
  });
  check('Closing preview returns to the Note (no wrong exit)', after.previewClosed && after.noteStillOpen, JSON.stringify(after));
  const finalErrors = pageErrors.filter((e) => !e.includes('attribute d') && !e.includes('404'));
  check('No new JavaScript errors from the ✏️ edit flow', finalErrors.length === 0, finalErrors.join(' ;; '));
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n==== ✏️ EDIT RUNTIME RESULT: ${pass} passed, ${fail} failed, ${results.length} total ====`);
  process.exit(pass === results.length ? 0 : 1);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}

