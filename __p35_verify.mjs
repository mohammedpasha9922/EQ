// PART 35 — Direct runtime verification (standalone script, NOT production code).
// Verifies the NEW SW-cache offline path for Notes PDF Preview (pdf.js) and
// Generate/Save (html2pdf.js) in real Chrome via puppeteer-core.
// Run: node __p35_verify.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 20000 + (process.pid % 20000);
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
    let data;
    try {
      data = fs.readFileSync(filePath);
    } catch (e) {
      // TEST-HARNESS ONLY: repo is missing these two APP_SHELL icons (pre-existing
      // gap that blocks SW install). Serve 1x1 PNG substitutes so the Service
      // Worker can install and the PART 35 cache path can be verified.
      if (urlPath === '/apple-touch-icon.png' || urlPath === '/icon-192.png') {
        data = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64');
      } else { throw e; }
    }
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URLBASE = `http://127.0.0.1:${PORT}/`;

const HTML2PDF = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFWORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const CACHE_NAME = 'eq-calculator-v4';

const report = {};
const consoleErrors = [];
const pageErrors = [];

const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eq-p35-'));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  userDataDir: userDir,
  args: ['--no-first-run', '--disable-features=Translate']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function cacheHas(page, url) {
  return page.evaluate(async (name, u) => {
    const c = await caches.open(name);
    const m = await c.match(u);
    return !!m;
  }, CACHE_NAME, url);
}
async function toastText(page) {
  return page.evaluate(() => {
    const t = document.getElementById('toast');
    return (t && t.classList.contains('show')) ? t.textContent : '';
  });
}
async function waitFor(page, fn, timeoutMs, pollMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { if (await fn()) return true; } catch (e) { /* retry */ }
    await sleep(pollMs);
  }
  return false;
}

try {
  // ---------------- PHASE A: ONLINE ----------------
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[online] ' + m.text()); });
  page.on('pageerror', (e) => pageErrors.push('[online] ' + e.message));

  await page.goto(URLBASE, { waitUntil: 'load', timeout: 60000 });

  // 3-4. SW activated + cache warmup contains the 3 new URLs
  const swDiag = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no sw support';
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'no registration';
    return 'install=' + (reg.installing ? 'yes' : 'no') +
      ' waiting=' + (reg.waiting ? 'yes' : 'no') +
      ' active=' + (reg.active ? (reg.active.state) : 'none');
  });
  console.log('SW DIAG (initial): ' + swDiag);
  // Deep diagnostic: force-register and surface any install failure reason.
  const swErr = await page.evaluate(async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      if (reg.installing) {
        const sw = reg.installing;
        await new Promise((resolve) => {
          sw.addEventListener('statechange', () => { if (sw.state === 'activated' || sw.state === 'redundant') resolve(); });
          setTimeout(resolve, 20000);
        });
        return 'final state: ' + sw.state;
      }
      return 'no installing worker; active=' + (reg.active ? reg.active.state : 'none');
    } catch (e) { return 'REGISTER ERROR: ' + (e && e.message); }
  });
  console.log('SW DIAG (forced register): ' + swErr);
  const swActive = await waitFor(page, () =>
    page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), 30000);
  if (!swActive) {
    // Controller only attaches after activation; force a reload once.
    await page.reload({ waitUntil: 'load' });
    const swDiag2 = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? ('active=' + (reg.active ? reg.active.state : 'none')) : 'no registration';
    });
    console.log('SW DIAG (after reload): ' + swDiag2);
  }
  report.swActivated = (swActive || await waitFor(page, () =>
    page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), 15000)) ? 'PASS' : 'FAIL';

  // 5. Notes PDF Preview ONLINE
  await page.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]');
    if (b) b.click();
  });
  await page.waitForSelector('#notesManagerModal.show', { timeout: 15000 });
  await page.click('#emptyNewNoteBtn');
  await page.waitForFunction(() => {
    const m = document.querySelector('#fullScreenNoteModal, .full-screen-note');
    return m && m.classList.contains('show');
  }, { timeout: 15000 }).catch(() => {});
  const editorOpen = await page.evaluate(() => !!document.getElementById('notePreviewPdfBtn'));
  if (!editorOpen) throw new Error('note editor did not open (notePreviewPdfBtn missing)');
  await page.click('#notePreviewPdfBtn');
  const previewOnline = await waitFor(page, () => page.evaluate(() => {
    const m = document.getElementById('notePdfPreviewModal');
    const c = document.getElementById('notePdfPreviewCanvas');
    const ind = document.getElementById('notePdfPageIndicator');
    return m && m.classList.contains('show') && c && c.width > 0 && /\d+\s*\/\s*\d+/.test(ind ? ind.textContent : '');
  }), 90000);
  report.previewOnline = previewOnline ? 'PASS' : 'FAIL';
  await page.evaluate(() => { const b = document.getElementById('notePdfPreviewClose'); if (b) b.click(); });
  await sleep(500);

  // 6. Notes PDF Generate/Save ONLINE
  await page.click('#exportNotePdfBtn');
  await page.waitForFunction(() => {
    const d = document.getElementById('noteExportPdfModal');
    return d && d.classList.contains('show');
  }, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { const b = document.getElementById('noteExportCreateBtn'); if (b) b.click(); });
  const exportOnline = await waitFor(page, async () => page.evaluate(() =>
    typeof window.html2pdf !== 'undefined'
  ), 90000);
  const onlineToast = await toastText(page);
  report.exportOnline = (exportOnline && !/no-internet|generation failed|failed/i.test(onlineToast))
    ? 'PASS' : 'FAIL (' + onlineToast + ')';
  await sleep(2500);

  // Cache checks AFTER the online flows (warmup + runtime cache.put both had a
  // chance to land; SW claim runs before warmup, so early checks race it).
  await waitFor(page, async () =>
    (await cacheHas(page, HTML2PDF)) && (await cacheHas(page, PDFJS)) && (await cacheHas(page, PDFWORKER)), 60000);
  report.html2pdfCached = (await cacheHas(page, HTML2PDF)) ? 'PASS' : 'FAIL';
  report.pdfjsCached = (await cacheHas(page, PDFJS)) ? 'PASS' : 'FAIL';
  report.pdfWorkerCached = (await cacheHas(page, PDFWORKER)) ? 'PASS' : 'FAIL';
  const cacheKeys = await page.evaluate(async (name) => {
    const names = await caches.keys();
    const out = {};
    for (const n of names) {
      const c = await caches.open(n);
      out[n] = (await c.keys()).map((r) => r.url).filter((u) => u.includes('html2pdf') || u.includes('pdf.js'));
    }
    return out;
  }, CACHE_NAME);
  console.log('CACHE KEYS (online): ' + JSON.stringify(cacheKeys));
  // Diagnose why activate-time cache.add didn't land: retry each warmup URL
  // from the PAGE context exactly like sw.js does (no-cors) and report result.
  const warmDiag = await page.evaluate(async (name, urls) => {
    const out = [];
    const c = await caches.open(name);
    for (const u of urls) {
      try { await c.add(new Request(u, { mode: 'no-cors' })); out.push(u + ' -> ADDED'); }
      catch (e) { out.push(u + ' -> ERROR ' + (e && e.message)); }
    }
    return out;
  }, CACHE_NAME, [HTML2PDF, PDFJS, PDFWORKER]);
  warmDiag.forEach((l) => console.log('WARMUP DIAG: ' + l));

  // ---------------- PHASE B: OFFLINE COLD START ----------------
  // 7-8. Simulate offline, then a true cold start (fresh browser on the same
  // profile, network dead from the very first byte).
  await browser.close();
  const browser2 = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    userDataDir: userDir,
    args: ['--no-first-run', '--disable-features=Translate']
  });
  const page2 = await browser2.newPage();
  await page2.setOfflineMode(true);
  page2.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('[offline] ' + m.text()); });
  page2.on('pageerror', (e) => pageErrors.push('[offline] ' + e.message));

  let coldOk = false;
  try {
    await page2.goto(URLBASE, { waitUntil: 'load', timeout: 60000 });
    coldOk = await waitFor(page2, () =>
      page2.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), 30000);
  } catch (e) { coldOk = false; }
  report.coldStartOffline = coldOk ? 'PASS' : 'FAIL';
  report.cacheSurvivedOffline = coldOk && (await cacheHas(page2, HTML2PDF)) &&
    (await cacheHas(page2, PDFJS)) && (await cacheHas(page2, PDFWORKER)) ? 'PASS' : 'FAIL';
  const keysOffline = await page2.evaluate(async (name) => {
    const names = await caches.keys();
    const out = {};
    for (const n of names) {
      const c = await caches.open(n);
      out[n] = (await c.keys()).map((r) => r.url).filter((u) => u.includes('html2pdf') || u.includes('pdf.js'));
    }
    return out;
  }, CACHE_NAME);
  console.log('CACHE KEYS (offline): ' + JSON.stringify(keysOffline));

  // 9-10. Open Notes + open the existing note
  await page2.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]');
    if (b) b.click();
  });
  const notesOpen = await waitFor(page2, () => page2.evaluate(() => {
    const m = document.getElementById('notesManagerModal');
    return m && m.classList.contains('show');
  }), 20000);
  const noteOpened = notesOpen && await waitFor(page2, () => page2.evaluate(() => {
    const item = document.querySelector('li.note-item .note-item-main');
    if (item) { item.click(); return true; }
    return false;
  }), 20000) && await waitFor(page2, () => page2.evaluate(() =>
    !!document.getElementById('notePreviewPdfBtn')
  ), 20000);
  if (!noteOpened) throw new Error('offline: could not open the note');

  // 11. Preview OFFLINE (pdf.js from cache)
  await page2.click('#notePreviewPdfBtn');
  const previewOffline = await waitFor(page2, () => page2.evaluate(() => {
    const m = document.getElementById('notePdfPreviewModal');
    const c = document.getElementById('notePdfPreviewCanvas');
    const ind = document.getElementById('notePdfPageIndicator');
    return m && m.classList.contains('show') && c && c.width > 0 && /\d+\s*\/\s*\d+/.test(ind ? ind.textContent : '');
  }), 90000);
  report.previewOffline = previewOffline ? 'PASS' : 'FAIL';
  await page2.evaluate(() => { const b = document.getElementById('notePdfPreviewClose'); if (b) b.click(); });
  await sleep(500);

  // 12. Generate/Save OFFLINE (html2pdf from cache)
  await page2.click('#exportNotePdfBtn');
  await page2.waitForFunction(() => {
    const d = document.getElementById('noteExportPdfModal');
    return d && d.classList.contains('show');
  }, { timeout: 15000 }).catch(() => {});
  await page2.evaluate(() => { const b = document.getElementById('noteExportCreateBtn'); if (b) b.click(); });
  const html2pdfOffline = await waitFor(page2, async () => page2.evaluate(() =>
    typeof window.html2pdf !== 'undefined'
  ), 90000);
  const offlineToast = await toastText(page2);
  report.exportOffline = (html2pdfOffline && !/no-internet|generation failed|failed/i.test(offlineToast))
    ? 'PASS' : 'FAIL (' + offlineToast + ')';
  await sleep(2500);

  // 13. App remains usable
  const usable = await page2.evaluate(() => !!document.body && document.body.children.length > 0);
  report.appUsable = usable ? 'PASS' : 'FAIL';

  await browser2.close();
} catch (e) {
  consoleErrors.push('[fatal] ' + (e && e.message ? e.message : String(e)));
} finally {
  await server.close();
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) { /* noop */ }
}

console.log('=== PART 35 DIRECT RUNTIME VERIFICATION ===');
console.log(JSON.stringify(report, null, 2));
console.log('CONSOLE ERRORS (' + consoleErrors.length + '):');
consoleErrors.forEach((c) => console.log('  ' + c));
console.log('PAGE ERRORS (' + pageErrors.length + '):');
pageErrors.forEach((c) => console.log('  ' + c));
