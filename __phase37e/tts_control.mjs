// PHASE 37E CONTROL — same Kurdish scenario, served with the PRE-FIX app.js.
// Purpose: prove the console errors seen during the fix test are PRE-EXISTING
// and not introduced by the Kurdish TTS change.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8339;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  // CONTROL: app.js is served pre-fix; SpeechEngine served with the ku key stripped.
  if (urlPath === '/app.js') urlPath = '/__phase37e/app_prefix.js';
  if (urlPath === '/src/core/SpeechEngine.js') urlPath = '/__phase37e/engine_prefix.js';
  const fp = path.join(ROOT, urlPath);
  try { const d = fs.readFileSync(fp); res.writeHead(200, { 'Content-Type': mimeOf(fp) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 120000);

const pageErrors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + String(e && e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
for (let i = 0; i < 40; i++) { try { const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent); if (d === '0') break; } catch (e) {} await sleep(350); }
await page.evaluate((l) => { const s = document.getElementById('topBarLanguageSelect'); s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }, 'ku');
await sleep(250);
// same interactions as the fix test: speaker + history + drawer icons
await page.evaluate(() => document.getElementById('speechButton')?.click());
await sleep(400);
const t = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); }, sel);
await t('.keypad-btn.number[data-value="2"]');
await t('.keypad-btn.operator[data-value="+"]');
await t('.keypad-btn.number[data-value="3"]');
await t('.keypad-btn.equals');
await sleep(250);
await page.evaluate(() => document.getElementById('historyToggle')?.click());
await sleep(400);
await page.evaluate(() => { const btns = [...document.querySelectorAll('.history-speak-btn')].filter((b) => b.offsetParent !== null); if (btns.length) btns[0].click(); });
await sleep(400);

console.log('CONTROL (pre-fix) error list:');
const uniq = [...new Set(pageErrors)];
uniq.forEach((e) => console.log('  - ' + e.slice(0, 160)));
console.log('CONTROL TOTAL ERRORS: ' + pageErrors.length);
await browser.close();
server.close();
