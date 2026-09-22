// Focused probe: 390/rtl Paste repeated 4x to check flake vs real failure.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8249;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]) || '/index.html';
  if (p === '/') p = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
await (await browser.defaultBrowserContext()).overridePermissions(URL_, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);

for (let i = 1; i <= 4; i++) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 860 });
  await page.goto(URL_, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar'; });
  for (let j = 0; j < 30; j++) {
    if (await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent === '0')) break;
    await sleep(400);
  }
  await page.evaluate(async () => { await navigator.clipboard.writeText('42'); });
  await sleep(100);
  const pd = await page.evaluate(() => {
    document.querySelector('.control-row-3 .control-btn[data-action="paste"]').click();
    return document.querySelector('#primaryDisplay').textContent.trim();
  });
  await sleep(500);
  const after = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  console.log(`iter ${i}: immediate=[${pd}] after500ms=[${after}] -> ${after === '42' ? 'PASS' : 'FAIL'}`);
  await page.close();
}
await browser.close();
process.exit(0);