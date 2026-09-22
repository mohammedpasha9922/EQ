import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8399;
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
setTimeout(() => { console.error('TIMEOUT'); process.exit(124); }, 180000).unref();
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 200)));
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => document.body && document.body.getAttribute('data-pdf-v1') === '1', { timeout: 30000 });
await page.evaluate(async () => {
  if (!window.PDFLib) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const doc = await window.PDFLib.PDFDocument.create();
  doc.addPage([595, 842]);
  window.__tmpPdf = await doc.save();
});
const bytes = await page.evaluate(() => Array.from(window.__tmpPdf || []));
const pdfPath = path.join(ROOT, 'tests', '_p36b_tmp2.pdf');
fs.writeFileSync(pdfPath, Buffer.from(bytes));
await page.evaluate(() => { document.querySelector('[data-action="open-pdf-reports"]')?.click(); });
await new Promise((r) => setTimeout(r, 500));
const [chooser] = await Promise.all([
  page.waitForFileChooser({ timeout: 15000 }),
  page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); })
]);
await chooser.accept([pdfPath]);
await new Promise((r) => setTimeout(r, 2500));
const st = await page.evaluate(() => ({
  editorHidden: document.getElementById('smartEditorView')?.hasAttribute('hidden'),
  pages: (window.__smartImport && window.__smartImport.pageModel) ? window.__smartImport.pageModel().length : 'no-seam'
}));
console.log('OPENSTATE=' + JSON.stringify(st));
const addSave = await page.evaluate(async () => {
  const r = {};
  try {
    r.added = window.__smartImport.addItem('text');
    await new Promise((x) => setTimeout(x, 400));
    const blob = await window.__smartImport.editedBlob();
    r.blobSize = blob && blob.size;
    const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
    r.header = String.fromCharCode(...head);
  } catch (e) { r.err = String(e && e.message || e).slice(0, 300); }
  return r;
});
console.log('ADDSAVE=' + JSON.stringify(addSave));
const pages = await page.evaluate(async () => {
  const r = {};
  try {
    r.before = window.__smartImport.pageModel().length;
    const btn = (pact) => document.querySelector('#smartPdfPagesMenu [data-pact="' + pact + '"]');
    document.getElementById('smartPdfPagesBtn')?.click();
    await new Promise((x) => setTimeout(x, 300));
    r.btns = {
      add: !!(btn('add') && getComputedStyle(btn('add')).display !== 'none'),
      del: !!(btn('del') && getComputedStyle(btn('del')).display !== 'none'),
      rot: !!(btn('rot') && getComputedStyle(btn('rot')).display !== 'none'),
      dup: btn('dup') ? getComputedStyle(btn('dup')).display : 'missing'
    };
    btn('add')?.click(); await new Promise((x) => setTimeout(x, 800));
    r.afterAdd = window.__smartImport.pageModel().length;
    document.getElementById('smartPdfPagesBtn')?.click(); await new Promise((x) => setTimeout(x, 300));
    const rb = document.querySelector('#smartPdfPagesMenu [data-pact="rot"]');
    rb?.click(); await new Promise((x) => setTimeout(x, 800));
    r.afterRot = window.__smartImport.pageModel().length;
    document.getElementById('smartPdfPagesBtn')?.click(); await new Promise((x) => setTimeout(x, 300));
    const db = document.querySelector('#smartPdfPagesMenu [data-pact="del"]');
    db?.click(); await new Promise((x) => setTimeout(x, 800));
    r.afterDel = window.__smartImport.pageModel().length;
  } catch (e) { r.err = String(e && e.message || e).slice(0, 300); }
  return r;
});
console.log('PAGES=' + JSON.stringify(pages));
console.log('ERRORS=' + JSON.stringify(errors.slice(0, 10)));
await browser.close();
server.close();

