// tests/notesPdfMobileIsolation.browser.mjs
// PHASE — Mobile Notes → PDF print isolation verification.
// Verifies the MOBILE path of tryNativePrintNote (iPhone UA / mobile viewport):
// 1. Native print goes through the isolated IN-DOCUMENT print surface
//    (#eq-print-surface) built from buildNotePdfHtml — NOT through an iframe
//    (iframe contentWindow.print() prints the TOP document on iOS/Android).
// 2. window.print() (the top document's native print) is actually invoked.
// 3. In @media print, the app shell (.app-shell, .feature-nav, calculator,
//    header) is display:none and ONLY #eq-print-surface is visible.
// 4. Note text is opaque black (color rgb(0,0,0), opacity 1) — no wash-out.
// 5. The surface carries the note's own @page { size:A4; margin:16pt } rule.
// 6. Content completeness: Arabic (RTL body), English, table, checklist,
//    divider and image are all present in the print surface.
// 7. The surface is removed after print (afterprint), no stale DOM.
// 8. Static: the desktop iframe path and the chunked-canvas fallback
//    (buildNotePdfBlob in performNotePdfExport) are preserved in app.js.
// NOT VERIFIED — real iOS Safari unavailable in this environment: these checks
// run in emulated-mobile Chrome (device metrics + iPhone UA). The architecture
// no longer depends on iframe print() on mobile, which was the failing layer.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8499;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!p || p === '/') p = '/index.html';
  try {
    const f = path.join(ROOT, p);
    const ext = path.extname(p).toLowerCase();
    let data = fs.readFileSync(f);
    if (p === '/app.js') {
      data = Buffer.from(data.toString() + '\nwindow.__notesPdfNativeTest = { tryNativePrintNote, buildNotePdfHtml, isMobilePrintUserAgent };\n', 'utf8');
    }
    res.writeHead(200, { 'Content-Type': (MIME[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + PORT + '/';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.emulate({
  viewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
});
const errs = [], consoleErrs = [];
page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForFunction(() => !!window.__notesPdfNativeTest, { timeout: 30000 });
let pass = 0, fail = 0;
function check(id, name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + id + ' ' + name + (detail ? '  -> ' + String(detail).slice(0, 400) : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Force print media BEFORE the isolation probes — the surface CSS only takes
// effect under @media print (Chrome's default emulated media is 'screen').
page.emulateMediaType('print').catch(() => {});

const IMG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const note = {
  id: 'mi-test-1', title: 'ملاحظة الاختبار Mixed',
  dir: 'rtl',
  bodyBlocks: [
    { type: 'text', body: 'هذه فقرة عربية يجب أن تظهر بالأسود الواضح داخل ملف الـPDF.', formatting: [] },
    { type: 'text', body: 'This English paragraph must also be pure black on A4.', formatting: [] },
    { type: 'table', headers: ['البند', 'Item'], rows: [['صف أول', 'Row one'], ['صف ثانٍ', 'Row two']], aligns: [], widths: [], borderStyle: 'all' },
    { type: 'checklist', items: [{ text: 'مهمة منجزة', checked: true }, { text: 'مهمة متبقية', checked: false }] },
    { type: 'divider' },
    { type: 'image', src: IMG_1PX, alt: 'img', width: 120, align: 'center', caption: '' }
  ],
  body: '', bodyFormatting: [], updatedAt: Date.now()
};
await page.evaluate(() => {
  window.__mPrintCalled = false;
  window.print = function () { window.__mPrintCalled = true; };
});
// Probe synchronously inside one evaluate: tryNativePrintNote returns BEFORE
// its scheduled doPrint (120ms), so the surface must exist right here — no
// timing race with the afterprint teardown.
const probe = await page.evaluate((n) => {
  const routed = window.__notesPdfNativeTest.tryNativePrintNote(n);
  const s = document.getElementById('eq-print-surface');
  if (!s) return { routed, surface: null };
  const report = s.querySelector('#note-report');
  return {
    routed,
    surface: {
      arabic: s.textContent.indexOf('فقرة عربية') !== -1,
      english: s.textContent.indexOf('This English paragraph') !== -1,
      table: !!s.querySelector('table'),
      checklist: !!s.querySelector('.eq-pdf-checklist'),
      image: !!s.querySelector('img.eq-pdf-image'),
      printAreaClass: report ? report.classList.contains('note-print-area') : false,
      rtlBody: !!(s.querySelector('.eq-note-body[dir="rtl"]')),
      iframes: document.querySelectorAll('iframe').length
    }
  };
}, note);
const mobileRouted = probe.routed;
const surface = probe.surface;
check('MI1a', 'mobile UA routes native print (returns true)', mobileRouted === true, String(mobileRouted));
check('MI1b', 'isMobilePrintUserAgent detects iPhone UA', await page.evaluate(() => window.__notesPdfNativeTest.isMobilePrintUserAgent()) === true);
check('MI2a', 'in-document print surface created (#eq-print-surface)', !!surface);
check('MI2b', 'surface contains Arabic text', !!(surface && surface.arabic));
check('MI2c', 'surface contains English text', !!(surface && surface.english));
check('MI2d', 'surface contains table', !!(surface && surface.table));
check('MI2e', 'surface contains checklist', !!(surface && surface.checklist));
check('MI2f', 'surface contains image', !!(surface && surface.image));
check('MI2g', 'report root has note-print-area class (own @media print rules active)', !!(surface && surface.printAreaClass));
check('MI2h', 'Arabic note body is RTL (dir="rtl")', !!(surface && surface.rtlBody));
check('MI2i', 'NO iframe used for mobile native print (isolation from iframe bug)', surface && surface.iframes === 0, 'iframes=' + (surface && surface.iframes));
await sleep(200);
check('MI3a', 'top-window window.print() invoked (native print, not iframe print)', await page.evaluate(() => window.__mPrintCalled === true));
const printState = await page.evaluate(() => {
  const out = {};
  // Visibility check, not raw computed display: descendants of a display:none
  // ancestor keep their own computed display value, so use rendered-rect count
  // (a hidden subtree produces zero client rects) for the app shell members.
  const hidden = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'missing';
    return el.getClientRects().length === 0 || el.offsetParent === null ? 'hidden' : 'visible';
  };
  out.appShell = hidden('.app-shell');
  out.featureNav = hidden('.feature-nav');
  out.calculator = hidden('.calculator-card') + '|' + hidden('.keypad-grid') + '|' + hidden('.primary-display');
  out.surface = hidden('#eq-print-surface');
  out.surfaceVisible = (() => { const s = document.getElementById('eq-print-surface'); return s ? s.getClientRects().length > 0 : false; })();
  const tb = document.querySelector('#eq-print-surface .eq-pdf-text-block');
  if (tb) {
    const cs = getComputedStyle(tb);
    out.textBlockColor = cs.color;
    out.textBlockOpacity = cs.opacity;
  }
  out.pageRule = '';
  const st = document.getElementById('eq-print-surface-style');
  if (st && st.sheet) {
    const walk = (rules) => {
      for (const r of rules) {
        if (r.type === CSSRule.PAGE_RULE) { out.pageRule = r.cssText; return true; }
        if (r.cssRules && walk(r.cssRules)) return true;
      }
      return false;
    };
    walk(st.sheet.cssRules);
  }
  return out;
});

check('MI4a', '@media print: .app-shell hidden', printState.appShell === 'hidden', printState.appShell);
check('MI4b', '@media print: .feature-nav hidden', printState.featureNav === 'hidden', printState.featureNav);
check('MI4c', '@media print: calculator (card/keypad/display) hidden', printState.calculator === 'hidden|hidden|hidden', printState.calculator);
check('MI4d', '@media print: #eq-print-surface is the visible print page', printState.surfaceVisible === true, 'rects>0=' + printState.surfaceVisible);
check('MI5a', 'note text is opaque (opacity 1) in print', printState.textBlockOpacity === '1', printState.textBlockOpacity);
check('MI5b', 'note text is black rgb(0,0,0) in print', printState.textBlockColor === 'rgb(0, 0, 0)', printState.textBlockColor);
check('MI6a', 'surface carries @page { size:A4 } from buildNotePdfHtml', /size:\s*A4/i.test(printState.pageRule || ''), printState.pageRule);
// Now end the print cycle: dispatch afterprint (like a real browser does after
// the print dialog closes) and verify the surface teardown.
await page.evaluate(() => { try { window.dispatchEvent(new Event('afterprint')); } catch (e) {} });
await sleep(150);
check('MI7a', 'print surface removed after print cycle (no stale DOM)', await page.evaluate(() => !document.getElementById('eq-print-surface')));
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
check('MI8a', 'desktop iframe path preserved (contentWindow.print + off-screen frame)', appSource.indexOf('frame.contentWindow.print()') !== -1 && appSource.indexOf('left:-9999px;top:0;width:794px;height:1123px') !== -1);
check('MI8b', 'chunked-canvas fallback preserved (buildNotePdfBlob in performNotePdfExport)', /performNotePdfExport[\s\S]{0,1800}buildNotePdfBlob\(note\)/.test(appSource));
check('MI8c', 'mobile reroute wired inside tryNativePrintNote', appSource.indexOf('isMobilePrintUserAgent() && tryInDocumentPrintNote(note)') !== -1);
check('MI9a', 'No JS exceptions during mobile isolation tests', errs.length === 0, errs.slice(0, 4).join(' | '));
console.log('\nNOTE: real iOS Safari unavailable here — checks run on emulated-mobile Chrome (iPhone UA, 390x844, touch). NOT VERIFIED — real iOS Safari unavailable.');
console.log('SUMMARY: PASS=' + pass + ' FAIL=' + fail);
await browser.close();
await server.close();
process.exit(fail === 0 ? 0 : 1);

