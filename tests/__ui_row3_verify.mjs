// Scoped behavioral verification: control-row-3 (Backspace/Copy/Paste) equal-width row.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8247;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]) || '/index.html';
  if (p === '/') p = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p)] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 240000);

let fails = 0;
function check(name, ok, detail = '') {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const pageErrors = [];

// Grant clipboard permissions for copy/paste behavioral checks.
const context = await browser.defaultBrowserContext();
await context.overridePermissions(URL_.replace(/\/$/, ''), ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);

async function probe(width, dir) {
  const tag = `${width}/${dir}`;
  const page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${tag}: ${String(e && e.message || e)}`));
  await page.setViewport({ width, height: 860 });
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate((d) => {
    document.documentElement.dir = d;
    document.documentElement.lang = d === 'rtl' ? 'ar' : 'en';
  }, dir);
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) {
    ok = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent === '0');
    if (!ok) await sleep(400);
  }
  check(`[${tag}] app boots`, ok);
  if (!ok) { await page.close(); return; }
  const s = await page.evaluate(() => {
    const row = document.querySelector('.control-row-3');
    const cs = getComputedStyle(row);
    const rowR = row.getBoundingClientRect();
    const grid = document.querySelector('.keypad-grid');
    const gridR = grid.getBoundingClientRect();
    const btns = [...row.querySelectorAll('.control-btn')];
    const bR = btns.map((b) => b.getBoundingClientRect());
    return {
      display: cs.display, gap: cs.columnGap, span: cs.gridColumn,
      rowW: rowR.width, gridW: gridR.width,
      btnCount: btns.length,
      btnActions: btns.map((b) => b.dataset.action),
      btnWidths: bR.map((r) => r.width),
      firstBtnLeft: bR[0].left, firstBtnRight: bR[0].right,
      lastBtnLeft: bR[bR.length - 1].left, lastBtnRight: bR[bR.length - 1].right,
      gridLeft: gridR.left, gridRight: gridR.right,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });

  check(`[${tag}] row spans full 4-col grid`, s.rowW >= s.gridW - 2, `rowW=${s.rowW.toFixed(1)} gridW=${s.gridW.toFixed(1)}`);
  check(`[${tag}] grid-column: span 4`, /span 4/.test(s.span), s.span);
  check(`[${tag}] display: flex`, s.display === 'flex', s.display);
  check(`[${tag}] gap: 8px`, s.gap === '8px', s.gap);
  check(`[${tag}] 3 buttons backspace/copy/paste`, s.btnCount === 3 && JSON.stringify(s.btnActions) === '["backspace","copy","paste"]', JSON.stringify(s.btnActions));
  const [w1, w2, w3] = s.btnWidths;
  check(`[${tag}] buttons exactly equal width`, Math.abs(w1 - w2) < 0.5 && Math.abs(w2 - w3) < 0.5, s.btnWidths.map((x) => x.toFixed(2)).join('/'));
  const edgeL = Math.abs(Math.min(s.firstBtnLeft, s.lastBtnLeft) - s.gridLeft);
  const edgeR = Math.abs(Math.max(s.firstBtnRight, s.lastBtnRight) - s.gridRight);
  check(`[${tag}] no left/right empty space`, edgeL <= 2 && edgeR <= 2, `L=${edgeL.toFixed(1)} R=${edgeR.toFixed(1)}`);
  check(`[${tag}] no horizontal overflow`, s.overflowX <= 0, `overflow=${s.overflowX}px`);

  // "=" row unchanged
  const k = await page.evaluate(() => {
    const eqR = document.querySelector('.keypad-btn.equals').getBoundingClientRect();
    const gridR = document.querySelector('.keypad-grid').getBoundingClientRect();
    const zeroR = document.querySelector('.keypad-btn.number[data-value="0"]').getBoundingClientRect();
    const dotR = document.querySelector('.keypad-btn.number[data-value="."]').getBoundingClientRect();
    return {
      eqW: eqR.width, zeroW: zeroR.width,
      rowMin: Math.min(zeroR.left, dotR.left, eqR.left),
      rowMax: Math.max(zeroR.right, dotR.right, eqR.right),
      gridLeft: gridR.left, gridRight: gridR.right
    };
  });
  const eL = Math.abs(k.rowMin - k.gridLeft), eR = Math.abs(k.rowMax - k.gridRight);
  check(`[${tag}] "=" spans 1 col (equal width)`, k.eqW === k.zeroW && eL <= 2 && eR <= 2, `eqW=${k.eqW.toFixed(1)} zeroW=${k.zeroW.toFixed(1)} L=${eL.toFixed(1)} R=${eR.toFixed(1)}`);

  // functionality: = / backspace / copy / paste
  await page.evaluate(() => {
    document.querySelector('.keypad-btn.number[data-value="2"]').click();
    document.querySelector('.keypad-btn.operator[data-value="+"]').click();
    document.querySelector('.keypad-btn.number[data-value="3"]').click();
    document.querySelector('.keypad-btn.equals').click();
  });
  await sleep(300);
  const d1 = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check(`[${tag}] "=" works: 2+3=5`, d1.includes('5'), d1);

  // Backspace: clear, enter 123, backspace -> 12 (same pattern as existing suite)
  await page.evaluate(() => {
    document.querySelector('.keypad-btn.function.control-btn[data-action="clear"], .control-btn[data-action="clear"]').click();
    document.querySelector('.keypad-btn.number[data-value="1"]').click();
    document.querySelector('.keypad-btn.number[data-value="2"]').click();
    document.querySelector('.keypad-btn.number[data-value="3"]').click();
    document.querySelector('.control-row-3 .control-btn[data-action="backspace"]').click();
  });
  await sleep(300);
  const d2 = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check(`[${tag}] Backspace button works (123->12)`, d2.includes('12'), d2);

  // Copy
  let copyOK = false, clip = '';
  try {
    await page.evaluate(() => {
      document.querySelector('.control-btn[data-action="clear"]').click();
      document.querySelector('.keypad-btn.number[data-value="7"]').click();
    });
    await sleep(150);
    await page.evaluate(() => document.querySelector('.control-row-3 .control-btn[data-action="copy"]').click());
    await sleep(500);
    clip = await page.evaluate(() => navigator.clipboard.readText());
    copyOK = clip.trim() === '7';
  } catch (e) { clip = String(e.message || e).slice(0, 80); }
  check(`[${tag}] Copy button works (clipboard='7')`, copyOK, `clipboard=[${clip}]`);

  // Paste — seed clipboard reliably via the app's own Copy button (headless
  // navigator.clipboard.writeText does not always commit), then clear and paste.
  let pasteOK = false, pd = '';
  try {
    await page.evaluate(() => {
      document.querySelector('.control-btn[data-action="clear"]').click();
      document.querySelector('.keypad-btn.number[data-value="4"]').click();
      document.querySelector('.keypad-btn.number[data-value="2"]').click();
      document.querySelector('.control-row-3 .control-btn[data-action="copy"]').click(); // clipboard = '42'
    });
    await sleep(400);
    await page.evaluate(() => {
      document.querySelector('.control-btn[data-action="clear"]').click(); // display back to 0
      document.querySelector('.control-row-3 .control-btn[data-action="paste"]').click();
    });
    await sleep(600);
    pd = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
    pasteOK = pd.includes('42');
  } catch (e) { pd = String(e.message || e).slice(0, 80); }
  check(`[${tag}] Paste button works (display 42)`, pasteOK, `display=[${pd}]`);

  await page.close();
}

await probe(1280, 'ltr'); // desktop
await probe(1280, 'rtl');
await probe(390, 'ltr');
await probe(390, 'rtl');
await probe(360, 'ltr');
await probe(360, 'rtl');

check('no JavaScript errors', pageErrors.length === 0, pageErrors.join('; ').slice(0, 400));
await browser.close();
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
