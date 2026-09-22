// PDF BUTTON FIRST-CLICK RACE PROOF — deterministic, real-Chrome.
// Forces the EXACT race that caused "PDF button needs several clicks":
// the init-time html2pdf preload is artificially slowed so a PDF tap lands while
// the library <script> exists but window.html2pdf is still undefined.
//   OLD code: loadExternalScript resolved on tag-presence -> first tap failed.
//   NEW code: loadExternalScript waits for the in-flight preload -> first tap works.
// Test-only artifact; does NOT modify app.js / index.html / styles.css.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8420;
const PDF_CDN = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
const PRELOAD_DELAY_MS = 1500; // keep preload in-flight but short enough to survive reload

// Fast, deterministic html2pdf fixture so the REAL buildNotePdfBlob pipeline
// completes with a genuine application/pdf Blob (no headless html2canvas hang).
const FIXTURE = `
(function () {
  var api = {
    set: function () { return api; },
    from: function () { return api; },
    toPdf: function () { return api; },
    output: function (t) {
      return Promise.resolve(new Blob(['%PDF-1.4\\n% first-click-fixture'], { type: 'application/pdf' }));
    }
  };
  window.html2pdf = function () { return api; };
  if (window.__eqScriptDone) window.__eqScriptDone.ok = true;
})();
`;

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    // A/B: allow the harness to serve an alternate app file as /app.js so the
    // SAME first-click race can be re-run against the pre-fix behavior.
    if (p === '/app.js' && process.env.APP_JS && process.env.APP_JS !== 'app.js') {
      const alt = path.join(HERE, process.env.APP_JS);
      if (fs.existsSync(alt)) {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        res.end(fs.readFileSync(alt));
        return;
      }
    }
    const f = path.join(ROOT, p);
    const e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (err) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fail++;
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

async function runScenario(label, vp, locale, delayMs) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url() === PDF_CDN || req.url().includes('html2pdf.bundle.min.js')) {
      setTimeout(() => {
        try { req.respond({ status: 200, contentType: 'application/javascript', body: FIXTURE }); } catch (e) {}
      }, delayMs);
      return;
    }
    req.continue();
  });
  await page.evaluateOnNewDocument(() => {
    window.__pdfUrls = []; window.__eqErrors = [];
    try {
      const orig = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (obj) => { const u = orig(obj); if (obj && obj.type === 'application/pdf') window.__pdfUrls.push({ u }); return u; };
    } catch (e) {}
    // Force the deterministic download path (no native Share Sheet in headless)
    // so a completed buildNotePdfBlob resolvs into a captured PDF blob URL.
    try { Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }); } catch (e) {}
    try { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); } catch (e) {}
    window.addEventListener('error', (e) => window.__eqErrors.push(String(e.message || e.error)));
  });

  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(120);
  await page.evaluate((l) => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); localStorage.setItem('eq-language', l); }, locale);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(120);

  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'FirstClick ' + Date.now(); });

  const state = await page.evaluate(() => ({
    tagPresent: !!document.querySelector('script[src*="html2pdf"]'),
    libDefined: typeof window.html2pdf !== 'undefined'
  }));
  const rect = await page.evaluate(() => { const r = document.getElementById('exportNotePdfBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });

  const t1 = Date.now();
  // Track whether the PDF pipeline actually begins (buildNotePdfBlob appends its
  // hidden capture iframe) and any console errors during the run.
  const consoleMsgs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push('[' + m.type() + '] ' + m.text()); });
  page.on('pageerror', (e) => consoleMsgs.push('[pageerror] ' + e.message));
  const iframesBefore = await page.evaluate(() => document.body.querySelectorAll('iframe').length);
  await page.mouse.click(rect.x, rect.y); // the ONE real press

  let blobUrls = 0, toast = '', done = false, started = false;
  while (Date.now() - t1 < 20000) {
    const st = await page.evaluate(() => ({
      urls: (window.__pdfUrls || []).length,
      toast: (document.getElementById('toast') ? document.getElementById('toast').textContent.trim() : ''),
      lib: typeof window.html2pdf,
      frames: document.body.querySelectorAll('iframe').length
    }));
    blobUrls = st.urls; toast = st.toast;
    if (st.frames > iframesBefore) started = true;
    if (st.urls > 0) { done = true; break; }
    if (st.toast && /fail|unavailable|invalid|no-internet/i.test(st.toast)) { done = true; break; }
    await sleep(50);
  }
  const elapsed = Date.now() - t1;
  const errs = await page.evaluate(() => (window.__eqErrors || []).slice(0, 3));
  const ok = blobUrls > 0;
  console.log(`${label} ${locale}: racingWindow=${state.tagPresent && !state.libDefined} | pipelineStarted=${started} | clicksNeeded=${ok ? 1 : '>1'} | pdfBlobs=${blobUrls} | toast="${toast}" | done@${elapsed}ms${errs.length ? ' | errs=' + JSON.stringify(errs) : ''}${consoleMsgs.length ? ' | console=' + JSON.stringify(consoleMsgs.slice(0, 2)) : ''}`);
  check(`${label} ${locale} — ONE tap starts & completes PDF`, ok, ok ? '' : ('blob=0 toast=' + toast));
  check(`${label} — tap landed while preload in-flight`, state.tagPresent && !state.libDefined, 'tag=' + state.tagPresent + ' lib=' + state.libDefined);
  await page.close();
  return ok;
}

const scenarios = [
  { label: 'Desktop-1280', vp: { width: 1280, height: 800 }, locale: 'en' },
  { label: 'Desktop-1280-RTL', vp: { width: 1280, height: 800 }, locale: 'ar' },
  { label: 'Tablet-768-RTL', vp: { width: 768, height: 800, hasTouch: true, isMobile: true }, locale: 'ar' },
  { label: 'Mobile-390-RTL', vp: { width: 390, height: 844, hasTouch: true, isMobile: true }, locale: 'ar' },
  { label: 'Mobile-430-LTR', vp: { width: 430, height: 900, hasTouch: true, isMobile: true }, locale: 'en' },
  { label: 'Small-360-RTL', vp: { width: 360, height: 720, hasTouch: true, isMobile: true }, locale: 'ar' }
];

let firstClickOk = 0, firstClickTotal = 0;
for (const s of scenarios) {
  const ok = await runScenario(s.label, s.vp, s.locale, PRELOAD_DELAY_MS);
  firstClickTotal++;
  if (ok) firstClickOk++;
}

console.log(`\n==== FIRST-CLICK SUMMARY: ${firstClickOk}/${firstClickTotal} succeeded from a SINGLE press ====`);
await browser.close();
server.close();
process.exit(firstClickOk === firstClickTotal ? 0 : 1);
