import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8401;
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
// warm: open smart docs once online, then go offline and repeat blank->edit->preview
await page.evaluate(() => { document.querySelector('[data-action="open-smart-docs"]')?.click(); });
await new Promise((r) => setTimeout(r, 600));
await page.evaluate(() => {
  const c = Array.from(document.querySelectorAll('.smart-doc-card')).find((b) => b.getAttribute('data-action') === 'smart-new-doc');
  if (c) c.click();
});
await new Promise((r) => setTimeout(r, 900));
await page.setOfflineMode(true);
await new Promise((r) => setTimeout(r, 300));
const off = await page.evaluate(() => ({
  gate: document.body.getAttribute('data-pdf-v1'),
  blankHidden: document.getElementById('smartBlankView')?.getAttribute('aria-hidden'),
  reviewBtn: !!document.getElementById('smartReviewBtn'),
  exportBtn: !!document.getElementById('smartPdfExportBtn')
}));
await page.evaluate(() => { document.getElementById('smartReviewBtn')?.click(); });
await new Promise((r) => setTimeout(r, 600));
const rev = await page.evaluate(() => ({
  barHidden: document.getElementById('smartReviewBar')?.hasAttribute('hidden')
}));
console.log('OFFLINE=' + JSON.stringify({ off, rev }));
console.log('ERRORS=' + JSON.stringify(errors.slice(0, 10)));
await browser.close();
server.close();
