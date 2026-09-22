import puppeteerCore from 'puppeteer-core';
const puppeteer = { launch: (o) => puppeteerCore.launch({ ...o, executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' }) };
import http from 'http';
import fs from 'fs';
import path from 'path';
const ROOT = 'd:/Programs EQ7/EQ';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).slice(1));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); } });
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;
const DOC = [
  'INVOICE', '',
  'This invoice covers consulting services.',
  'Provided during August and includes support.', '',
  'Name: Mohammed', 'Date: 2026-08-01', 'Phone: +962 79 123 4567',
  'Total: 155000', 'Rate: 45.6', 'Discount: 20%', '',
  'Item      Qty      Price', 'Chair     4        120.50', 'Desk      2        350'
].join('\n');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--lang=en'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
page.on('console', () => {});
await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
await page.evaluate(() => {
  localStorage.setItem('eq-language', JSON.stringify({ code: 'en' }));
  const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 500));
await page.evaluate(() => { const c = document.getElementById('pdfScanCreateCard'); if (c) c.click(); });
await new Promise(r => setTimeout(r, 600));
await page.evaluate((doc) => { const w = window.__smartScan; w.debugMode('live'); w.reset(); w.open(); w.setOcrResult(doc); }, DOC);
for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 150)); if (await page.evaluate(() => { const c = document.getElementById('scanCaptureBtn'); return !!(c && !c.disabled); })) break; }
await page.evaluate(() => { document.getElementById('scanCaptureBtn')?.click(); });
await new Promise(r => setTimeout(r, 1500));
const m = await page.evaluate(() => {
  // shrink to 390 AFTER the panel was rendered at 1366 (harness order)
  return { iw: window.innerWidth, wide: [] };
});
await page.setViewport({ width: 390, height: 844 });
await new Promise(r => setTimeout(r, 500));
const m2 = await page.evaluate(() => {
  const modal = document.getElementById('smartDocsModal');
  const kids = [];
  for (const c of modal.children) {
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    kids.push({ tag: c.tagName, id: c.id || '', cls: String(c.className).slice(0, 45), w: Math.round(r.width), left: Math.round(r.left), display: cs.display, position: cs.position });
  }
  const csM = getComputedStyle(modal);
  return { kids, justify: csM.justifyContent, align: csM.alignItems, display: csM.display, overflow: csM.overflow };
});
console.log(JSON.stringify(m2, null, 1));
await browser.close();
