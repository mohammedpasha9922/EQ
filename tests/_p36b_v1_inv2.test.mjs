import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8404;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
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
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 200)));
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => document.body && document.body.getAttribute('data-pdf-v1') === '1', { timeout: 30000 });
const txtPath = path.join(ROOT, 'tests', '_p36b_tmp_invalid3.txt');
fs.writeFileSync(txtPath, 'this is not a pdf');
await page.evaluate(() => { document.querySelector('[data-action="open-pdf-reports"]')?.click(); });
await new Promise((r) => setTimeout(r, 500));
const [ch] = await Promise.all([
  page.waitForFileChooser({ timeout: 15000 }),
  page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); })
]);
await ch.accept([txtPath]);
await new Promise((r) => setTimeout(r, 1800));
const st = await page.evaluate(() => ({
  importHidden: document.getElementById('smartImportView')?.getAttribute('aria-hidden'),
  errStageHidden: document.getElementById('importStageError')?.hasAttribute('hidden'),
  errText: (document.getElementById('importErrorText')?.textContent || '').slice(0, 140),
  editorHidden: document.getElementById('smartEditorView')?.getAttribute('aria-hidden')
}));
console.log('INVALID2=' + JSON.stringify(st));
console.log('ERRORS=' + JSON.stringify(errors.slice(0, 10)));
await browser.close();
server.close();
