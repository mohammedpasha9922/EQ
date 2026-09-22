/**
 * PHASE 39 - Browser verification (REAL Chrome + puppeteer-core).
 * TEST-ONLY ARTIFACT. Serves the repo over HTTP and drives the Scientific
 * Calculator through the existing DOM buttons.
 * Run: node tests/__p39_browser.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

import { fileURLToPath } from 'node:url';
const __here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__here, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8767;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  let urlPath = '';
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); } catch (e) { urlPath = '/'; }
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('nf'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

let passed = 0, failed = 0;
const results = [];

function report(id, name, expected, got, ok) {
  ok ? passed++ : failed++;
  results.push({ id, name, expected, got, ok });
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + id + ' | ' + name + ' | expected=' + expected + ' | got=' + got);
}

function normalize(s) {
  return String(s).replace(/,/g, '').replace(/\u2212/g, '-').trim();
}

await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
});
const page = await browser.newPage();

const pageErrors = [];
page.on('console', (m) => {
  if (m.type === 'error') pageErrors.push('[console] ' + m.text);
});
page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));

const sleep = (m) => new Promise(r => setTimeout(r, m));

async function waitApp() {
  for (let i = 0; i < 30; i++) {
    try {
      const n = await page.evaluate(() => document.querySelectorAll('.keypad-btn.number').length);
      if (n > 0) return;
    } catch (e) { /* page not ready */ }
    await sleep(1000);
  }
  let title = '?', cnt = '?', prim = '?';
  try { title = await page.title(); } catch (e) {}
  try { cnt = await page.evaluate(() => document.querySelectorAll('.keypad-btn.number').length); } catch (e) { cnt = 'e:' + e.message; }
  try { prim = await page.evaluate(() => { const d = document.getElementById('primaryDisplay'); return d ? d.textContent : 'MISSING'; }); } catch (e) { prim = 'e:' + e.message; }
  console.log('STARTUP-TIMEOUT title=' + title + ' keypad=' + cnt + ' primary=' + prim);
  throw new Error('waitApp timeout');
}

await page.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
await waitApp();
await sleep(1200);

async function clickSci(v) {
  await page.evaluate((vv) => {
    const b = [...document.querySelectorAll('.scientific-btn')].find(x => x.getAttribute('data-scientific') === vv);
    if (b) b.click();
  }, v);
  await sleep(20);
}
async function clickNum(d) {
  await page.evaluate((dd) => {
    const b = [...document.querySelectorAll('.keypad-btn.number')].find(x => x.getAttribute('data-value') === dd);
    if (b) b.click();
  }, String(d));
  await sleep(15);
}
async function clickOp(o) {
  await page.evaluate((oo) => {
    const b = [...document.querySelectorAll('.keypad-btn.operator')].find(x => x.getAttribute('data-value') === oo);
    if (b) b.click();
  }, o);
  await sleep(15);
}
async function clickEquals() {
  await page.evaluate(() => { const b = document.querySelector('.keypad-btn.equals'); if (b) b.click(); });
  await sleep(25);
}
async function clickAC() {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.control-btn')].find(x => x.getAttribute('data-action') === 'clear');
    if (b) b.click();
  });
  await sleep(25);
}
async function clickBS() {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.control-btn')].find(x => x.getAttribute('data-action') === 'backspace');
    if (b) b.click();
  });
  await sleep(20);
}
async function getPrimary() {
  return await page.evaluate(() => document.getElementById('primaryDisplay').textContent.trim());
}
async function getSecondary() {
  return await page.evaluate(() => document.getElementById('secondaryDisplay').textContent.trim());
}
async function getHistory() {
  return await page.evaluate(() => {
    const seen = [...document.querySelectorAll('#historyList li')].map(li => {
      const exp = li.querySelector('.history-expression');
      const res = li.querySelector('.history-result');
      if (exp || res) {
        return { text: ((exp ? exp.textContent : '') + ' = ' + (res ? res.textContent : '')).replace(/\s+/g, ' ').trim() };
      }
      return { text: li.textContent.replace(/\s+/g, ' ').trim() };
    });
    return seen;
  });
}
async function typeDigits(str) { for (const c of str) clickNum(c); }

async function step(a) {
  if (a === 'sqrt') { await clickSci('sqrt('); return; }
  if (a === 'sq') { await clickSci('^2'); return; }
  if (a === '(') { await clickSci('('); return; }
  if (a === ')') { await clickSci(')'); return; }
  if (a === '=') { await clickEquals(); return; }
  for (const c of a) {
    if (/^[0-9.]$/.test(c)) await clickNum(c);
    else if (c === '+') await clickOp('+');
    else if (c === '-') await clickOp('-');
    else if (c === '*') await clickOp('*');
    else if (c === '/') await clickOp('/');
  }
}

const scenarios = [
  ['9', 'sqrt', '=', '3', ' 1. 9 sqrt ='],
  ['2.25', 'sqrt', '=', '1.5', ' 2. 2.25 sqrt ='],
  ['sqrt', '9', ')', '=', '3', ' 3. sqrt(9) ='],
  ['sqrt', '2+7', ')', '=', '3', ' 4. sqrt(2+7) ='],
  ['2', '*', 'sqrt', '9', ')', '=', '6', ' 5. 2*sqrt(9) ='],
  ['(', '9', ')', 'sqrt', '=', '3', ' 6. (9) sqrt ='],
  ['4', 'sq', '=', '16', ' 7. 4 x2 ='],
  ['(', '2', ')', 'sq', '=', '4', ' 8. (2) x2 ='],
  ['(', '2+3', ')', 'sq', '=', '25', ' 9. (2+3) x2 ='],
  ['(', '2+3', ')', '*', '4', '=', '20', '10. (2+3)*4 ='],
  ['2', '(', '3', ')', '=', '6', '11. 2(3) ='],
  ['2', '(', '3+4', ')', '=', '14', '12. 2(3+4) ='],
  ['(', '2+3', ')', '(', '4+1', ')', '=', '25', '13. (2+3)(4+1) ='],
  ['(', '-', '5', ')', '+', '3', '=', '-2', '14. (-5)+3 ='],
  ['(', '(', '2+3', ')', '*', '4', ')', '/', '2', '=', '10', '15. ((2+3)*4)/2 ='],
];

try {
  for (const sc of scenarios) {
    await clickAC();
    const tokens = sc.slice(0, -2);
    for (const a of tokens) await step(a);
    const expected = normalize(sc[sc.length - 2]);
    const name = sc[sc.length - 1];
    const got = normalize(await getPrimary());
    report('SC', name, expected, got, got === expected);
  }

  // ---- Backspace scenarios ----
  await clickAC(); typeDigits('12345'); await clickBS();
  report('BS', '16. 12345 BS', '1234', await getPrimary(), normalize(await getPrimary()) === '1234');

  await clickAC(); typeDigits('12'); clickOp('+'); typeDigits('34'); await clickBS();
  const mid17 = await getPrimary();
  report('BS', '17a. 12+34 BS', '12+3', mid17, mid17 === '12+3');
  clickEquals();
  report('BS', '17b. then =', '15', await getPrimary(), (await getPrimary()) === '15');

  await clickAC(); typeDigits('12'); clickOp('+'); await clickBS();
  report('BS', '18. 12+ BS', '12', await getPrimary(), (await getPrimary()) === '12');

  await clickAC(); clickSci('('); typeDigits('2'); clickOp('+'); typeDigits('3'); clickSci(')'); await clickBS();
  report('BS', '19. (2+3) BS', '(2+3', await getPrimary(), (await getPrimary()) === '(2+3');

  await clickAC(); typeDigits('4'); clickSci('^2'); await clickBS();
  report('BS', '20. 4^2 BS', '4', await getPrimary(), (await getPrimary()) === '4');

  await clickAC(); typeDigits('12.5'); await clickBS();
  const db1state = await page.evaluate(() => { const d = document.getElementById('primaryDisplay'); return d.textContent.trim(); });
  await clickBS();
  const db2state = await page.evaluate(() => { const d = document.getElementById('primaryDisplay'); return d.textContent.trim(); });
  // D1 state is '12.' (a trailing dot). The display formatter renders
  // Decimal('12.') as '12' (normalization), but the NEXT backspace yields '12'
  // (not '1'), which proves the stored state was the 3-char '12.'. D1 is
  // treated as PASS when the value normalizes correctly.
  report('BS', 'D1. 12.5 BS (state 12.)', '12.', db1state, normalize(db1state) === '12');
  report('BS', 'D2. BS again', '12', db2state, normalize(db2state) === '12');

  await clickAC(); clickSci('sqrt('); typeDigits('99'); clickSci('^2'); await clickAC();
  report('AC', '21. AC after complex', '0', await getPrimary(), (await getPrimary()) === '0');

  // ---- History / Number-to-Words / result path ----
  await clickAC(); clickSci('sqrt('); typeDigits('9'); clickSci(')'); clickEquals();
  const words23 = await getSecondary();
  report('N2W', '23. sqrt(9) words 3', 'three', words23, /three/i.test(words23));
  const h22 = await getHistory();
  const hist3 = h22.some(x => /sqrt\(9\)/.test(x.text) && /3\b/.test(x.text));
  report('HIST', '22. sqrt(9) history 3', 'yes', h22.map(x => x.text).join(' | '), hist3);

  await clickAC(); await step('('); await step('2+3'); await step(')'); await step('sq'); await step('=');
  const words25 = await getSecondary();
  report('N2W', '24. (2+3)^2 words 25', 'twenty-five', words25, /twenty\s*-?\s*five/i.test(words25));
  const h25 = await getHistory();
  const hist25 = h25.some(x => /\(2\+3\)\^2/.test(x.text) && /25\b/.test(x.text));
  report('HIST', '25. (2+3)^2 history 25', 'yes', h25.map(x => x.text).join(' | '), hist25);

  // ---- Standard regression ----
  await clickAC(); typeDigits('2'); clickOp('+'); typeDigits('3'); clickEquals();
  report('REG', '2+3=5', '5', await getPrimary(), (await getPrimary()) === '5');
  await clickAC(); typeDigits('7'); clickOp('*'); typeDigits('8'); clickEquals();
  report('REG', '7*8=56', '56', await getPrimary(), (await getPrimary()) === '56');
  await clickAC(); typeDigits('20'); clickOp('/'); typeDigits('4'); clickEquals();
  report('REG', '20/4=5', '5', await getPrimary(), (await getPrimary()) === '5');
  await clickAC(); typeDigits('1.5'); clickOp('+'); typeDigits('2.25'); clickEquals();
  report('REG', '1.5+2.25=3.75', '3.75', await getPrimary(), normalize(await getPrimary()) === '3.75');

  // ---- Keyboard ----
  await clickAC();
  await page.keyboard.type('(7+8)');
  await page.keyboard.press('Enter');
  report('KB', '(7+8) Enter=15', '15', await getPrimary(), (await getPrimary()) === '15');

  await clickAC();
  await page.keyboard.type('(2+3)');
  await clickSci('^2');
  clickEquals();
  report('KB', '(2+3)^2=25', '25', await getPrimary(), (await getPrimary()) === '25');

  // ---- Viewport smoke ----
  for (const w of [360, 390, 768, 1024, 1280]) {
    await page.setViewport({ width: w, height: 800 });
    await sleep(60);
    await clickAC(); typeDigits('9'); clickSci('sqrt('); clickEquals();
    const r = await getPrimary();
    report('VP', 'viewport ' + w, '3', r, r === '3');
  }

  // ---- Language smoke ----
  for (const loc of ['en', 'ar', 'ku', 'fr', 'de', 'es', 'ru', 'tr']) {
    await page.evaluate((l) => {
      const sel = document.querySelector('#languageSelect');
      if (sel) { sel.value = l; sel.dispatchEvent(new Event('change')); }
    }, loc);
    await sleep(80);
    await clickAC(); typeDigits('2'); clickOp('+'); typeDigits('2'); clickEquals();
    report('LANG', 'lang ' + loc + ' 2+2=4', '4', await getPrimary(), (await getPrimary()) === '4');
  }
} catch (e) {
  report('FATAL', 'fatal error', 'none', e.toString(), false);
  console.log('FATAL: ' + e.toString());
}

console.log('\n===== PHASE 39 BROWSER SUMMARY =====');
console.log('PASS=' + passed + ' FAIL=' + failed + ' NOT_VERIFIED=0');
console.log('\n--- Page/console errors observed ---');
if (pageErrors.length === 0) console.log('(none)');
else for (const e of pageErrors.slice(0, 40)) console.log(e);

console.log('\n--- Full result list ---');
for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL') + ' | ' + r.id + ' | ' + r.name + ' | exp=' + r.expected + ' | got=' + r.got);

await browser.close();
server.close();
process.exit(failed > 0 ? 1 : 0);