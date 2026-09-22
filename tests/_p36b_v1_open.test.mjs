import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8398;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
setTimeout(() => { console.error('TIMEOUT'); process.exit(124); }, 240000).unref();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// Build a minimal valid PDF in-page via the app's own pdfLib export path? Instead craft bytes directly.
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + String(m.text()).slice(0, 300)); });
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => document.body && document.body.getAttribute('data-pdf-v1') === '1', { timeout: 30000 });

// Generate a tiny valid PDF via CDN pdf-lib if online, else synthesize minimal %PDF- bytes for invalid-handling + save-header check
const gen = await page.evaluate(async () => {
  const out = { pdfLib: false };
  try {
    if (!window.PDFLib) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
        setTimeout(() => reject(new Error('cdn timeout')), 15000);
      });
    }
    out.pdfLib = !!window.PDFLib;
    if (window.PDFLib) {
      const doc = await window.PDFLib.PDFDocument.create();
      doc.addPage([595, 842]);
      const bytes = await doc.save();
      out.header = String.fromCharCode(...bytes.slice(0, 5));
      out.len = bytes.length;
      out.b64 = btoa(String.fromCharCode(...bytes.slice(0, Math.min(bytes.length, 200000))));
    }
  } catch (e) { out.err = String(e && e.message || e).slice(0, 200); }
  return out;
});
console.log('GEN=' + JSON.stringify({ header: gen.header, len: gen.len, pdfLib: gen.pdfLib, err: gen.err }));

// Open PDF workspace -> click Open PDF card with file chooser using generated PDF
let openResult = 'NOT RUN';
if (gen.b64) {
  const buf = Buffer.from(gen.b64, 'base64');
  fs.writeFileSync(path.join(ROOT, 'tests', '_p36b_tmp.pdf'), buf);
  await page.evaluate(() => { document.querySelector('[data-action="open-pdf-reports"]')?.click(); });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
  await new Promise((r) => setTimeout(r, 800));
  // file input created dynamically?
  const hasInput = await page.evaluate(() => !!document.querySelector('input[type="file"][accept*="pdf"], input[type="file"]'));
  openResult = 'hasInput=' + hasInput;
  const editorState = await page.evaluate(() => ({
    editorVisible: typeof smartEditorVisible === 'function' ? 'fn-missing-in-page-scope' : 'n/a',
    editorViewHidden: document.getElementById('smartEditorView') ? document.getElementById('smartEditorView').hasAttribute('hidden') : 'missing',
    docsOpen: document.getElementById('smartDocsModal')?.classList.contains('show')
  }));
  openResult += ' ' + JSON.stringify(editorState);
}
console.log('OPEN=' + openResult);

// Invalid PDF handling: feed garbage bytes to the import path via __smartImport if exposed
const invalid = await page.evaluate(async () => {
  const r = {};
  try {
    r.seam = (typeof window.__smartImport !== 'undefined') ? Object.keys(window.__smartImport) : 'no-seam';
  } catch (e) { r.err = String(e).slice(0, 200); }
  return r;
});
console.log('INVALID=' + JSON.stringify(invalid));
console.log('ERRORS=' + JSON.stringify(errors.slice(0, 10)));
await browser.close();
server.close();
