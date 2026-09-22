// PART ? — RESULT DISPLAY / TAFQEET / UI REGRESSION (REAL Chrome via Puppeteer)
// Scope (strict): result display formatting, decimal rounding-for-display,
// number-to-words input normalization, result result-screen responsive sizing/
// spacing, speaker-icon positioning guard. Does NOT touch the calc engine,
// History storage, or raw calculation values.
// Run:  node tests/result_display.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = 8412;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm', '.ttf': 'font/ttf',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  try {
    const d = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': mimeOf(p) + '; charset=utf-8' });
    res.end(d);
  } catch (e) {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;

// Auto-detect an installed Chromium-based browser.
const CHROME_CANDIDATES = [
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
const CHROME = CHROME_CANDIDATES.find((c) => fs.existsSync(c));
if (!CHROME) {
  console.error('No Chrome/Edge found; cannot run browser tests.');
  process.exit(2);
}

let pass = 0, fail = 0;
function check(name, cond, info) {
  if (cond) { pass++; console.log(`PASS  ${name}${info ? '  -> ' + info : ''}`); }
  else { fail++; console.log(`FAIL  ${name}  -> ${info || ''}`); }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 900));

// ---------------------------------------------------------------------------
// 1) PURE FORMAT + TAFQEET (real functions inside the browser via dynamic import)
// ---------------------------------------------------------------------------
const pure = await page.evaluate(async () => {
  const Fmt = await import('./src/core/DisplayFormat.js');
  const R = Fmt.resultNumberToWords;
  const c = (v, m) => Fmt.roundDisplayValue(v, m !== undefined ? m : 4);
  const out = {};
  out.r_2099 = c('2099.87654321098765', 4);
  out.r_dec2 = c('18243.956666666666', 2);
  out.r_int = c('25', 4);
  out.r_int00 = c('25.00', 4);
  out.r_big = c('1000000000', 4);
  out.r_neg = c('-25.00', 4);
  out.grp_big = Fmt.formatRounded('1000000000');
  out.grp_dec = Fmt.formatRounded('18243.96');
  out.w_en = R('18243.96', 'en');
  out.w_en_long = R(Fmt.roundDisplayValue('18243.956666666666', 2), 'en');
  out.w_ar = R(Fmt.roundDisplayValue('18243.956666666666', 2), 'ar');
  out.w_ar_rawtail = R('18243.9566662', 'ar'); // raw tail, helper must not spell it as a giant number
  return out;
});
check('fmt 2099.876543-4 -> 2099.8765', pure.r_2099 === '2099.8765', pure.r_2099);
check('fmt 18243.9566-2 -> 18243.96', pure.r_dec2 === '18243.96', pure.r_dec2);
check('fmt 25 -> 25 (no .00)', pure.r_int === '25', pure.r_int);
check('fmt 25.00 -> 25 (zeros trimmed)', pure.r_int00 === '25', pure.r_int00);
check('fmt 1000000000 -> 1000000000', pure.r_big === '1000000000', pure.r_big);
check('fmt -25.00 -> -25', pure.r_neg === '-25', pure.r_neg);
check('grp 1000000000 -> 1,000,000,000', pure.grp_big === '1,000,000,000', pure.grp_big);
check('grp 18243.96 -> 18,243.96', pure.grp_dec === '18,243.96', pure.grp_dec);
check('tfq en 18243.96 has and 96/100', /and 96\/100/.test(pure.w_en), pure.w_en);
check('tfq en long never giant', !/million|billion|trillion/.test(pure.w_en_long) && /\/100/.test(pure.w_en_long), pure.w_en_long);
check('tfq ar long has no مليون/مليار', !/(مليون|مليار|ترليون)/.test(pure.w_ar), pure.w_ar);
check('tfq ar long uses parts-of-100', /جزءًا من مئة/.test(pure.w_ar), pure.w_ar);
check('tfq ar raw long tail never a giant number', !/(مليون|مليار|ترليون)/.test(pure.w_ar_rawtail), pure.w_ar_rawtail);

// ---------------------------------------------------------------------------
// 2) REAL CALCULATOR (keyboard driven) — display rounded, raw preserved
// ---------------------------------------------------------------------------
await page.keyboard.press('Escape'); // AC
await page.keyboard.type('999/7');
await page.keyboard.press('Enter');  // =
await new Promise((r) => setTimeout(r, 250));
const calc1 = await page.evaluate(() => ({
  primary: document.getElementById('primaryDisplay').textContent,
  secondary: document.getElementById('secondaryDisplay').textContent
}));
check('UI 999/7 primary rounded (no 5+ decimals)', /^\d+\.\d{1,4}$/.test(calc1.primary), calc1.primary);
check('UI tafqeet en uses /100', /\/100/.test(calc1.secondary), calc1.secondary);
check('UI tafqeet en appends "only"', / only$/.test(calc1.secondary), calc1.secondary);

// Raw-preservation chain: 1/7 then *7 must remain ~1. If display rounding ever
// leaked into state.displayValue, the chain would drift off.
await page.keyboard.press('Escape');
await page.keyboard.type('1/7');
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 200));
await page.keyboard.press('*');
await page.keyboard.type('7');
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 250));
const chain = await page.evaluate(() => ({
  primary: document.getElementById('primaryDisplay').textContent
}));
check('chained 1/7*7 stays raw-precise', /^1(\.0+)?$/.test(chain.primary), chain.primary);

// Large integer grouping through the real calculator
await page.keyboard.press('Escape');
await page.keyboard.type('1000000000');
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 250));
const big = await page.evaluate(() => document.getElementById('primaryDisplay').textContent);
check('UI big integer grouped 1,000,000,000', big === '1,000,000,000', big);

// ---------------------------------------------------------------------------
// 3) UI OVERFLOW / SPEAKER-ICON OVERLAP at 5 widths x LTR + RTL
// ---------------------------------------------------------------------------
const widths = [1280, 768, 430, 390, 360];
for (const w of widths) {
  for (const loc of ['en', 'ar']) {
    await page.setViewport({ width: w, height: 800 });
    await page.evaluate((l) => {
      const html = document.documentElement;
      html.lang = l;
      html.dir = l === 'ar' ? 'rtl' : 'ltr';
      document.body.setAttribute('data-language', l);
      document.getElementById('primaryDisplay').textContent =
        '1,000,000,000.123456789012345678901234567890';
    }, loc);
    await new Promise((r) => setTimeout(r, 120));
    const m = await page.evaluate(() => {
      const prim = document.getElementById('primaryDisplay');
      const btn = document.getElementById('speechButton');
      const secEl = document.querySelector('.display-section');
      const secRect = secEl.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      // Measure the RENDERED TEXT (Range), not the element box, so the padded
      // (reserved) content area is what we compare against the icon.
      const range = document.createRange();
      range.selectNodeContents(prim);
      const tRect = range.getBoundingClientRect();
      const overlap = !(tRect.right <= bRect.left || tRect.left >= bRect.right ||
                        tRect.bottom <= bRect.top || tRect.top >= bRect.bottom);
      return {
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        primOutsideRight: tRect.right > secRect.right + 1,
        textRight: tRect.right, btnLeft: bRect.left,
        glyphInside: prim.scrollWidth <= prim.clientWidth + 1 || prim.scrollTop >= 0,
        overlap
      };
    });
    const tag = `${w}px-${loc}`;
    check(`${tag} no horizontal overflow`, m.overflowX <= 0, 'dx=' + m.overflowX);
    check(`${tag} number inside result container`, !m.primOutsideRight, 'tR=' + m.textRight.toFixed(0) + '/' + m.btnLeft.toFixed(0));
    check(`${tag} no speaker-icon overlap`, !m.overlap, 'ov=' + m.overlap);
  }
}

check('no JS page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 220) || 'none');

console.log(`TOTAL PASS ${pass}  FAIL ${fail}  SKIP 0`);
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);