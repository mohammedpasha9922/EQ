import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8339;
const results = [];
const VENDOR = path.join(ROOT, '__pdfdiag', 'vendor');

function makeMultiPagePdfBytes() {
  const objs = [
    '',
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 6 0 R >> >> >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 7 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 6 0 R >> >> >>',
    '<< /Length 52 >>\nstream\nBT /F1 24 Tf 72 760 Td (EQ Preview Page ONE) Tj ET\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length 54 >>\nstream\nBT /F1 24 Tf 72 760 Td (EQ Preview Page TWO) Tj ET\nendstream'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i <= 7; i++) { offsets.push(pdf.length); pdf += `${i} 0 obj ${objs[i]} endobj\n`; }
  const xrefStart = pdf.length;
  pdf += `xref\n0 8\n0000000000 65535 f \n`;
  for (let i = 1; i <= 7; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
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
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${(!ok && detail) ? '  -> ' + detail : ''}`);
}
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
  }, Array.from(makeMultiPagePdfBytes()));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => {
    const t = document.getElementById('noteTitleInput'); if (t) t.value = 'Phase07 Anno';
    const body = document.getElementById('noteBodyInput'); if (body) body.textContent = 'Base note content';
  });
  await sleep(300);
  await page.evaluate(() => { const b = document.getElementById('notePreviewPdfBtn'); if (b) b.click(); });
  await page.waitForSelector('#notePdfPreviewModal.show', { visible: true, timeout: 15000 });
  await page.waitForFunction(() => (document.getElementById('notePdfPageIndicator') || {}).textContent === '1 / 2', { timeout: 25000 });
  await page.waitForFunction(() => { const c = document.getElementById('notePdfPreviewCanvas'); return c && c.width > 300; }, { timeout: 10000 });
  await page.waitForFunction(() => { const r = document.getElementById('notePdfAnnoLayer').getBoundingClientRect(); return r.width > 0 && r.height > 0; }, { timeout: 10000 });
  await sleep(300);

  const layerRect = async () => {
    const r = await page.evaluate(() => { let r = document.getElementById('notePdfAnnoLayer').getBoundingClientRect(); if (!r.width) r = document.getElementById('notePdfPreviewCanvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    return r;
  };
  const noteBoxes = () => page.evaluate(() => Array.from(document.querySelectorAll('#notePdfAnnoTextBoxes .note-pdf-anno-textbox')).map((b) => ({ cls: b.className, text: b.textContent || '', r: (() => { const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })() })) );
  const chipState = () => page.evaluate(() => { const c = document.getElementById('notePdfAnnoDeleteChip'); return c ? { hidden: c.hidden } : null; });

  // A) Note tool: select 📝, click on page, type Arabic + English.
  check('New 📝 Note inline button present', await page.evaluate(() => !!document.getElementById('notePdfAnnoNoteBtn')));
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoNoteBtn'); b.click(); });
  await sleep(120);
  let lr = await layerRect();
  await page.mouse.click(lr.x + lr.w * 0.35, lr.y + lr.h * 0.4);
  await sleep(300);
  let bs = await noteBoxes();
  const noteBoxCreated = bs.filter((b) => b.cls.includes('note-pdf-anno-notebox')).length;
  check('Note tool creates a 📝 note box on the page', noteBoxCreated === 1, JSON.stringify(bs));
  await page.keyboard.type('مرحبا Hello 123');
  await sleep(250);
  bs = await noteBoxes();
  const noteLabel = bs.filter((b) => b.cls.includes('note-pdf-anno-notebox')).map((b) => b.text);
  check('Note supports Arabic + English + numbers (RTL/LTR)', noteLabel.length === 1 && /مرحبا/.test(noteLabel[0]) && /Hello/.test(noteLabel[0]) && /123/.test(noteLabel[0]), JSON.stringify(noteLabel));
// B) Selection: switch to edit, click the note box -> delete chip should appear.
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoEditBtn'); b.click(); });
  await sleep(120);
  bs = await noteBoxes();
  const nb = bs[0];
  if (nb) { await page.mouse.click(nb.r.x + nb.r.w / 2, nb.r.y + nb.r.h / 2); await sleep(250); }
  const chipv = await chipState();
  check('Clicking the note selects it and reveals the delete chip (selection model)', chipv === null ? false : !chipv.hidden, JSON.stringify(chipv));

  // C) Move: drag the selected note via its box and compare position.
  bs = await noteBoxes();
  const before = bs[0] ? bs[0].r : null;
  if (before) {
    await page.mouse.move(before.x + before.w / 2, before.y + before.h / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.w / 2 + 40, before.y + before.h / 2 + 25, { steps: 6 });
    await page.mouse.up();
    await sleep(250);
  }
  bs = await noteBoxes();
  const after = bs[0] ? bs[0].r : null;
  check('Note can be moved (drag on page)', before && after && Math.abs(after.x - before.x) > 10, JSON.stringify({ before, after }));

  // D) Delete chip removes the annotation (no orphaned state).
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoEditBtn'); b.click(); });
  await sleep(120);
  bs = await noteBoxes();
  const nbDel = bs[0];
  if (nbDel) { await page.mouse.click(nbDel.r.x + nbDel.r.w / 2, nbDel.r.y + nbDel.r.h / 2); await sleep(200); }
  const chipv2 = await chipState();
  if (chipv2 && !chipv2.hidden) { await page.evaluate(() => { document.getElementById('notePdfAnnoDeleteChip').click(); }); await sleep(300); }
  bs = await noteBoxes();
  check('Delete chip removes the selected annotation', bs.filter((b) => b.cls.includes('note-pdf-anno-notebox')).length === 0, JSON.stringify(bs));

  // E) Multi-page: add a shape on page 2 -> page 1 sees none, page 2 sees it.
  await page.evaluate(() => { const b = document.getElementById('notePdfNextPageBtn'); b.click(); });
  await page.waitForFunction(() => (document.getElementById('notePdfPageIndicator') || {}).textContent === '2 / 2', { timeout: 10000 });
  await sleep(300);
  lr = await layerRect();
  await page.evaluate(() => { const b = document.getElementById('notePdfAnnoRectBtn'); b.click(); });
  await sleep(120);
  await page.mouse.move(lr.x + lr.w * 0.4, lr.y + lr.h * 0.4);
  await page.mouse.down();
  await page.mouse.move(lr.x + lr.w * 0.55, lr.y + lr.h * 0.55, { steps: 6 });
  await page.mouse.up();
  await sleep(200);
  const p2Canvas = await page.evaluate(() => { const c = document.getElementById('notePdfAnnoCanvas'); try { return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v) => v !== 0); } catch(e){ return false; } });
  check('Shape (rectangle) works on page 2 and paints', p2Canvas, '');
  await page.evaluate(() => { const b = document.getElementById('notePdfPrevPageBtn'); b.click(); });
  await page.waitForFunction(() => (document.getElementById('notePdfPageIndicator') || {}).textContent === '1 / 2', { timeout: 10000 });
  // Wait for the page-transition re-render to actually clear the overlay canvas.
  try {
    await page.waitForFunction(() => { const c = document.getElementById('notePdfAnnoCanvas'); return c && c.width > 0 && !c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v) => v !== 0); }, { timeout: 8000 });
  } catch (e) {}
  await sleep(200);
  bs = await noteBoxes();
  const p1Canvas = await page.evaluate(() => { const c = document.getElementById('notePdfAnnoCanvas'); try { return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v) => v !== 0); } catch(e){ return false; } });
  check('Annotations stay associated with their own page (page 1 clean)', bs.filter((b) => b.cls.includes('note-pdf-anno-notebox')).length === 0 && !p1Canvas, JSON.stringify({ boxes: bs.length, painted: p1Canvas }));
  // F) Zoom: shape must not drift off the canvas after zoom in/out/fit.
  await page.evaluate(() => { document.getElementById('notePdfNextPageBtn').click(); });
  await page.waitForFunction(() => (document.getElementById('notePdfPageIndicator') || {}).textContent === '2 / 2', { timeout: 10000 });
  await sleep(300);
  const waitForAligned = () => page.waitForFunction(() => {
    const layer = document.getElementById('notePdfAnnoLayer').getBoundingClientRect();
    const cv = document.getElementById('notePdfPreviewCanvas').getBoundingClientRect();
    return Math.abs(Math.round(layer.width) - Math.round(cv.width)) <= 3 && Math.abs(Math.round(layer.height) - Math.round(cv.height)) <= 3;
  }, { timeout: 8000 }).catch(() => { /* fall through; measurement follows */ });
  const aligned = async () => page.evaluate(() => {
    const layer = document.getElementById('notePdfAnnoLayer').getBoundingClientRect();
    const cv = document.getElementById('notePdfPreviewCanvas').getBoundingClientRect();
    return { layer: { w: Math.round(layer.width), h: Math.round(layer.height) }, canvas: { w: Math.round(cv.width), h: Math.round(cv.height) }, close: Math.abs(Math.round(layer.width) - Math.round(cv.width)) <= 3 && Math.abs(Math.round(layer.height) - Math.round(cv.height)) <= 3 };
  });
  let a0 = await aligned();
  check('Overlay aligns to the PDF canvas (initial)', a0.close, JSON.stringify(a0));
  await page.evaluate(() => { document.getElementById('notePdfZoomInBtn').click(); });
  await waitForAligned();
  a0 = await aligned();
  check('Overlay stays aligned after Zoom In (no drift)', a0.close, JSON.stringify(a0));
  await page.evaluate(() => { document.getElementById('notePdfZoomOutBtn').click(); document.getElementById('notePdfZoomOutBtn').click(); });
  await waitForAligned();
  a0 = await aligned();
  check('Overlay stays aligned after Zoom Out (no drift)', a0.close, JSON.stringify(a0));
  await page.evaluate(() => { document.getElementById('notePdfZoomFitBtn').click(); });
  await waitForAligned();
  a0 = await aligned();
  check('Overlay stays aligned after Fit (no drift)', a0.close, JSON.stringify(a0));

  // G) Lifecycle: close then reopen -> annotations cleared (no stale from another PDF).
  await page.evaluate(() => { document.getElementById('notePdfPreviewClose').click(); });
  await sleep(350);
  await page.evaluate(() => { const b = document.getElementById('notePreviewPdfBtn'); b.click(); });
  await page.waitForSelector('#notePdfPreviewModal.show', { visible: true, timeout: 15000 });
  await page.waitForFunction(() => (document.getElementById('notePdfPageIndicator') || {}).textContent === '1 / 2', { timeout: 25000 });
  await sleep(400);
  bs = await noteBoxes();
  const p1NewCanvas = await page.evaluate(() => { const c = document.getElementById('notePdfAnnoCanvas'); try { return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v) => v !== 0); } catch(e){ return false; } });
  check('Reopening preview starts clean (no stale annotations)', bs.length === 0 && !p1NewCanvas, JSON.stringify({ boxes: bs.length, painted: p1NewCanvas }));

  const finalErrors = pageErrors.filter((e) => !e.includes('attribute d') && !e.includes('404'));
  check('No new JavaScript errors from Phase 07 flow', finalErrors.length === 0, finalErrors.join(' ;; '));
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n==== PHASE 07 RUNTIME: ${pass} passed, ${fail} failed, ${results.length} total ====`);
  process.exit(pass === results.length ? 0 : 1);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}