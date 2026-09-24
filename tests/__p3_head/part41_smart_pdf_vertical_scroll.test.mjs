// PART 41 — SMART DOCUMENTS: imported-PDF VERTICAL SCROLL container.
// The PDF pages live inside a single vertical scroll region below the fixed
// toolbar, so a user can scroll between all pages smoothly. Proves:
//  - a real scroll container exists (scrollHeight > clientHeight)
//  - scrollTop can increase and return to 0
//  - every page is reachable and the LAST page is fully visible at max scroll
//  - no horizontal overflow (scrollWidth === clientWidth)
//  - text editing / selection still works after scrolling
//  - toolbar Back/Save/Send stay visible & clickable
//  - touch emulation (isMobile + hasTouch) drives vertical scroll
// Run:  node tests/part41_smart_pdf_vertical_scroll.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require2 = createRequire(import.meta.url);
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8367;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm', '.pdf': 'application/pdf' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, u)); res.writeHead(200, { 'Content-Type': mimeOf(u) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 300000);

const results = [];
function check(name, ok, detail = '') { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });

const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
const fixturePath = path.join(ROOT, '__part41.pdf');
async function buildFixture(pOut) {
  const doc = await pdfLib.PDFDocument.create();
  const f = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  for (let i = 1; i <= 5; i++) {
    const p = doc.addPage([595.28, 841.89]);
    p.drawText(`PAGE ${i} The quick brown fox jumps over the lazy dog`, { x: 72, y: 770, size: 14, font: f });
    p.drawText(`End marker for page ${i}`, { x: 72, y: 746, size: 12, font: f });
  }
  fs.writeFileSync(pOut, Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })));
}
await buildFixture(fixturePath);

async function initPage(viewport, locale) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  // Match the rest of the suite: only uncaught page errors count as JS errors
  // (the app emits benign console warnings for a pre-existing drawer SVG path and
  // missing-resource 404 headers; those are not JS exceptions).
  page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  if (locale) {
    await page.evaluate((l) => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); } }, locale);
    await sleep(350);
  }
  return { page, errs };
}
async function openDrawer(page) { await page.evaluate(() => document.getElementById('drawerToggle').click()); await sleep(250); }
async function clickSmartDocs(page) { await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click()); await sleep(400); }
async function pickFile(page) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 9000 }),
    page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click())
  ]);
  await chooser.accept([fixturePath]);
}
async function waitFor(page, fn, t = 15000) { const s = Date.now(); while (Date.now() - s < t) { if (await page.evaluate(fn)) return true; await sleep(120); } return false; }
async function importLoaded(page) {
  await openDrawer(page); await clickSmartDocs(page); await pickFile(page);
  return await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length >= 5);
}
async function settle(page) { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await sleep(500); await page.evaluate(() => new Promise((r) => requestAnimationFrame(r))); await sleep(250); }

// Measure scroll / layout facts of the PDF container.
async function scrollFacts(page) {
  return await page.evaluate(() => {
    const ed = document.querySelector('#smartPdfEditor');
    const cs = getComputedStyle(ed);
    const scan = document.querySelector('#smartEditorView > .smart-scan-header');
    return { sh: ed.scrollHeight, ch: ed.clientHeight, st: ed.scrollTop, sw: ed.scrollWidth, cw: ed.clientWidth,
      ovY: cs.overflowY, ovX: cs.overflowX, nPages: document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length,
      toolbarBottom: scan ? Math.round(scan.getBoundingClientRect().bottom) : 0 };
  });
}
async function runDesktop() {
  const { page, errs } = await initPage({ width: 1280, height: 800 }, 'en');
  const ok = await importLoaded(page);
  check('D.import 5-page PDF into editor', ok);
  await settle(page);
  const f1 = await scrollFacts(page);
  check('D.container overflow-y auto, overflow-x hidden', f1.ovY === 'auto' && f1.ovX === 'hidden', JSON.stringify({ ovY: f1.ovY, ovX: f1.ovX }));
  check('D.scrollHeight > clientHeight (scrollable)', f1.sh > f1.ch, `sh=${f1.sh} ch=${f1.ch}`);
  check('D.no horizontal overflow (sw===cw)', f1.sw === f1.cw, `sw=${f1.sw} cw=${f1.cw}`);
  check('D.all 5 pages inside the container', f1.nPages === 5, 'pages=' + f1.nPages);

  const p2res = await page.evaluate(() => {
    const ed = document.querySelector('#smartPdfEditor');
    ed.scrollTop = ed.clientHeight * 0.6;   // scroll past page 1
    return ed.scrollTop;
  });
  check('D.scrollTop can increase', p2res > 0, 'st=' + p2res);

  // scroll to bottom -> last page fully visible
  const last = await page.evaluate(async () => {
    const ed = document.querySelector('#smartPdfEditor');
    ed.scrollTop = ed.scrollHeight;
    await new Promise((r) => requestAnimationFrame(r));
    const lastPage = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-page')).pop();
    const lr = lastPage.getBoundingClientRect();
    const scan = document.querySelector('#smartEditorView > .smart-scan-header');
    return { st: ed.scrollTop, max: ed.scrollHeight - ed.clientHeight,
      lastBottom: Math.round(lr.bottom), lastTop: Math.round(lr.top),
      toolbarBottom: Math.round(scan.getBoundingClientRect().bottom), vh: window.innerHeight };
  });
  check('D.scroll reaches the max scroll position', last.st === last.max, `st=${last.st} max=${last.max}`);
  // An A4 page can be taller than the scroll viewport, so "fully visible" means
  // the last page's BOTTOM is inside the viewport AND not hidden under the toolbar.
  check('D.last page reachable & not cut off (bottom in viewport, below toolbar)',
    last.lastBottom <= last.vh && last.lastBottom >= last.toolbarBottom, JSON.stringify(last));

  const back = await page.evaluate(() => { const ed = document.querySelector('#smartPdfEditor'); ed.scrollTop = 0; return ed.scrollTop; });
  check('D.scrollTop returns to 0', back === 0, 'st=' + back);

  // editing still works AFTER scrolling (edit last page word)
  await page.evaluate(() => { const ed = document.querySelector('#smartPdfEditor'); ed.scrollTop = ed.scrollHeight; });
  await sleep(150);
  const ready = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'));
    const sp = spans.find((s) => /PAGE 5/.test(s.textContent || ''));
    if (!sp) return false;
    const node = [...sp.childNodes].find((nd) => nd.nodeType === 3 && nd.textContent.includes('PAGE')) || sp.firstChild;
    const start = node.textContent.indexOf('5');
    const r = document.createRange(); r.setStart(node, start); r.setEnd(node, start + 1);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    sp.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    window.__page5 = sp; return true;
  });
  if (ready) {
    await page.keyboard.press('9');
    await sleep(120);
    await page.evaluate(() => { const sp = window.__page5; if (sp && sp.isContentEditable) sp.blur(); });
    await sleep(160);
  }
  const editOk = await page.evaluate(() => Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text')).some((s) => /PAGE 9/.test(s.textContent || '')));
  check('D.editing still works after scrolling (page 5 edited)', editOk, '');
  check('D.no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();
}
let MODE = process.env.P41_MODE || 'all';
if (MODE === 'desktop' || MODE === 'all') await runDesktop();

async function runMobile() {
  // Mobile emulation with touch (isMobile + hasTouch).
  const { page, errs } = await initPage({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, 'en');
  const ok = await importLoaded(page);
  check('M.import 5-page PDF (mobile/touch)', ok);
  await settle(page);
  const f = await scrollFacts(page);
  check('M.container can scroll (sh>ch)', f.sh > f.ch, `sh=${f.sh} ch=${f.ch}`);
  check('M.no horizontal overflow (sw===cw)', f.sw === f.cw, `sw=${f.sw} cw=${f.cw}`);
  check('M.all pages present', f.nPages === 5, 'n=' + f.nPages);

  // Real touch swipe (finger down -> move up -> up) drives the scroll container.
  const cdp = await page.createCDPSession();
  await page.evaluate(() => { const ed = document.querySelector('#smartPdfEditor'); ed.scrollTop = 0; });
  await sleep(100);
  const beforeSt = await page.evaluate(() => document.querySelector('#smartPdfEditor').scrollTop);
  const cx = 195;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: 720 }] });
  for (let y = 720; y >= 360; y -= 45) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y }] });
    await sleep(18);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(450);
  const afterTouch = await page.evaluate(() => document.querySelector('#smartPdfEditor').scrollTop);
  check('M.touch swipe moved the PDF downward (scrollTop increased)', afterTouch > 0, `before=${beforeSt} after=${afterTouch}`);
  check('M.no JS errors (touch)', errs.length === 0, errs.join(' | '));
  await page.close();
}
async function runRTL() {
  const { page, errs } = await initPage({ width: 360, height: 800, isMobile: true, hasTouch: true }, 'ar');
  const ok = await importLoaded(page);
  check('R.import under Arabic/RTL', ok);
  await settle(page);
  const f = await scrollFacts(page);
  const dir = await page.evaluate(() => document.body.getAttribute('data-language'));
  check('R.RTL active (body data-language=ar)', dir === 'ar', 'dir=' + dir);
  check('R.no horizontal overflow (sw===cw)', f.sw === f.cw, `sw=${f.sw} cw=${f.cw}`);
  const st = await page.evaluate(() => { const ed = document.querySelector('#smartPdfEditor'); ed.scrollTop = ed.scrollHeight; return ed.scrollTop; });
  check('R.vertical scroll works the same in RTL', st > 0 && st === (await page.evaluate(() => document.querySelector('#smartPdfEditor').scrollHeight - document.querySelector('#smartPdfEditor').clientHeight)), 'st=' + st);
  // toolbar still present & visible under RTL
  const tb = await page.evaluate(() => {
    const ids = ['smartEditorBack', 'smartEditorSaveBtn', 'smartEditorSendBtn'];
    return ids.every((id) => { const el = document.getElementById(id); if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; });
  });
  check('R.Back/Save/Send visible & touchable in RTL', tb, '');
  check('R.no JS errors', errs.length === 0, errs.join(' | '));
  await page.close();
}
if (MODE === 'mobile' || MODE === 'all') await runMobile();
if (MODE === 'rtl' || MODE === 'all') await runRTL();

// ---- Summary ----
const failed = results.filter((r) => !r.ok).length;
console.log(`SUMMARY: ${results.length - failed}/${results.length} checks passed`);
browser.close().catch(() => {});
server.close(() => {});
try { fs.unlinkSync(fixturePath); } catch (e) {}
try { fs.unlinkSync('__part41_saved.pdf'); } catch (e) {}
process.exit(failed ? 1 : 0);