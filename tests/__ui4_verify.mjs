// UI-4 scoped verification — header/coins/control-row/equals only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8246;
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
setTimeout(() => process.exit(124), 180000);

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

async function probe(width, dir) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${width}/${dir}: ${String(e && e.message || e)}`));
  await page.setViewport({ width, height: 860 });
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) {
    ok = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent === '0');
    if (!ok) await sleep(400);
  }
  const tag = `${width}/${dir}`;
  if (!ok) { check(`[${tag}] app boots`, false); await page.close(); return; }
  check(`[${tag}] app boots`, true);


  const s = await page.evaluate(() => {
    const cs = (el) => el ? getComputedStyle(el) : null;
    const toggle = document.getElementById('drawerToggle');
    const bars = document.querySelector('#top-bar-actions i.fa-bars, header i.fa-bars');
    const coinsBtn = document.getElementById('currencyMenuButton');
    const navBtn = document.querySelector('#featureNavBar .feature-nav-btn');
    const cb = cs(coinsBtn), nb = cs(navBtn);
    const row = document.querySelector('.control-row-3');
    const rowRect = row.getBoundingClientRect();
    const rowBtns = [...row.querySelectorAll('.control-btn')].map((b) => {
      const r = b.getBoundingClientRect();
      return { w: r.width, left: r.left, right: r.right };
    });
    const eq = document.querySelector('.keypad-btn.equals');
    const grid = document.querySelector('.keypad-grid').getBoundingClientRect();
    const eqR = eq.getBoundingClientRect();
    const zero = document.querySelector('.keypad-btn.number[data-value="0"]');
    const zeroR = zero.getBoundingClientRect();
    const dotR = document.querySelector('.keypad-btn.number[data-value="."]').getBoundingClientRect();
    const lastRowMin = Math.min(zeroR.left, dotR.left, eqR.left);
    const lastRowMax = Math.max(zeroR.right, dotR.right, eqR.right);
    const gapPx = parseFloat(getComputedStyle(document.querySelector('.keypad-grid')).columnGap) || 0;
    const colW = (grid.width - 3 * gapPx) / 4; // 4 equal columns
    const spanOf = (w) => Math.round(w / (colW + gapPx)); // spans from real widths (RTL-safe)
    const minLeft = Math.min(...rowBtns.map((b) => b.left));
    const maxRight = Math.max(...rowBtns.map((b) => b.right));
    return {
      toggleAbsent: !toggle,
      barsAbsent: !bars,
      coinsBg: cb ? cb.backgroundColor + '|' + cb.backgroundImage : 'no-coins-btn',
      navBg: nb ? nb.backgroundColor + '|' + nb.backgroundImage : 'no-nav-btn',
      coinsW: cb ? cb.width : '-', coinsRadius: cb ? cb.borderRadius : '-', coinsShadow: cb ? cb.boxShadow : '-',
      navW: nb ? nb.width : '-',
      rowW: rowRect.width, rowLeft: rowRect.left, rowRight: rowRect.right,
      rowBtns, rowSpans: rowBtns.map((b) => spanOf(b.w)),
      gridRight: grid.right, gridW: grid.width, gridLeft: grid.left,
      eqSpan: spanOf(eqR.width), eqW: eqR.width, eqRight: eqR.right,
      zeroSpan: spanOf(document.querySelector('.keypad-btn.number[data-value="0"]').getBoundingClientRect().width),
      rowEdgeL: Math.abs(minLeft - grid.left), rowEdgeR: Math.abs(maxRight - grid.right),
      lastRowEdgeL: Math.abs(lastRowMin - grid.left), lastRowEdgeR: Math.abs(lastRowMax - grid.right),
      eqGap: Math.abs(eqR.right - grid.right),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });

  check(`[${tag}] burger/drawerToggle removed from DOM`, s.toggleAbsent && s.barsAbsent, `toggle=${s.toggleAbsent} barsIcon=${s.barsAbsent}`);
  check(`[${tag}] coins matches feature-nav background`, s.coinsBg === s.navBg, `coins=${s.coinsBg} nav=${s.navBg}`);
  check(`[${tag}] coins size/radius match nav`, s.coinsW === s.navW && s.coinsRadius === '10px', `w=${s.coinsW}/${s.navW} r=${s.coinsRadius}`);
  check(`[${tag}] coins no shadow`, s.coinsShadow === 'none', s.coinsShadow);

  check(`[${tag}] control row: 3 buttons spans 1/1/1 (equal width)`, s.rowBtns.length === 3 && s.rowSpans[0] === 1 && s.rowSpans[1] === 1 && s.rowSpans[2] === 1, `spans=${JSON.stringify(s.rowSpans)}`);
  const rowFills = s.rowEdgeL <= 2 && s.rowEdgeR <= 2;
  check(`[${tag}] control row fills full grid width (no side gap)`, rowFills, `edgeL=${s.rowEdgeL.toFixed(1)} edgeR=${s.rowEdgeR.toFixed(1)} rowW=${s.rowW.toFixed(1)} gridW=${s.gridW.toFixed(1)}`);

  check(`[${tag}] "=" spans 1 column (equal width)`, s.eqSpan === 1, `span=${s.eqSpan} w=${s.eqW.toFixed(1)}`);
  check(`[${tag}] last keypad row: 0 + . + = fill 4 cols equally`, s.zeroSpan === 1 && s.eqSpan === 1 && s.lastRowEdgeL <= 2 && s.lastRowEdgeR <= 2, `rowL=${s.lastRowEdgeL.toFixed(1)} rowR=${s.lastRowEdgeR.toFixed(1)} zeroSpan=${s.zeroSpan}`);

  check(`[${tag}] no horizontal overflow`, s.overflowX <= 0, `overflow=${s.overflowX}px`);


  // calculator functionality
  await page.evaluate(() => {
    document.querySelector('.keypad-btn.number[data-value="2"]').click();
    document.querySelector('.keypad-btn.operator[data-value="+"]').click();
    document.querySelector('.keypad-btn.number[data-value="3"]').click();
    document.querySelector('.keypad-btn.equals').click();
  });
  await sleep(300);
  const disp = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check(`[${tag}] calculator 2+3=5`, disp.includes('5'), disp);

  // backspace still works
  await page.evaluate(() => {
    document.querySelector('.control-btn[data-action="clear"]').click();
    document.querySelector('.keypad-btn.number[data-value="1"]').click();
    document.querySelector('.keypad-btn.number[data-value="2"]').click();
    document.querySelector('.keypad-btn.number[data-value="3"]').click();
    document.querySelector('.control-btn[data-action="backspace"]').click();
  });
  await sleep(200);
  const disp2 = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check(`[${tag}] backspace 123->12`, disp2.includes('12'), disp2);

  // currency button/menu functionality
  await page.evaluate(() => document.getElementById('currencyMenuButton').click());
  await sleep(400);
  const cur = await page.evaluate(() => {
    const pop = document.getElementById('currencyMenuPopover');
    return { open: pop.classList.contains('open'), items: pop.querySelectorAll('.currency-popover-item').length };
  });
  check(`[${tag}] currency menu opens with 4 options`, cur.open && cur.items === 4, `open=${cur.open} items=${cur.items}`);
  await page.close();
}

await probe(1280, 'ltr');
await probe(1280, 'rtl');
await probe(390, 'ltr');
await probe(390, 'rtl');
await probe(360, 'ltr');
await probe(360, 'rtl');

check('no page errors', pageErrors.length === 0, pageErrors.join('; ').slice(0, 300));
await browser.close();
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
