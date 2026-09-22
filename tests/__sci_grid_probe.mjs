import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = 8275;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, u)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(u).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + PORT + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message || e)));
await page.setViewport({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 30; i++) { try { if (await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent) === '0') break; } catch (e) {} await sleep(300); }
await page.evaluate(() => document.querySelector('#scientificToggle').click()); await sleep(300);
const sci = (v) => page.evaluate((x) => { [...document.querySelectorAll('.scientific-btn')].find((q) => q.getAttribute('data-scientific') === x).click(); }, v);
const num = (v) => page.evaluate((x) => document.querySelector('.keypad-btn.number[data-value="' + x + '"]').click(), v);
const eq = () => page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
const read = () => page.evaluate(() => document.querySelector('#primaryDisplay').textContent);
const expr = () => page.evaluate(() => (window.calcState && (window.calcState.expression ?? window.calcState.currentExpression)) ?? 'n/a');
// sin flow
await page.evaluate(() => document.querySelector('.control-btn[data-action="clear"]').click());
await sci('sin'); await num('3'); await num('0'); await sci(')');
console.log('display before =:', await read());
await eq();
console.log('display after =:', await read());
console.log('expr:', await expr());
// also try sin( without explicit close
await page.evaluate(() => document.querySelector('.control-btn[data-action="clear"]').click());
await sci('sin'); await num('3'); await num('0'); await eq();
console.log('sin(30 no-close) =', await read());
console.log('pageerrors:', errs);
await browser.close(); server.close(); process.exit(0);