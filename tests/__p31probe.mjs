// PART 31 probe — load the real index.html in Chrome, report page errors and
// whether the smart seams + PART 31 preview elements exist.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8399;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 90000);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 120000, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type === 'error') errs.push('CONSOLE:' + String((m.text) || m)); });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await new Promise((r) => setTimeout(r, 2000));
const info = await page.evaluate(() => ({
  docName: typeof window.__smartDocName,
  pdfExport: typeof window.__smartPdfExport,
  pdfShare: typeof window.__smartPdfShare,
  smartBlank: typeof window.__smartBlank,
  saveBtn: !!document.getElementById('smartPdfSaveBtn'),
  previewTitle: !!document.getElementById('smartPdfPreviewTitle'),
  previewNote: !!document.getElementById('smartPdfPreviewNote'),
  previewGallery: !!document.getElementById('smartPdfPreviewPages'),
  openBtn: !!document.getElementById('smartPdfOpenBtn'),
  shareBtn: !!document.getElementById('smartPdfShareBtn'),
  closeBtn: !!document.getElementById('smartPdfResultCloseBtn')
}));
fs.writeFileSync(path.join(ROOT, '__p31probe.txt'), JSON.stringify({ info, errs }, null, 2));
await browser.close();
server.close();
process.exit(0);