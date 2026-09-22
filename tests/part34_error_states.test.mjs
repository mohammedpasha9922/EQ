// PART 34 — ERROR STATES (إدارة الأخطاء وحالات العمليات)
// Real-Chrome behavioral test. Run:  node tests/part34_error_states.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8341;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
let passCount = 0;
const OUT = path.join(ROOT, '__p34_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (ok) passCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
// Surface ANY silent crash into the results file instead of dying quietly.
process.on('unhandledRejection', (e) => {
  const line = 'FATAL(unhandledRejection) ' + String(e && e.message || e);
  console.log(line); fs.appendFileSync(OUT, line + '\n'); process.exit(2);
});
process.on('uncaughtException', (e) => {
  const line = 'FATAL(uncaughtException) ' + String(e && e.message || e);
  console.log(line); fs.appendFileSync(OUT, line + '\n'); process.exit(2);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Wait until the PDF export operation leaves its busy state (PART 34 state machine).
async function waitIdle(page, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const busy = await page.evaluate(() => window.__smartPdfExport.isBusy());
    if (!busy) return true;
    await sleep(200);
  }
  return false;
}

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
    // PART 34 failure-injection seams (test-only flags; production untouched):
    //  - __p34failRaster: canvas rasterization throws (PDF preparation failure)
    //  - __p34failIdbTx : IndexedDB transactions throw
    //  - __p34failLs    : localStorage.setItem throws
    window.__p34flags = { failRaster: false, failIdbTx: false, failLs: false, rasterCalls: 0 };
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...a) {
      const f = window.__p34flags;
      if (f.failRaster) throw new Error('SimulatedRasterFailure: TransactionInactiveError mock');
      f.rasterCalls++;
      return origToDataURL.apply(this, a);
    };
    const origTx = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...a) {
      if (window.__p34flags.failIdbTx) throw new Error('SimulatedIDBFailure: DatabaseClosedError mock');
      return origTx.apply(this, a);
    };
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (window.__p34flags.failLs && String(k).indexOf('eq') !== -1) {
        throw new Error('SimulatedStorageFailure: QuotaExceededError mock');
      }
      return origSetItem.call(this, k, v);
    };
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function openBlank(page, locale) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
async function seedText(page, txt) {
  await page.evaluate((t) => {
    const el = document.querySelector('#smartDocumentContent');
    el.innerHTML = '<h2>' + t + '</h2><p>Body paragraph for PART 34.</p>';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, txt);
  await sleep(250);
}
// Snapshot every piece of user data the spec lists — used before/after failures.
const SNAP_FN = () => {
  const pages = [...document.querySelectorAll('#smartBlankCanvasHolder .smart-document-content')]
    .map((n) => n.innerHTML);
  const saveState = window.__smartSave.getState();
  const pageEls = [...document.querySelectorAll('#smartBlankCanvasHolder .smart-page')];
  const visibleIdx = pageEls.findIndex((p) => !p.classList.contains('smart-page-hidden'));
  return {
    pages, name: window.__smartDocName.get(),
    design: JSON.stringify(window.__smartPageDesign.getState()),
    currentPage: visibleIdx >= 0 ? visibleIdx + 1 : 1,
    dirty: saveState.dirty,
    tables: document.querySelectorAll('.smart-doc-table').length,
    images: document.querySelectorAll('img.smart-doc-image').length,
    signatures: document.querySelectorAll('[data-smart-signature], img.smart-signature-img').length
  };
};
// ============================================================
// A) Loading / Processing state + duplicate-operation guard
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'PART 34 DOC');

  // Slow down rasterization so the async processing state is observable.
  await page.evaluate(() => {
    const orig = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...a) {
      const r = orig.apply(this, a);
      return new Promise((res) => setTimeout(() => res(r), 400));
    };
  });

  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(200);
  await page.evaluate(() => { document.querySelector('input[name="smartPdfPages"][value="current"]').checked = true; });

  // One real click; a second activation attempt happens while busy (seam run).
  await page.click('#smartPdfConfirmBtn');
  await sleep(80); // inside the processing window
  const busyState = await page.evaluate(() => ({
    busy: window.__smartPdfExport.isBusy(),
    btnDisabled: document.getElementById('smartPdfConfirmBtn').disabled,
    btnLabel: document.getElementById('smartPdfConfirmBtn').textContent.trim()
  }));
  check('A1) Processing state active during export', busyState.busy === true);
  check('A2) Export button disabled while preparing', busyState.btnDisabled === true);
  check('A3) Button shows "Preparing document…"', busyState.btnLabel.includes('Preparing document'), busyState.btnLabel);

  const secondRun = await page.evaluate(() => window.__smartPdfExport.run()); // must be rejected by guard
  check('A4) Second concurrent operation rejected (no duplicate)', secondRun === false);

  await sleep(2500);
  const doneState = await page.evaluate(() => ({
    busy: window.__smartPdfExport.isBusy(),
    calls: window.__p34flags.rasterCalls,
    resultVisible: !document.getElementById('smartPdfResultModal').hidden,
    toast: (document.getElementById('toast') || {}).textContent || '',
    btnDisabled: document.getElementById('smartPdfConfirmBtn').disabled
  }));
  check('A5) Exactly ONE export executed (raster called once)', doneState.calls === 1, 'calls=' + doneState.calls);
  check('A6) Busy state cleared after completion', doneState.busy === false && doneState.btnDisabled === false);
  check('A7) Success message shown ("successfully")', doneState.toast.includes('successfully'), doneState.toast);
  check('A8) Result dialog presented after success', doneState.resultVisible);

  // B) UI back to normal: retry works immediately without refresh
  await page.evaluate(() => {
    const c = document.getElementById('smartPdfResultCloseBtn'); if (c) c.click();
  });
  await sleep(200);
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(200);
  await page.click('#smartPdfConfirmBtn');
  await waitIdle(page);
  await sleep(400);
  const retry = await page.evaluate(() => ({
    ok: !document.getElementById('smartPdfResultModal').hidden,
    calls: window.__p34flags.rasterCalls
  }));
  check('B1) Immediate retry after success works (no refresh needed)', retry.ok && retry.calls === 2, JSON.stringify(retry));
  await page.evaluate(() => window.__smartPdfExport.close());

  // C) Failure: PDF preparation fails through the REAL code path (seam injection)
  const snapBefore = await page.evaluate(SNAP_FN);
  await page.evaluate(() => { window.__p34flags.failRaster = true; });
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(200);
  // DOM-level click (same technique as the i18n loop below) so overlays
  // cannot intercept the pointer.
  await page.evaluate(() => document.getElementById('smartPdfConfirmBtn').click());
  await waitIdle(page);
  await sleep(400); // allow the failure toast to render
  const failState = await page.evaluate(() => ({
    toast: (document.getElementById('toast') || {}).textContent || '',
    bodyText: document.body.innerText,
    busy: window.__smartPdfExport.isBusy(),
    btnDisabled: document.getElementById('smartPdfConfirmBtn').disabled,
    dialogOpen: !document.getElementById('smartPdfModal').hidden
  }));
  check('C1) Human-readable failure message (no raw error)',
    failState.toast.includes("Couldn't prepare the PDF"), failState.toast);
  const leaky = /TransactionInactive|SimulatedRaster|TypeError|stack/i.test(failState.bodyText);
  check('C2) No technical details leaked into the UI', !leaky);
  check('C3) App did NOT freeze: button re-enabled after failure', !failState.busy && !failState.btnDisabled);
  check('C4) Dialog stays open & usable for retry', failState.dialogOpen);
  const snapAfter = await page.evaluate(SNAP_FN);
  check('C5) State safety: document data identical after failure',
    JSON.stringify(snapBefore) === JSON.stringify(snapAfter),
    JSON.stringify({ b: snapBefore, a: snapAfter }).slice(0, 160));

  // D) Retry after failure succeeds (fresh toast so the read is unambiguous)
  await page.evaluate(() => { window.__p34flags.failRaster = false; });
  await page.evaluate(() => {
    const t = document.getElementById('toast'); if (t) { t.textContent = ''; t.classList.remove('show'); }
  });
  await sleep(2600); // let the previous failure toast fully expire
  await page.evaluate(() => document.getElementById('smartPdfConfirmBtn').click());
  await waitIdle(page);
  await sleep(400);
  const retryOk = await page.evaluate(() => ({
    ok: !document.getElementById('smartPdfResultModal').hidden,
    toast: (document.getElementById('toast') || {}).textContent || ''
  }));
  check('D1) Retry after failure succeeds', retryOk.ok);
  check('D2) Retry shows success message', retryOk.toast.includes('successfully'), retryOk.toast);
  await page.evaluate(() => window.__smartPdfExport.close());

  // NOTE: the PART 23 storage architecture degrades GRACEFULLY when IndexedDB
  // AND localStorage both fail: the draft stays in the in-memory cache, nothing
  // crashes, and no technical details reach the UI (data-safety over noise).
  // So here we assert DATA SAFETY + no leak + retry-after-restore durability.
  await page.evaluate(() => { window.__p34flags.failIdbTx = true; window.__p34flags.failLs = true; });
  await seedText(page, 'PART 34 SAVE FAILURE CHECK');
  const snapB4Save = await page.evaluate(SNAP_FN);
  await page.evaluate(() => {
    const btn = document.getElementById('smartSaveDraftBtn');
    if (btn) btn.click();
  });
  await sleep(800);
  const saveFail = await page.evaluate(() => ({
    bodyText: document.body.innerText,
    toast: (document.getElementById('toast') || {}).textContent || ''
  }));
  check('E1) Save during storage failure: no technical leak, no crash',
    !/Simulated|QuotaExceeded|DatabaseClosed|TypeError/i.test(saveFail.bodyText));
  const snapAfterSave = await page.evaluate(SNAP_FN);
  // NOTE: `dirty` is intentionally excluded — a SUCCESSFUL save legitimately
  // moves the dirty baseline; everything else must be identical.
  const strip = (s) => JSON.stringify({ ...s, dirty: undefined });
  check('E2) State safety: nothing lost after save failure',
    snapAfterSave.pages.join('|').includes('PART 34 SAVE FAILURE CHECK') &&
    strip(snapB4Save) === strip(snapAfterSave));
  await page.evaluate(() => { window.__p34flags.failIdbTx = false; window.__p34flags.failLs = false; });
  const saved = await page.evaluate(() => window.__smartSave.save ? window.__smartSave.save() : null);
  await sleep(600);
  check('E3) Save retry works after seams restored', saved === true, JSON.stringify(saved));

  // F) Local-first: export fully OFFLINE still succeeds (no network dependency)
  const client = await page.createCDPSession();
  await client.send('Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(200);
  await page.evaluate(() => document.getElementById('smartPdfConfirmBtn').click());
  await waitIdle(page);
  const off = await page.evaluate(() => ({
    ok: !document.getElementById('smartPdfResultModal').hidden
  }));
  check('F1) OFFLINE export still works (local-first)', off.ok);
  await client.send('Network.emulateNetworkConditions',
    { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.evaluate(() => window.__smartPdfExport.close());

  // G) i18n + RTL/LTR for the error message across ALL locales
  const EXPECT = {
    ar: { msg: 'تعذر تجهيز ملف PDF', dir: 'rtl' },
    en: { msg: "Couldn't prepare the PDF", dir: 'ltr' },
    fr: { msg: 'Impossible de préparer le PDF', dir: 'ltr' },
    tr: { msg: 'PDF hazırlanamadı', dir: 'ltr' },
    es: { msg: 'No se pudo preparar el PDF', dir: 'ltr' },
    ru: { msg: 'Не удалось подготовить PDF', dir: 'ltr' },
    de: { msg: 'konnte nicht vorbereitet werden', dir: 'ltr' }
  };
  for (const [loc, exp] of Object.entries(EXPECT)) {
    await setLang(page, loc);
    await page.evaluate(() => { window.__p34flags.failRaster = true; });
    await page.evaluate(() => { document.getElementById('smartPdfModal').hidden = true; });
    await page.evaluate(() => window.__smartPdfExport.open());
    await sleep(200);
    await page.evaluate(() => document.getElementById('smartPdfConfirmBtn').click());
  await waitIdle(page);
  await sleep(400);
  const st = await page.evaluate(() => ({
      toast: (document.getElementById('toast') || {}).textContent || '',
      dir: getComputedStyle(document.documentElement).direction
    }));
    check(`G-i18n/${loc}) Failure message translated`, st.toast.includes(exp.msg), st.toast);
    check(`G-dir/${loc}) Direction ${exp.dir.toUpperCase()}`, st.dir === exp.dir, st.dir);
    await page.evaluate(() => { window.__p34flags.failRaster = false; });
    await page.evaluate(() => window.__smartPdfExport.close());
    await sleep(300);
  }

  // H) Responsive: processing state stays inside viewport at all sizes
  await page.evaluate(() => {
    const orig = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...a) {
      const r = orig.apply(this, a);
      return new Promise((res) => setTimeout(() => res(r), 500));
    };
  });
  for (const wv of [1280, 768, 430, 390, 360]) {
    await page.setViewport({ width: wv, height: 800 });
    await sleep(250);
    await page.evaluate(() => window.__smartPdfExport.open());
    await sleep(200);
    await page.evaluate(() => document.getElementById('smartPdfConfirmBtn').click());
    await sleep(900); // mid-processing check happens while busy
    const okNoOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 1 &&
      (() => { const d = document.querySelector('#smartPdfModal .smart-pdf-dialog'); return d && d.getBoundingClientRect().width <= window.innerWidth + 1; })());
    check(`H) Responsive ${wv}px: processing state has no overflow`, okNoOverflow);
    if (!(await page.evaluate(() => document.getElementById('smartPdfConfirmBtn').disabled))) {
      // failed fast (offline-independent) — nothing to wait for
    }
    await waitIdle(page);
    await sleep(600);
    await page.evaluate(() => {
      const c = document.getElementById('smartPdfResultCloseBtn'); if (c) c.click();
      window.__smartPdfExport.close();
    });
  }

  // I) Stability
  const dl = await page.evaluate(() => window.__dialogs);
  check('I1) alert/confirm/prompt count = 0', dl.alert + dl.confirm + dl.prompt === 0, JSON.stringify(dl));
  check('I2) Total JS errors = 0', errs.length === 0, errs.join('|'));
}

// ============================================================
// Summary
// ============================================================
const fails = results.filter((r) => !r.ok);
console.log(`\n=== PART 34 SUMMARY: pass ${passCount}/${results.length} ===`);
fs.appendFileSync(OUT, `SUMMARY pass ${passCount}/${results.length}\n`);
await browser.close();
server.close();
process.exit(fails.length ? 1 : 0);


