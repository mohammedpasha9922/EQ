// CALCULATOR FUNCTIONALITY — dedicated browser test harness (test-only artifact).
// Drives the REAL application in a REAL Chrome browser via Puppeteer and verifies
// actual button interaction against the existing calculator architecture.
// Run:  node tests/calculatorBrowser.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8231;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 120000); // hard watchdog

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e && e.message || e)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bounded wait for the app module to boot and wire events.
async function boot() {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  let ok = false;
  for (let i = 0; i < 30; i++) {
    try {
      const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent);
      if (d === '0') { ok = true; break; }
    } catch (e) { /* retry */ }
    await sleep(400);
  }
  if (!ok) throw new Error('app did not reach display=0 (module likely failed to boot)');
}

async function tap(sel) {
  return await page.evaluate((s) => {
    const btn = document.querySelector(s);
    if (!btn) throw new Error('missing ' + s);
    btn.click();
    return {
      display: document.querySelector('#primaryDisplay').textContent,
      expression: document.querySelector('#expressionDisplay').textContent
    };
  }, sel);
}
async function readState() {
  return await page.evaluate(() => ({
    display: document.querySelector('#primaryDisplay').textContent,
    expression: document.querySelector('#expressionDisplay').textContent,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    bodyLang: document.body.getAttribute('data-language'),
    percentHidden: document.querySelector('#percentPanel').getAttribute('aria-hidden')
  }));
}
async function clear() { await tap('.control-btn[data-action="clear"]'); }

// Wait for the app module to boot and wire events.
try {
  await boot();
  check('No uncaught page errors on load', pageErrors.length === 0,
    pageErrors.length ? pageErrors[0] : 'clean');

  // 1 / 2 / 3 / 4 / 5 -> 1, 12, +, 3, = 15
  await clear();
  await tap('.keypad-btn.number[data-value="1"]');
  let s = await readState();
  check('1. Click 1 -> display contains 1', s.display === '1', 'display=' + s.display);

  await tap('.keypad-btn.number[data-value="2"]');
  s = await readState();
  check('2. Click 2 -> display contains 12', s.display === '12', 'display=' + s.display);

  await tap('.keypad-btn.operator[data-value="+"]');
  s = await readState();
  check('3. Click + -> operator/state updates', s.expression.includes('+'), 'expr=' + s.expression);

  await tap('.keypad-btn.number[data-value="3"]');
  s = await readState();
  check('4. Click 3 -> display contains 3', s.display === '3', 'display=' + s.display);

  await tap('.keypad-btn.equals');
  s = await readState();
  check('5. Click = -> result is 15', s.display === '15', 'display=' + s.display);

  // 6. Subtraction: 9 - 4 = 5
  await clear();
  await tap('.keypad-btn.number[data-value="9"]');
  await tap('.keypad-btn.operator[data-value="-"]');
  await tap('.keypad-btn.number[data-value="4"]');
  await tap('.keypad-btn.equals');
  s = await readState();
  check('6. Subtraction: 9 - 4 = 5', s.display === '5', 'display=' + s.display);

  // 7. Multiplication: 6 * 7 = 42
  await clear();
  await tap('.keypad-btn.number[data-value="6"]');
  await tap('.keypad-btn.operator[data-value="*"]');
  await tap('.keypad-btn.number[data-value="7"]');
  await tap('.keypad-btn.equals');
  s = await readState();
  check('7. Multiplication: 6 * 7 = 42', s.display === '42', 'display=' + s.display);

  // 8. Division: 8 / 2 = 4
  await clear();
  await tap('.keypad-btn.number[data-value="8"]');
  await tap('.keypad-btn.operator[data-value="/"]');
  await tap('.keypad-btn.number[data-value="2"]');
  await tap('.keypad-btn.equals');
  s = await readState();
  check('8. Division: 8 / 2 = 4', s.display === '4', 'display=' + s.display);

  // 9. Decimal: 1.5 + 2.5 = 4
  await clear();
  await tap('.keypad-btn.number[data-value="1"]');
  await tap('.keypad-btn.number[data-value="."]');
  await tap('.keypad-btn.number[data-value="5"]');
  await tap('.keypad-btn.operator[data-value="+"]');
  await tap('.keypad-btn.number[data-value="2"]');
  await tap('.keypad-btn.number[data-value="."]');
  await tap('.keypad-btn.number[data-value="5"]');
  await tap('.keypad-btn.equals');
  s = await readState();
  check('9. Decimal: 1.5 + 2.5 = 4', s.display === '4', 'display=' + s.display);

  // 10. AC clears display
  await clear();
  await tap('.keypad-btn.number[data-value="5"]');
  await tap('.keypad-btn.number[data-value="5"]');
  await tap('.keypad-btn.number[data-value="5"]');
  await tap('.control-btn[data-action="clear"]');
  s = await readState();
  check('10. AC/Clear resets display to 0', s.display === '0', 'display=' + s.display);

  // 11. Backspace: 123 -> 12
  await clear();
  await tap('.keypad-btn.number[data-value="1"]');
  await tap('.keypad-btn.number[data-value="2"]');
  await tap('.keypad-btn.number[data-value="3"]');
  await tap('.control-btn[data-action="backspace"]');
  s = await readState();
  check('11. Backspace: 123 -> 12', s.display === '12', 'display=' + s.display);

  // 12. Percentage panel (the app's existing percent feature)
  await clear();
  await page.evaluate(() => {
    document.getElementById('percentToggle').click();
    return document.getElementById('percentPanel').getAttribute('aria-hidden');
  });
  s = await readState();
  check('12. Percentage panel opens via toggle (percent feature present)', s.percentHidden === 'false', 'aria-hidden=' + s.percentHidden);
  await page.evaluate(() => document.getElementById('percentBackButton').click());
  await sleep(100);

  // 13. +/- sign (no +/- button exists in the UI) -> N/A
  const hasSignBtn = await page.evaluate(() =>
    !!document.querySelector('.keypad-btn[data-value="neg"], #negateButton, #signButton'));
  check('13. Sign +/- button (not present in UI -> N/A)', !hasSignBtn,
    'no +/- keypad button (feature not present), skipping');

  // 14. Keyboard input: 7 + 8 Enter = 15
  await clear();
  await page.evaluate(() => {
    const fire = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fire('7'); fire('+'); fire('8'); fire('Enter');
  });
  s = await readState();
  check('14. Keyboard input: 7 + 8 Enter = 15', s.display === '15', 'display=' + s.display);

  // 15. Language switch still works
  await page.select('#topBarLanguageSelect', 'ar');
  s = await readState();
  check('15. Language switch works (ar)', s.lang === 'ar' && s.dir === 'rtl' && s.bodyLang === 'ar',
    'lang=' + s.lang + ' dir=' + s.dir + ' bodyLang=' + s.bodyLang);
  await page.select('#topBarLanguageSelect', 'en');
  await sleep(100);

  // 16. Repeated operations do not duplicate
  await clear();
  await tap('.keypad-btn.number[data-value="5"]');
  s = await readState();
  check('16a. No duplicate listener on digit (5 -> "5")', s.display === '5', 'display=' + s.display);

  await clear();
  await tap('.keypad-btn.number[data-value="3"]');
  await tap('.keypad-btn.operator[data-value="+"]');
  await tap('.keypad-btn.number[data-value="4"]');
  await tap('.keypad-btn.equals');
  const afterFirstEquals = (await readState()).display;
  await tap('.keypad-btn.equals');
  const afterSecondEquals = (await readState()).display;
  check('16b. Repeated equals does not double-apply (3+4=7 stays 7)',
    afterFirstEquals === '7' && afterSecondEquals === '7',
    'after1=' + afterFirstEquals + ' after2=' + afterSecondEquals);

  // 16c-16e. SMART ENGINE (operator precedence) through REAL buttons:
  // a chain without parentheses must keep building the expression (no eager
  // left-to-right collapse) and evaluate with PEMDAS at `=`.
  await clear();
  await tap('.keypad-btn.number[data-value="2"]');
  await tap('.keypad-btn.operator[data-value="+"]');
  await tap('.keypad-btn.number[data-value="3"]');
  await tap('.keypad-btn.operator[data-value="*"]');
  s = await readState();
  check('16c. Mid-chain 2+3* builds expression without error',
    !/error/i.test(s.display) && !/error/i.test(s.expression),
    'display=' + s.display + ' expr=' + s.expression);
  await tap('.keypad-btn.number[data-value="4"]');
  await tap('.keypad-btn.equals');
  s = await readState();
  check('16d. Precedence 2+3*4 = 14 (not 20)', s.display === '14', 'display=' + s.display);

  await clear();
  await tap('.keypad-btn.number[data-value="2"]');
  await tap('.keypad-btn.number[data-value="0"]');
  await tap('.keypad-btn.operator[data-value="/"]');
  await tap('.keypad-btn.number[data-value="5"]');
  await tap('.keypad-btn.operator[data-value="+"]');
  await tap('.keypad-btn.number[data-value="2"]');
  await tap('.keypad-btn.equals');
  s = await readState();
  check('16e. Precedence 20/5+2 = 6', s.display === '6', 'display=' + s.display);

  // 17. No uncaught runtime/page errors after all interaction
  check('17. No uncaught page errors after interactions', pageErrors.length === 0,
    pageErrors.length ? pageErrors.join(' | ').slice(0, 300) : 'clean');

} catch (err) {
  console.error('HARNESS ERROR:', err);
  results.push({ name: 'HARNESS', ok: false, detail: String(err.message) });
} finally {
  if (browser) await browser.close();
  server.close();
}

const pass = results.filter((r) => r.ok).length;
console.log('\n==== RESULT: ' + pass + '/' + results.length + ' passed ====');
try {
  fs.writeFileSync(path.join(HERE, '__calc_summary.txt'),
    results.map((r) => (r.ok ? 'PASS' : 'FAIL') + '\t' + r.name + (r.detail ? '\t-> ' + r.detail : '')).join('\n') +
    '\nTOTAL\t' + pass + '/' + results.length + '\n');
} catch (e) { /* best-effort */ }
process.exit(pass === results.length ? 0 : 1);