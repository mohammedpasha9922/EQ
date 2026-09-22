// VERIFICATION ONLY — DO NOT MODIFY PRODUCTION CODE
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8259;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

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
const errors = [];
function check(name, ok, detail = '') {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await import('puppeteer-core').then((m) =>
  m.default.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'],
  })
);
const pageErrors = [];

async function probe(width, dir, locale) {
  const tag = `${width}/${dir}${locale ? '/' + locale : ''}`;
  const page = await browser.newPage();
  const pe = [];
  page.on('pageerror', (e) => pe.push(`${tag}: ${String(e && e.message || e)}`));
  await page.setViewport({ width, height: 860 });
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 });

  if (dir === 'rtl' || locale) {
    await page.evaluate((d, loc) => {
      document.documentElement.dir = d;
      document.documentElement.lang = loc || d === 'rtl' ? 'ar' : 'en';
      if (loc) document.body.setAttribute('data-language', loc);
    }, dir, locale);
  }

  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) {
    ok = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent === '0');
    if (!ok) await sleep(400);
  }
  check(`[${tag}] app boots`, ok);
  if (!ok) { await page.close(); return; }

  const widths = await page.evaluate(() => {
    const eq = document.querySelector('.keypad-btn.equals');
    const zero = document.querySelector('.keypad-btn.number[data-value="0"]');
    const dot = document.querySelector('.keypad-btn.number[data-value="."]');
    const grid = document.querySelector('.keypad-grid');
    const eqR = eq.getBoundingClientRect();
    const zeroR = zero.getBoundingClientRect();
    const dotR = dot.getBoundingClientRect();
    const gridR = grid.getBoundingClientRect();
    const row = document.querySelector('.control-row-3');
    const rowR = row ? row.getBoundingClientRect() : null;
    return {
      zeroW: zeroR.width,
      dotW: dotR.width,
      eqW: eqR.width,
      gridW: gridR.width,
      rowW: rowR ? rowR.width : null,
      rowLeft: rowR ? rowR.left - gridR.left : null,
      rowRight: rowR ? gridR.right - rowR.right : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  const equal = (Math.abs(widths.zeroW - widths.dotW) < 0.5) && (Math.abs(widths.dotW - widths.eqW) < 0.5);
  check(`[${tag}] 0/./= exactly equal width`, equal,
    `0=${widths.zeroW.toFixed(2)} .=${widths.dotW.toFixed(2)} ===${widths.eqW.toFixed(2)}`);

  const rowFills = (widths.rowLeft ?? 999) <= 2 && (widths.rowRight ?? 999) <= 2;
  check(`[${tag}] bottom row fills grid (no side gap)`, rowFills,
    `L=${(widths.rowLeft ?? -1).toFixed(1)} R=${(widths.rowRight ?? -1).toFixed(1)} rowW=${widths.rowW?.toFixed(1) ?? 'null'} gridW=${widths.gridW.toFixed(1)}`);

  check(`[${tag}] no horizontal overflow`, widths.overflowX <= 0, `overflow=${widths.overflowX}px`);

  // "=" clickable/functional: 2+3=5
  await page.evaluate(() => {
    document.querySelector('.keypad-btn.number[data-value="2"]').click();
    document.querySelector('.keypad-btn.operator[data-value="+"]').click();
    document.querySelector('.keypad-btn.number[data-value="3"]').click();
    document.querySelector('.keypad-btn.equals').click();
  });
  await sleep(300);
  const d1 = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check(`[${tag}] "=" works (2+3=5)`, d1.includes('5'), d1);

  // 0.5 + 0.5 = 1
  await page.evaluate(() => {
    const clear = document.querySelector('.keypad-btn.function.control-btn[data-action="clear"], .control-btn[data-action="clear"]');
    if (clear) clear.click();
    document.querySelector('.keypad-btn.number[data-value="0"]').click();
    document.querySelector('.keypad-btn.number[data-value="."]').click();
    document.querySelector('.keypad-btn.number[data-value="5"]').click();
    document.querySelector('.keypad-btn.operator[data-value="+"]').click();
    document.querySelector('.keypad-btn.number[data-value="0"]').click();
    document.querySelector('.keypad-btn.number[data-value="."]').click();
    document.querySelector('.keypad-btn.number[data-value="5"]').click();
    document.querySelector('.keypad-btn.equals').click();
  });
  await sleep(300);
  const d2 = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check(`[${tag}] 0.5 + 0.5 = 1`, d2.includes('1'), `display=${d2}`);

  await page.close();
  if (pe.length) pageErrors.push(...pe);
}

await probe(768, 'ltr');
await probe(768, 'rtl');
await probe(430, 'ltr');
await probe(430, 'rtl');
await probe(360, 'ltr');
await probe(360, 'rtl');

await probe(390, 'rtl', 'ku');
await probe(360, 'rtl', 'ku');

check('no JS errors', pageErrors.length === 0, pageErrors.slice(0, 400).join('; '));
await browser.close();
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);

