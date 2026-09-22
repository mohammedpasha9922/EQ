// PDF BUTTON FIRST-CLICK PROBE — measures (never edits) real first-click behavior.
// Test-only artifact; does NOT modify app.js / index.html / styles.css.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8412;
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (err) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

async function runScenario(label, vp, locale, attempts) {
  const pageErrors = [];
  const page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.evaluate((loc) => localStorage.setItem('eq-language', loc), locale);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  const instrumented = await page.evaluate(() => Array.isArray(window.__pdfUrls) && typeof navigator.share === 'function');

  const rows = [];
  for (let i = 1; i <= attempts; i++) {
    // Open the Notes manager and then a note (first attempt: new note; later: reopen existing).
    await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
    await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
    await sleep(250);
    if (i === 1) {
      await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
    } else {
      const clicked = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('#notesList [data-note-id], .note-item'));
        if (!items.length) return false;
        (items[items.length - 1].querySelector('.note-title') || items[items.length - 1]).click();
        return true;
      });
      if (!clicked) throw new Error('no note row to reopen');
    }
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
    await page.evaluate(() => { const t = document.getElementById('noteTitleInput'); if (!t.value) t.value = 'FirstClick Note'; });
    await sleep(250);

    const pre = await page.evaluate(() => {
      const b = document.getElementById('exportNotePdfBtn');
      const r = b.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const topEl = document.elementFromPoint(cx, cy);
      const cname = topEl ? (typeof topEl.className === 'string' ? topEl.className : (topEl.getAttribute && topEl.getAttribute('class')) || '') : '';
      return { rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        coveredBy: topEl ? ((topEl.id ? '#' + topEl.id : '') || topEl.tagName + '.' + cname) : null,
        sameChain: !!(topEl && (topEl === b || b.contains(topEl) || topEl.contains(b))),
        disabled: b.disabled };
    });

    const iframesBefore = await page.evaluate(() => document.body.querySelectorAll('iframe').length);
    const t0 = Date.now();
    await page.mouse.click(pre.rect.x + pre.rect.w / 2, pre.rect.y + pre.rect.h / 2);

    let startedMs = null;
    while (Date.now() - t0 < 1200) {
      const n = await page.evaluate(() => document.body.querySelectorAll('iframe').length);
      if (n > iframesBefore) { startedMs = Date.now() - t0; break; }
      await sleep(25);
    }
    let doneMs = null, outcome = null, lastToast = '';
    while (Date.now() - t0 < 30000) {
      const st = await page.evaluate(() => { try { return { urls: (window.__pdfUrls || []).length, shares: (window.__shareCalls || []).length, toast: (document.getElementById('toast') ? document.getElementById('toast').textContent.trim() : ''), frames: document.body.querySelectorAll('iframe').length, lib: typeof window.html2pdf }; } catch (e) { return { urls: -1, shares: -1, err: String(e) }; } });
      lastToast = st.toast || lastToast;
      if (st.shares > 0) { doneMs = Date.now() - t0; outcome = 'native-share'; break; }
      if (st.urls > 0) { doneMs = Date.now() - t0; outcome = 'download-blob'; break; }
      if (st.toast && /fail|failed|offline|internet|no-internet/i.test(st.toast)) { doneMs = Date.now() - t0; outcome = 'TOAST:' + st.toast + ' lib=' + st.lib; break; }
      await sleep(50);
    }
    const modalStillOpen = await page.evaluate(() => !!document.querySelector('#fullScreenNoteModal.show'));
    const framesLeft = await page.evaluate(() => document.body.querySelectorAll('iframe[aria-hidden="true"]').length);
    console.log(`${label} #${i}: ${pre.sameChain ? 'btn-reachable' : 'COVERED_BY=' + pre.coveredBy} | start=${startedMs === null ? 'NOT-STARTED(>1.2s)' : startedMs + 'ms'} | end=${doneMs === null ? 'NO-RESULT(30s)' : outcome + '@' + doneMs + 'ms'} | iframesLeft=${framesLeft} | modalOpen=${modalStillOpen}${pageErrors.length && i === 1 ? ' | ERRORS=' + JSON.stringify(pageErrors.slice(-2)) : ''}`);
    rows.push({ i, pre, startedMs, doneMs, outcome });
    await page.evaluate(() => { const b = document.getElementById('closeFullScreenNote'); if (b) b.click(); });
    await sleep(350);
  }
  await page.close();
  return rows;
}

const results = [];
const ATTEMPTS = parseInt(process.env.PDF_ATTEMPTS || '10', 10);
results.push(await runScenario('Desktop-1280-LTR', { width: 1280, height: 800 }, 'en', ATTEMPTS));
results.push(await runScenario('Mobile-390-RTL', { width: 390, height: 844, hasTouch: true, isMobile: true }, 'ar', ATTEMPTS));
results.push(await runScenario('Tablet-768-RTL', { width: 768, height: 800, hasTouch: true, isMobile: true }, 'ar', ATTEMPTS));
results.push(await runScenario('Mobile-430-LTR', { width: 430, height: 900, hasTouch: true, isMobile: true }, 'en', ATTEMPTS));
results.push(await runScenario('Small-360-RTL', { width: 360, height: 720, hasTouch: true, isMobile: true }, 'ar', ATTEMPTS));

let startedOk = 0, firstClickTotal = 0;
for (const rows of results) for (const r of rows) { firstClickTotal++; if (r.startedMs !== null && r.doneMs !== null) startedOk++; }
console.log('\n==== FIRST-CLICK SUMMARY: ' + startedOk + '/' + firstClickTotal + ' succeeded from ONE press ====');
console.log(results.map((r) => r[0] && r.length).join(','));
await browser.close();
server.close();
process.exit(startedOk === firstClickTotal ? 0 : 1);
  await page.setViewport(vp);
  await page.evaluateOnNewDocument(() => {
    window.__pdfUrls = []; window.__shareCalls = [];
    try {
      const origCreate = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (obj) => { const u = origCreate(obj); if (obj && obj.type === 'application/pdf') window.__pdfUrls.push({ u }); return u; };
    } catch (e) {}
    try {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, value: (data) => { window.__shareCalls.push({ title: data && data.title }); return Promise.resolve(); } });
    } catch (e) {}
  });
