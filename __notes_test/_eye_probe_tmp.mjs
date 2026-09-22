// TEMP PROBE — diagnose page.click('#notePdfNextPageBtn') "not clickable" (delete after Eye/Preview verification)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8339; const VENDOR = path.join(ROOT, '__pdfdiag', 'vendor');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function makeTwoPagePdfBytes() {
  const s = (t) => `BT /F1 24 Tf 72 760 Td (${t}) Tj ET`;
  let pdf = '%PDF-1.4\n'; const off = {};
  for (let i = 1; i <= 7; i++) off[i] = pdf.length;
  const dict = (n, b) => { pdf += `${n} 0 obj ${b} endobj\n`; };
  const strm = (n, body) => { pdf += `${n} 0 obj << /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream\n`; };
  dict(1, '<< /Type /Catalog /Pages 2 0 R >>');
  dict(2, '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>');
  dict(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R >> >> >>');
  strm(4, s('EQPREV PAGE ONE')); dict(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  dict(6, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 7 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R >> >> >>');
  strm(7, s('EQPREV PAGE TWO'));
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
await new Promise(r => server.listen(PORT, r));
let browser;

try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url(); const isPdfJs = u.includes('pdf.min.js'); const isW = u.includes('pdf.worker') || u.includes('workerSrc');
    const isH = u.includes('h2pdf') || u.includes('html2pdf') || (u.includes('jsdelivr') && u.includes('pdf'));
    if (isW || (isPdfJs && !u.startsWith('http://127.0.0.1')) || isH) {
      const f = isW ? 'pdf.worker.min.js' : (isPdfJs ? 'pdf.min.js' : 'h2pdf.js'); const fp = path.join(VENDOR, f);
      try { const d = fs.readFileSync(fp); req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', body: d }); } catch (e) { req.continue(); }
    } else { req.continue(); }
  });
  const bytes = makeTwoPagePdfBytes();
  await page.evaluateOnNewDocument(b => {
    window.__pdfBlob = new Blob([new Uint8Array(b)], { type: 'application/pdf' });
    window.html2pdf = function () { const ch = { set() { return ch; }, from() { return ch; }, toPdf() { return ch; }, save() { return ch; }, output() { return Promise.resolve(window.__pdfBlob); } }; window.__pdfStubCalls = (window.__pdfStubCalls || 0) + 1; return ch; };
  }, Array.from(bytes));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(400);
  const pr = await page.evaluate(() => { const b = document.getElementById('notePreviewPdfBtn'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.mouse.click(pr.x + pr.w / 2, pr.y + pr.h / 2);
  let ind = '';
  for (let i = 0; i < 20; i++) { ind = await page.evaluate(() => (document.getElementById('notePdfPageIndicator') || {}).textContent || ''); if (ind === '1 / 2') break; await sleep(150); }
  console.log('indicator after open =', JSON.stringify(ind));
  const probe = await page.evaluate(() => {
    const n = document.getElementById('notePdfNextPageBtn');
    if (!n) return { exists: false };
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    const svg = n.querySelector('svg');
    const sr = svg ? svg.getBoundingClientRect() : null;
    return { exists: true, disabled: n.disabled, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      display: cs.display, visibility: cs.visibility, pointerEvents: cs.pointerEvents,
      svgRect: sr ? { w: sr.width, h: sr.height } : null,
      modalShow: !!n.closest('.modal') && n.closest('.modal').classList.contains('show') };
  });
  console.log('NEXT BTN PROBE =', JSON.stringify(probe));
  const scrollProbe = await page.evaluate(() => {
    const n = document.getElementById('notePdfNextPageBtn');
    const m = document.getElementById('notePdfPreviewModal');
    const sc = m || n.closest('[style*="overflow"], .modal, .modal-content');
    // find actual scrollable ancestor chain
    const chain = [];
    let a = n.parentElement;
    while (a) { const cs = getComputedStyle(a); if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || a === document.scrollingElement) chain.push({ tag: a.tagName, id: a.id || null, cls: a.className || null, overflowY: cs.overflowY, scrollTop: a.scrollTop, scrollHeight: a.scrollHeight, clientHeight: a.clientHeight }); a = a.parentElement; }
    return { modalOverflowY: getComputedStyle(m).overflowY, modalScrollHeight: m.scrollHeight, modalClientHeight: m.clientHeight, chain };
  });
  console.log('SCROLL CHAIN =', JSON.stringify(scrollProbe));
  // Scroll the actual scrollable container so the button is in view, then REAL pointer hit-test.
  const afterScroll = await page.evaluate(() => {
    const n = document.getElementById('notePdfNextPageBtn');
    let a = n.parentElement, scrolled = null;
    while (a) { const cs = getComputedStyle(a); if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') { a.scrollTop = a.scrollHeight; scrolled = a.id || a.className; break; } if (a === document.body) { document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight; scrolled = 'document'; break; } a = a.parentElement; }
    n.scrollIntoView({ block: 'center' });
    const r = n.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { scrolled, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, coveredBy: top ? (top.id ? '#' + top.id : top.tagName + '.' + (top.className || '')) : null, hitIsSelf: !!(top && (top === n || n.contains(top))) };
  });
  console.log('AFTER SCROLL =', JSON.stringify(afterScroll));
  if (afterScroll.hitIsSelf) {
    const r2 = await page.evaluate(() => { const r = document.getElementById('notePdfNextPageBtn').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.click(r2.x, r2.y); await sleep(500);
    console.log('indicator after REAL mouse click =', JSON.stringify(await page.evaluate(() => (document.getElementById('notePdfPageIndicator') || {}).textContent || '')));
    // back to page 1 for symmetry
    const r3 = await page.evaluate(() => { const b = document.getElementById('notePdfPrevPageBtn'); const r = b.getBoundingClientRect(); b.scrollIntoView({ block: 'center' }); const rr = b.getBoundingClientRect(); return { x: rr.x + rr.width / 2, y: rr.y + rr.height / 2, disabled: b.disabled }; });
    if (!r3.disabled) { await page.mouse.click(r3.x, r3.y); await sleep(500); }
    console.log('indicator after Prev real click =', JSON.stringify(await page.evaluate(() => (document.getElementById('notePdfPageIndicator') || {}).textContent || '')));
  }
  console.log('PROBE DONE');
} catch (err) { console.error('PROBE ERROR:', err && err.message); }
finally { if (browser) await browser.close(); server.close(); }
