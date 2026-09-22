import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const CHROME2 = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = 8271;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, u)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(u).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + PORT + '/';
setTimeout(() => process.exit(124), 150000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(n, ok, d) { results.push({ n, ok: !!ok, d: d || '' }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); }
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String((e && e.message) || e)));
async function boot(w, dir, lang) {
  await page.setViewport({ width: w, height: 900 });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  for (let i = 0; i < 30; i++) {
    try { const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent); if (d === '0') break; } catch (e) {}
    await sleep(400);
  }
  if (dir) await page.evaluate((o) => { document.documentElement.setAttribute('dir', o.dir); document.documentElement.setAttribute('lang', o.lang); }, { dir, lang });
  await page.evaluate(() => document.querySelector('#scientificToggle').click());
  await sleep(350);
}
async function gridAudit(label) {
  const g = await page.evaluate(() => {
    const panel = document.querySelector('#scientificPanel');
    const cs = getComputedStyle(panel);
    const pr = panel.getBoundingClientRect();
    const kg = document.querySelector('.keypad-grid').getBoundingClientRect();
    const btns = [...panel.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect();
      const c = getComputedStyle(b);
      return { t: b.textContent.trim(), x: r.left, y: r.top, w: r.width, h: r.height, pos: c.position, tr: c.transform };
    });
    const rows = {};
    btns.forEach((b) => { const k = Math.round(b.y); rows[k] = rows[k] || []; rows[k].push(b); });
    return { display: cs.display, cols: cs.gridTemplateColumns, gap: cs.columnGap, count: btns.length, open: panel.classList.contains('open'), panelW: pr.width, keypadW: kg.width, rows: Object.values(rows).map((r) => r.length), heights: btns.map((b) => Math.round(b.h)), btns, pl: Math.round(pr.left), prr: Math.round(pr.right), overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const nCols = g.cols.split(' ').filter(Boolean).length;
  check(label + ' panel open', g.open === true);
  check(label + ' display=grid', g.display === 'grid', g.display);
  check(label + ' 4 columns', nCols === 4, g.cols);
  check(label + ' gap=6px', g.gap === '6px', g.gap);
  check(label + ' rows<=4', g.rows.every((n) => n <= 4), 'rows=' + JSON.stringify(g.rows));
  const hs = g.heights; const hEq = (Math.max(...hs) - Math.min(...hs)) <= 2;
  check(label + ' equal heights', hEq, 'min=' + Math.min(...hs) + ' max=' + Math.max(...hs));
  let overlap = false;
  for (let i = 0; i < g.btns.length; i++) for (let j = i + 1; j < g.btns.length; j++) {
    const a = g.btns[i], b = g.btns[j];
    if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) { overlap = true; }
  }
  check(label + ' no overlap', !overlap);
  check(label + ' no h-overflow', g.overflowX <= 1, 'ox=' + g.overflowX);
  check(label + ' width matches keypad', Math.abs(g.panelW - g.keypadW) <= 3, 'p=' + Math.round(g.panelW) + ' k=' + Math.round(g.keypadW));
  check(label + ' buttons inside', g.btns.every((b) => b.x >= g.pl - 2 && (b.x + b.w) <= g.prr + 2));
  check(label + ' no absolute/transform', g.btns.every((b) => b.pos === 'static' && (b.tr === 'none' || b.tr === '')));
  return g;
}
async function funcAudit(label) {
  const tap = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) throw new Error('missing ' + s); b.click(); return document.querySelector('#primaryDisplay').textContent; }, sel);
  const eq = () => tap('.keypad-btn.equals');
  const clear = () => tap('.control-btn[data-action="clear"]');
  const num = (v) => tap('.keypad-btn.number[data-value="' + v + '"]');
  const sci = (v) => page.evaluate((x) => document.querySelector('.scientific-btn[data-scientific="' + x + '"]').click(), v);
  const read = () => page.evaluate(() => document.querySelector('#primaryDisplay').textContent);
  await clear(); await num('2'); await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="+"]').click()); await num('3'); await eq();
  let d = await read();
  check(label + ' basic 2+3=5 unchanged', d === '5', 'display=' + d);
  await clear(); await num('9');
  await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
  await eq(); d = await read();
  check(label + ' sqrt works', d === '3', 'display=' + d);
  await clear(); await sci('sin'); await num('3'); await num('0'); await sci(')'); await eq(); d = await read();
  check(label + ' sin(30)=0.5 works', d === '0.5', 'display=' + d);
  await clear(); await sci('pi'); await eq(); d = await read();
  check(label + ' pi works', /3\.14/.test(d), 'display=' + d);
  await page.evaluate(() => document.querySelector('#scientificToggle').click());
  await sleep(300);
  check(label + ' toggle closes', await page.evaluate(() => !document.querySelector('#scientificPanel').classList.contains('open')));
}
await boot(1280, 'ltr', 'en');
await gridAudit('[1280 LTR]');
await funcAudit('[1280 func]');
await boot(768, 'ltr', 'en');
await gridAudit('[768 LTR]');
for (const w of [430, 390, 360]) { await boot(w, 'ltr', 'en'); await gridAudit('[' + w + ' LTR]'); }
await boot(390, 'rtl', 'ar');
await gridAudit('[390 RTL ar]');
await funcAudit('[390 RTL func]');
await boot(390, 'rtl', 'ku');
await gridAudit('[390 RTL ku]');
check('no new JS page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log('RESULT: ' + (results.length - failed.length) + '/' + results.length + ' passed');
await browser.close(); server.close();
process.exit(failed.length ? 1 : 0);
