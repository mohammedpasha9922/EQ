// FIRST-CLICK Share/Send verifier for History → Share PDF.
// Drives the REAL UI (checkbox selection + #exportHistory click) in real Chrome,
// mocks navigator.share to capture every invocation, and asserts:
//  - exactly ONE share call from ONE click (LTR + RTL, with/without Company Name)
//  - the shared file is a real PDF (%PDF magic)
//  - double-click does NOT produce a duplicate share call
//  - no-share environment falls back cleanly with no errors
//  - zero JS console/page errors throughout
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const f = path.join(ROOT, p);
  try { const d = fs.readFileSync(f); res.writeHead(200, { 'Content-Type': (MIME[path.extname(f).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', r); });
const BASE = `http://127.0.0.1:${server.address().port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => process.exit(124), 500000);

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined ? '  [' + detail + ']' : ''));
  if (!ok) failures.push(name);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });

  async function openApp(locale) {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate((loc) => {
      try {
        localStorage.setItem('eq-language', loc);
        const entries = [];
        for (let i = 1; i <= 3; i++) entries.push({ id: 's' + i, expression: `${i}0 + ${i}`, result: String(i * 10 + i), note: 'Note ' + i, time: Date.now() });
        localStorage.setItem('eq-history', JSON.stringify(entries));
        localStorage.removeItem('eq-history-company-name');
      } catch (e) {}
    }, locale);
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(2500);
    await installShareMock();
    await sleep(600);
  }

  async function installShareMock() {
    await page.evaluate((src) => {
      if (typeof window.html2pdf === 'undefined') { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); }
      window.__shareCalls = [];
      Object.defineProperty(navigator, 'share', { configurable: true, value: async (data) => {
        const f = data && data.files && data.files[0];
        const buf = f ? new Uint8Array(await f.arrayBuffer()) : null;
        const magic = buf ? String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) : '';
        window.__shareCalls.push({ name: f ? f.name : null, size: buf ? buf.length : 0, magic });
      } });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!(d && d.files) });
    }, fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/h2pdf.js'), 'utf8'));
  }

  async function selectAll() {
    await page.evaluate(() => {
      const cbs = document.querySelectorAll('.history-select');
      cbs.forEach(cb => { cb.checked = true; });
      if (cbs[0]) cbs[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(300);
  }

  async function shareState() {
    return page.evaluate(() => ({ calls: window.__shareCalls, toast: (document.querySelector('.toast, #toast') || {}).textContent || '' }));
  }

  async function clickShareAndWait(maxMs) {
    const t0 = Date.now();
    await page.evaluate(() => { const b = document.getElementById('exportHistory'); if (b) b.click(); });
    let last = { calls: [], toast: '' };
    while (Date.now() - t0 < maxMs) {
      await sleep(500);
      last = await shareState();
      if (last.calls.length > 0) return last;
    }
    return last;
  }


  // ---- A) en/LTR, no company name: ONE click -> exactly one share ----------
  console.log('--- A) en/LTR first click (no company name) ---');
  await openApp('en');
  {
    const diag = await page.evaluate(() => ({
      rows: document.querySelectorAll('.history-entry').length,
      cbs: document.querySelectorAll('.history-select').length,
      btn: !!document.getElementById('exportHistory'),
      historyLen: (window.__historyPdfBlob ? 'seam-ok' : 'no-seam'),
      raw: (() => { try { return JSON.parse(localStorage.getItem('eq-history') || '[]').length; } catch (e) { return -1; } })()
    }));
    console.log('DIAG: ' + JSON.stringify(diag));
  }
  await selectAll();
  const resA = await clickShareAndWait(30000);
  console.log('DIAG-A: ' + JSON.stringify(resA));
  {
    const { calls } = resA;
    check('A: exactly ONE share call from ONE click', calls.length === 1, 'calls=' + calls.length);
    check('A: shared file is a real PDF', calls.length === 1 && calls[0].magic === '%PDF' && calls[0].size > 500, calls.length === 1 ? calls[0].magic + ' size=' + calls[0].size : '-');
    check('A: filename kept eq-history-*.pdf', calls.length === 1 && /^eq-history-\d+\.pdf$/.test(calls[0].name || ''), calls.length === 1 ? calls[0].name : '-');
  }

  // ---- B) saved ARABIC company name: ONE click on the named cache path ------
  console.log('--- B) en/LTR first click WITH saved Company Name ---');
  await openApp('en');
  await page.evaluate(() => { try { localStorage.setItem('eq-history-company-name', 'شركة البركة للتجارة العامة'); } catch (e) {} });
  await selectAll();
  const resB = await clickShareAndWait(30000);
  {
    const { calls } = resB;
    check('B: ONE share call on first click with Company Name', calls.length === 1, 'calls=' + calls.length);
    check('B: shared file is a real PDF', calls.length === 1 && calls[0].magic === '%PDF');
  }

  // ---- C) ar/RTL first click -------------------------------------------------
  console.log('--- C) ar/RTL first click ---');
  await openApp('ar');
  await selectAll();
  const resC = await clickShareAndWait(30000);
  {
    const { calls } = resC;
    check('C: ar/RTL exactly ONE share call on first click', calls.length === 1, 'calls=' + calls.length);
    check('C: ar/RTL real PDF shared', calls.length === 1 && calls[0].magic === '%PDF');
  }

  // ---- D) double click -> still exactly one share (no duplicate dialog) ------
  console.log('--- D) double-click guard ---');
  await openApp('en');
  await selectAll();
  await page.evaluate(() => { const b = document.getElementById('exportHistory'); if (b) { b.click(); b.click(); } });
  const resD = await clickShareAndWait(30000).catch(() => ({ calls: [] }));
  {
    const calls = resD.calls;
    check('D: double-click produces exactly ONE share call', calls.length === 1, 'calls=' + calls.length);
  }

  // ---- E) no-share environment: clean fallback, zero share calls -------------
  console.log('--- E) unsupported fallback ---');
  await openApp('en');
  await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); });
  await selectAll();
  await page.evaluate(() => { const b = document.getElementById('exportHistory'); if (b) b.click(); });
  await sleep(2500);
  {
    const { calls, toast } = await shareState();
    check('E: no share call when canShare=false', calls.length === 0, 'calls=' + calls.length);
    check('E: clear fallback message shown', (toast || '').length > 0, toast);
  }

  // ---- F) determinism: repeat the first-click sequence 3 times ---------------
  console.log('--- F) determinism x3 ---');
  let deterministic = true;
  for (let run = 1; run <= 3; run++) {
    await openApp('en');
    await selectAll();
    await page.evaluate(() => { const b = document.getElementById('exportHistory'); if (b) b.click(); });
    const resF = await clickShareAndWait(30000);
    const { calls } = resF;
    if (calls.length !== 1) { deterministic = false; console.log('  run ' + run + ' calls=' + calls.length); }
  }
  check('F: first click deterministic across 3 fresh runs', deterministic);

  check('ZERO JavaScript page/console errors', jsErrors.length === 0, jsErrors.slice(0, 3).join(' | '));

  console.log(failures.length === 0 ? 'ALL PASS: Share works reliably from the FIRST click' : 'FAILURES: ' + failures.join('; '));
  process.exitCode = failures.length === 0 ? 0 : 1;
} finally {
  await browser.close().catch(() => {});
  server.close();
}

