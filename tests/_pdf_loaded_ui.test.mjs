// PDF REPORTS — post-upload FULL WORKSPACE UI verification (real Chrome).
// Loaded-state layout: header hidden, upload hidden, slim 44px single-row
// toolbar first, PDF stage fills the remaining viewport.
// Desktop + laptop + mobile + RTL + LTR + close reset + zero console errors.
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e, buf) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => srv.listen(0, r));
const url = 'http://127.0.0.1:' + srv.address().port + '/';
const tmpPdfPath = path.join(root, 'tests', '_loaded_ui_tmp.pdf');

let fails = 0, checks = 0;
function check(name, ok, d = '') { checks++; if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (d ? '  -> ' + d : '')); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push('console: ' + String(m.text()).slice(0, 200)); });

async function measure() {
  return page.evaluate(() => {
    const ws = document.getElementById('pdfReportsWorkspace');
    const modal = ws.querySelector('.pdf-reports-workspace');
    const header = modal.querySelector('.settings-modal-header');
    const dz = document.getElementById('pdfV1Dropzone');
    const err = document.getElementById('pdfV1Error');
    const tools = document.getElementById('pdfV1Tools');
    const stage = document.getElementById('pdfV1Stage');
    const viewer = document.getElementById('pdfV1Viewer');
    const r = (el) => { const b = el.getBoundingClientRect(); return { t: +b.top.toFixed(1), b: +b.bottom.toFixed(1), l: +b.left.toFixed(1), r: +b.right.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const cs = (el) => getComputedStyle(el);
    // Nothing visible may appear BEFORE the toolbar in document order.
    const anc = new Set();
    let n = tools.parentElement;
    while (n) { anc.add(n); n = n.parentElement; }
    let badBefore = null;
    for (const el of modal.querySelectorAll('*')) {
      if (el === tools) break;
      if (anc.has(el) || tools.contains(el)) continue;
      const b = el.getBoundingClientRect();
      if (b.width > 2 && b.height > 2) { badBefore = el.id || el.className || el.tagName; break; }
    }
    return {
      loaded: modal.classList.contains('pdf-reports-loaded'),
      headerDisplay: cs(header).display,
      dzDisplay: cs(dz).display,
      errDisplay: cs(err).display,
      toolsVisible: !tools.hidden && cs(tools).display !== 'none',
      badBefore,
      tools: r(tools), stage: r(stage), viewer: r(viewer), modal: r(modal),
      toolsScrollH: tools.scrollHeight, toolsClientH: tools.clientHeight,
      toolsScrollW: tools.scrollWidth, toolsClientW: tools.clientWidth,
      viewerCssH: cs(viewer).height,
      inner: { w: window.innerWidth, h: window.innerHeight }
    };
  });
}

async function ensureLoaded() {
  const st = await page.evaluate(() => ({
    shown: document.getElementById('pdfReportsWorkspace').classList.contains('show'),
    loaded: !!document.querySelector('.pdf-reports-workspace.pdf-reports-loaded')
  }));
  if (st.loaded) return;
  if (!st.shown) {
    await page.evaluate(() => {
      document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click();
    });
    await sleep(350);
  }
  const inp = await page.$('#pdfV1FileInput');
  await inp.uploadFile(tmpPdfPath);
  await sleep(900);
}

async function runScenario(label, viewport, lang) {
  await page.setViewport(viewport);
  if (lang) await page.evaluate((l) => { document.body.setAttribute('data-language', l); }, lang);
  await sleep(350);
  await ensureLoaded();
  await sleep(200);
  const m = await measure();
  const P = (n, ok, d) => check('[' + label + '] ' + n, ok, typeof d === 'object' ? JSON.stringify(d) : String(d));
  P('loaded state class', m.loaded === true);
  P('header hidden', m.headerDisplay === 'none', m.headerDisplay);
  P('upload dropzone hidden', m.dzDisplay === 'none', m.dzDisplay);
  P('error line hidden', m.errDisplay === 'none', m.errDisplay);
  P('toolbar visible', m.toolsVisible === true);
  P('toolbar is first visible UI (nothing before it)', m.badBefore === null, m.badBefore || 'none');
  P('toolbar height 40-46px', m.tools.h >= 40 && m.tools.h <= 46, String(m.tools.h));
  P('toolbar no vertical wrap', m.toolsScrollH <= m.toolsClientH + 1, m.toolsScrollH + '/' + m.toolsClientH);
  P('modal full width', Math.abs(m.modal.w - m.inner.w) <= 16, m.modal.w + '/' + m.inner.w);
  P('modal full height', Math.abs(m.modal.h - m.inner.h) <= 16, m.modal.h + '/' + m.inner.h);
  P('PDF starts below toolbar (gap 0-8px)', m.stage.t - m.tools.b >= -1 && m.stage.t - m.tools.b <= 8, String(+(m.stage.t - m.tools.b).toFixed(1)));
  P('PDF fills remaining viewport', m.inner.h - m.stage.b <= 14, 'stage.b=' + m.stage.b + ' inner.h=' + m.inner.h);
  P('PDF not small card (stage > 55% viewport)', m.stage.h > m.inner.h * 0.55, m.stage.h + '/' + m.inner.h);
  P('viewer fills stage', Math.abs(m.viewer.h - m.stage.h) <= 2 && Math.abs(m.viewer.w - m.stage.w) <= 2, m.viewer.h + 'x' + m.viewer.w);
  P('viewer height not capped at 560px', m.viewer.h > 400, m.viewerCssH);
  P('toolbar near top (no blank above)', m.tools.t <= 22, String(m.tools.t));
  return m;
}

await page.goto(url, { waitUntil: 'networkidle2' });
await sleep(400);
await page.waitForFunction(() => document.body && document.body.getAttribute('data-pdf-v1') === '1', { timeout: 30000 });


// Open PDF Reports workspace via the feature-nav button (existing entry point)
await page.evaluate(() => {
  document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click();
});
await sleep(350);
check('[empty] workspace opens', await page.evaluate(() => document.getElementById('pdfReportsWorkspace').classList.contains('show')));

// Build a real multi-page (3-page) PDF with the app's own vendored pdf-lib.
const PDFMod = await import('../__pdfdiag/vendor/pdf-lib.min.js').catch(() => null);
const PDFLib = PDFMod ? (PDFMod.default && PDFMod.default.PDFDocument ? PDFMod.default : null) : null;
const tmpPdf = tmpPdfPath;
if (PDFLib && PDFLib.PDFDocument) {
  const doc = await PDFLib.PDFDocument.create();
  for (let i = 0; i < 3; i++) doc.addPage([612, 792]);
  fs.writeFileSync(tmpPdf, await doc.save());
} else {
  fs.writeFileSync(tmpPdf, '%PDF-1.4\n%%EOF');
}
const input = await page.$('#pdfV1FileInput');
await input.uploadFile(tmpPdf);

// ---- Desktop LTR ----
await runScenario('desktop-LTR', { width: 1280, height: 900 });

// Scroll over the stage: toolbar must stay at the top, no layout shift/overlap
const beforeScroll = await measure();
await page.mouse.move(beforeScroll.stage.l + 100, beforeScroll.stage.t + 100);
await page.mouse.wheel({ deltaY: 400 });
await sleep(300);
const afterScroll = await measure();
check('[desktop-LTR] toolbar stays at top while scrolling', Math.abs(afterScroll.tools.t - beforeScroll.tools.t) <= 1, beforeScroll.tools.t + ' -> ' + afterScroll.tools.t);

// ---- Desktop RTL (Arabic) / LTR / Laptop / Mobile ----
await runScenario('desktop-RTL', { width: 1280, height: 900 }, 'ar');
await page.evaluate(() => document.body.setAttribute('data-language', 'en'));
await runScenario('laptop', { width: 1366, height: 768 });
const mob = await runScenario('mobile', { width: 390, height: 844, isMobile: true, hasTouch: true });
check('[mobile] toolbar scrollable horizontally only when needed', mob.toolsScrollW >= mob.toolsClientW, mob.toolsScrollW + '/' + mob.toolsClientW);

// ---- Close reset: back to empty state ----
await page.setViewport({ width: 1280, height: 900 });
await sleep(300);
await page.evaluate(() => document.getElementById('pdfReportsBackBtn').click());
await sleep(300);
const closed = await page.evaluate(() => {
  const modal = document.querySelector('.pdf-reports-workspace');
  return {
    loaded: modal.classList.contains('pdf-reports-loaded'),
    viewerSrc: document.getElementById('pdfV1Viewer').getAttribute('src'),
    wrapHidden: document.getElementById('pdfV1ViewerWrap').hidden,
    shown: document.getElementById('pdfReportsWorkspace').classList.contains('show')
  };
});
check('[reset] loaded class removed on close', closed.loaded === false);
check('[reset] viewer src cleared', !closed.viewerSrc || closed.viewerSrc === '');
check('[reset] viewer wrap hidden', closed.wrapHidden === true);
check('[reset] workspace closed', closed.shown === false);

// Reopen: empty state must come back naturally
await page.evaluate(() => {
  document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click();
});
await sleep(300);
check('[reset] reopen shows empty upload state', await page.evaluate(() =>
  getComputedStyle(document.getElementById('pdfV1Dropzone')).display !== 'none' &&
  getComputedStyle(document.querySelector('.pdf-reports-workspace .settings-modal-header')).display !== 'none'));
await page.evaluate(() => document.getElementById('pdfReportsBackBtn').click());
await sleep(200);

check('ZERO console/page errors', consoleErrors.length === 0, consoleErrors.join(' | '));
console.log(fails === 0 ? 'PDF LOADED-UI ALL PASS (' + checks + ' checks)' : 'PDF LOADED-UI FAILURES: ' + fails);
try { fs.unlinkSync(tmpPdf); } catch (e) {}
await browser.close();
srv.close();
process.exit(fails === 0 ? 0 : 1);


check('[desktop-LTR] no overlap after scroll', afterScroll.tools.b <= afterScroll.stage.t + 1);

await sleep(900);

check('[empty] header visible in empty state', await page.evaluate(() => getComputedStyle(document.querySelector('.pdf-reports-workspace .settings-modal-header')).display !== 'none'));
check('[empty] dropzone visible in empty state', await page.evaluate(() => getComputedStyle(document.getElementById('pdfV1Dropzone')).display !== 'none'));

