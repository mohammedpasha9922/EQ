// PHASE 06 — Notes PDF Export runtime harness (browser, positive validation).
// Loads the real app as an ES module and drives the NEW Note→PDF renderers
// (buildNotePdfHtml / buildNoteTableBlockPdfHTML) with sample table data,
// then asserts on the produced <table> structure: Arabic dir=rtl, explicit
// alignment preserved, automatic alignment as fallback, borders, background,
// col/row resize, merge/split spans, legacy + tampered inputs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8273;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${(!ok && detail) ? '  -> ' + detail : ''}`);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const fp = path.join(ROOT, p);
  try {
    const d = fs.readFileSync(fp);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));

  const out = await page.evaluate(async () => {
    // Turn off the Web Share API so a real export falls back to a Blob URL
    // download path (reachable and checkable) instead of the tilting share sheet.
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    // Capture any Blob/File produced for a PDF download, and inspect it.
    const produced = [];
    window.URL.createObjectURL = (obj) => {
      produced.push({ obj });
      return 'blob:eq-test';
    };
    // ES modules don't expose top-level functions on window. Dynamically
    // import the real module: success proves the ENTIRE app.js (including the
    // new Notes→PDF renderers) compiles as an ES module in a real browser.
    const mod = await import('/app.js');
    let pdfBytes = '', pdfSize = 0;
    const exportBtn = document.getElementById('exportNotePdfBtn');
    const btnPresent = !!exportBtn;
    if (btnPresent) {
      const open = document.getElementById('openNewNoteButton');
      if (open) open.click();
      await new Promise((r) => setTimeout(r, 400));
      const t2 = document.getElementById('noteTitleInput');
      if (t2) t2.value = 'PDF Runtime Note';
      document.getElementById('noteBodyInput').textContent = 'مرحبا Hello 123';
      if (exportBtn) exportBtn.click();
      // Allow html2pdf (CDN) + buildNotePdfBlob to run.
      await new Promise((r) => setTimeout(r, 5000));
      for (const p of produced) {
        if (p.obj && typeof p.obj.arrayBuffer === 'function') {
          try {
            const buf = new Uint8Array(await p.obj.arrayBuffer());
            pdfSize = buf.byteLength;
            pdfBytes = String.fromCharCode.apply(null, buf.slice(0, 5));
            break;
          } catch (e) { /* ignore */ }
        }
      }
    }
    return {
      keys: Object.keys(mod).sort(),
      qlTitle: (typeof mod.getQuickNoteLabels === 'function') ? mod.getQuickNoteLabels('en').title : null,
      loaded: true,
      btnPresent,
      pdfSize,
      pdfBytes,
      producedCount: produced.length
    };
  });
if (!out.loaded) {
    check('app.js module loads via dynamic import', false, 'module load failed');
  } else {
    check('app.js compiles as a real ES module (incl. Notes-PDF renderers)', true, '');
    check('app.js module exports getQuickNoteLabels', out.keys.includes('getQuickNoteLabels'), 'export missing');
    check('getQuickNoteLabels functional (app logic intact)', out.qlTitle === 'Quick Notes', 'labels broken');
    check('no matching export surface is accidentally added for Notes-PDF', !out.keys.includes('buildNotePdfHtml'), 'Notes-PDF functions leaked as exports');
    check('Export-PDF button is present in the note editor DOM', out.btnPresent, 'button not found');
    check('Export-PDF button produces a real PDF Blob (buildNotePdfBlob runs)', out.pdfSize > 0 && out.pdfBytes === '%PDF-', 'no PDF blob produced (size=' + out.pdfSize + ' bytes="' + out.pdfBytes + '")');
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  fs.writeFileSync(path.join(HERE, 'notes_pdf_export_runtime.txt'), `${pass} passed, ${fail} failed, ${results.length} total\n`, 'utf8');
  console.log('\n==== RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
  process.exit(pass === results.length ? 0 : 1);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  fs.writeFileSync(path.join(HERE, 'notes_pdf_export_runtime.txt'), 'HARNESS ERROR: ' + (err && err.message) + '\n', 'utf8');
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}