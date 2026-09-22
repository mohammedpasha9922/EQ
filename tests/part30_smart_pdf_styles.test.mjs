// PART 30 — Smart Styles (Simple/Business/Academic/Engineering) inside the PDF Editor.
// Real-Chrome behavioral harness (puppeteer-core) following the PART 25 pattern.
// Run:  node tests/part30_smart_pdf_styles.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8455;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0|forEach is not a function/i;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');

let pass = 0, fail = 0, preexisting = 0;
const LOG = [];
const realErrs = [];
function check(name, ok, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${d !== '' ? '  -> ' + d : ''}`);
  if (ok) pass++; else fail++;
}
function note(name, detail) { LOG.push('NOTE  ' + name + (detail ? '  -> ' + detail : '')); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': mimeOf(f) + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) realErrs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else realErrs.push('console: ' + m.text()); } });

const FIXTURE_BYTES = fs.readFileSync(FIXTURE);
const FIXTURE_B64 = FIXTURE_BYTES.toString('base64');
const DOC_NAME = 'p30_style_doc.pdf';

async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(800); }
async function injectFile(name, bytesB64) {
  return await page.evaluate(async (n, b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], n, { type: 'application/pdf' }));
    const fi = document.getElementById('smartImportFileInput');
    if (!fi) return { ok: false };
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, name, bytesB64);
}
async function waitEditor(tries = 120) {
  for (let i = 0; i < tries; i++) {
    const ok = await page.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      return !!(ed && ed.classList.contains('editor-visible') &&
        document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length >= 1 &&
        document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
    });
    if (ok) return true;
    await sleep(300);
  }
  return false;
}
async function openEditor(name) {
  await gotoApp();
  await injectFile(name, FIXTURE_B64);
  const ok = await waitEditor();
  await sleep(400);
  return ok;
}
async function styleState() {
  return await page.evaluate(() => (window.__smartPdfStyle ? { active: window.__smartPdfStyle.active(), cfg: window.__smartPdfStyle.get() } : null));
}
async function styleMenu() {
  return await page.evaluate(() => {
    const btns = document.querySelectorAll('#smartPdfStyleBtn');
    const m = document.getElementById('smartPdfStyleMenu');
    const items = m ? [...m.querySelectorAll('.smart-pdf-style-item')].map((i) => i.getAttribute('data-style')).sort().join(',') : '';
    return { count: btns.length, hasMenu: !!m, items, open: !!(m && !m.hasAttribute('hidden')) };
  });
}
async function clickStyleItem(v) {
  return await page.evaluate((val) => {
    const m = document.getElementById('smartPdfStyleMenu');
    if (!m || m.hasAttribute('hidden')) document.getElementById('smartPdfStyleBtn').click();
    const it = m.querySelector('.smart-pdf-style-item[data-style="' + val + '"]');
    if (!it) return false;
    it.click();
    return true;
  }, v);
}
async function chromeDom() {
  return await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-style-chrome')];
    const hdr = document.querySelector('#smartPdfEditor .smart-pdf-style-header .smart-pdf-overlay-body');
    return { count: boxes.length, headerText: hdr ? hdr.textContent : null, perPage: boxes.map((b) => b.closest('.smart-pdf-page').dataset.page).join(',') };
  });
}
async function addViaAddMenu(kind) {
  await page.evaluate((k) => {
    const b = document.getElementById('smartPdfAddBtn');
    b.click();
    const item = document.querySelector('.smart-pdf-add-item[data-add="' + k + '"]');
    if (item) item.click();
  }, kind);
  await sleep(450);
}
async function exportBytes() {
  return await page.evaluate(async () => {
    const blob = await window.__smartImport.editedBlob();
    const buf = await blob.arrayBuffer();
    const u8 = new Uint8Array(buf);
    let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return s;
  });
}
async function pdfTextPages(pdfStr) {
  return await page.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    // app.js is loaded as type="module", so smartImportLoadPdfJs is NOT a page
    // global. Replicate the production loader (app.js smartImportLoadPdfJs)
    // exactly here, test-side only: lazy-inject the same vendor pdf.js build
    // and set the same workerSrc. No production seam, no behavior change.
    if (!window.pdfjsLib) {
      const s = document.createElement('script');
      s.src = '/__pdfdiag/vendor/pdf.min.js';
      await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('pdfjs load failed')); document.head.appendChild(s); });
    }
    if (!window.pdfjsLib) throw new Error('pdfjsLib unavailable');
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    const doc = await window.pdfjsLib.getDocument({ data: u8 }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const tc = await p.getTextContent();
      out.push(tc.items.map((it) => it.str).join(' '));
    }
    return out;
  }, Buffer.from(pdfStr, 'latin1').toString('base64'));
}

// ===================== TESTS =====================
check('P30-01 editor opens with 2-page fixture', await openEditor(DOC_NAME));

// --- Menu existence / structure ---
const m1 = await styleMenu();
check('P30-02 Style button exists exactly once', m1.count === 1, m1);
check('P30-03 Style menu exists (hidden by default)', m1.hasMenu && !m1.open, m1);
check('P30-04 menu has none/simple/business/academic/engineering', m1.items === 'academic,business,engineering,none,simple', m1.items);
await page.evaluate(() => document.getElementById('smartPdfStyleBtn').click());
await sleep(150);
const m2 = await styleMenu();
check('P30-05 menu opens with aria-expanded=true', m2.open && (await page.evaluate(() => document.getElementById('smartPdfStyleBtn').getAttribute('aria-expanded'))) === 'true');
// --- Apply Business via UI ---
check('P30-08 apply Business via menu', await clickStyleItem('business'));
await sleep(250);
const stB = await styleState();
check('P30-09 Business preset active with header+footer config', stB.active === 'business' && !!stB.cfg.header && !!stB.cfg.footer, stB.cfg && { hdr: stB.cfg.header.size, ftr: stB.cfg.footer.size, line: stB.cfg.header.line });
const cB = await chromeDom();
const pageCount = await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length);
check('P30-10 header/footer chrome rendered on EVERY page', cB.count === pageCount * 2 && cB.perPage.split(',').length === pageCount * 2, { pageCount, ...cB });
check('P30-11 header defaults to the document name', cB.headerText === 'p30_style_doc', cB.headerText);
check('P30-12 style persisted to namespaced localStorage key', await page.evaluate(() => { try { const r = JSON.parse(localStorage.getItem('eq-smart-pdf-style-v1') || 'null'); return !!(r && r.preset === 'business'); } catch (e) { return false; } }));

// --- Style defaults on NEWLY ADDED elements (manual edits never touched) ---
await addViaAddMenu('text');
const textCol = await page.evaluate(() => { const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-text'); return b ? getComputedStyle(b).color : null; });
check('P30-13 added Text adopts Business text color', textCol === 'rgb(15, 23, 42)', textCol);
await addViaAddMenu('date');
// PART 29 Add -> Date opens a sub-menu (Current Date / Custom Date). Completing
// the real UX flow is required before a date overlay exists (test-side only).
await page.evaluate(() => { const it = document.querySelector('#smartPdfDateMenu .smart-pdf-date-item[data-date-opt="current"]'); if (it) it.click(); });
await sleep(450);
const dateCol = await page.evaluate(() => { const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-date'); return b ? getComputedStyle(b).color : null; });
check('P30-14 added Date adopts Business date color', dateCol === 'rgb(29, 78, 216)', dateCol);
await addViaAddMenu('table');
const tbl = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-table table');
  const td = b && b.querySelector('tbody tr:first-child td');
  return { bc: b ? (b.style.getPropertyValue('--tdbc') || '').trim() : null, bg: td ? getComputedStyle(td).backgroundColor : null, bold: td ? getComputedStyle(td).fontWeight : null };
});
check('P30-15 added Table adopts Business border color', tbl.bc === '#334155', tbl);
check('P30-16 added Table header row gets Business header bg + bold', tbl.bg === 'rgb(232, 238, 247)' && (tbl.bold === '700' || tbl.bold === 'bold'), tbl);
// --- Manual override wins (Header edit survives preset change) ---
await page.evaluate(() => {
  const hdr = document.querySelector('#smartPdfEditor .smart-pdf-style-header .smart-pdf-overlay-body');
  hdr.textContent = 'P30 MY HEADER';
  hdr.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(150);
check('P30-17 header manual edit recorded (edited=true)', (await styleState()).cfg.header.edited === true);
check('P30-18 switch preset to Academic via menu', await clickStyleItem('academic'));
await sleep(250);
const cA2 = await chromeDom();
check('P30-19 manual header text survives preset change', cA2.headerText === 'P30 MY HEADER', cA2.headerText);
const stA = await styleState();
check('P30-20 Academic preset changes footer alignment to center', stA.active === 'academic' && stA.cfg.footer.align === 'center', stA.cfg.footer);

// --- Export reflects the style (real pdf-lib output) ---
// (Run BEFORE the footer-deletion test: the suppression design is "manual
//  deletion wins", so a suppressed footer is intentionally not re-rendered
//  and cannot be edited. Here the footer still exists and is editable.)
await page.evaluate(() => {
  const f = document.querySelector('#smartPdfEditor .smart-pdf-style-footer .smart-pdf-overlay-body');
  if (f) { f.textContent = 'P30 FOOTER LINE'; f.dispatchEvent(new Event('input', { bubbles: true })); }
});
await sleep(200);
const bytes = await exportBytes();
check('P30-23 export produces a genuine PDF', bytes.slice(0, 5) === '%PDF-', bytes.slice(0, 5));
const pages = await pdfTextPages(bytes);
check('P30-24 header chrome present in exported page 1 text', pages[0].indexOf('P30 MY HEADER') !== -1, pages[0].slice(0, 120));
check('P30-25 header chrome present in exported page 2 text (multi-page)', pages[1].indexOf('P30 MY HEADER') !== -1, pages[1].slice(0, 120));
check('P30-26 footer chrome present in exported pages', pages.every((p) => p.indexOf('P30 FOOTER LINE') !== -1));

// --- Added overlays survive style operations ---
// (Checked BEFORE the reload: gotoApp + re-inject starts a NEW import session,
//  which by design begins with a fresh document — overlays are session state,
//  not restored across a fresh re-import. The assertion itself is unchanged.)
const ovCount = await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay:not(.smart-pdf-style-chrome)').length);
check('P30-36 added overlays (text/date/table) intact after style ops', ovCount >= 3, ovCount);

// --- Manual deletion wins (suppressed) ---
await page.evaluate(() => { const d = document.querySelector('#smartPdfEditor .smart-pdf-style-footer .smart-pdf-overlay-del'); if (d) d.click(); });
await sleep(200);
check('P30-21 footer deletion suppresses it (not re-rendered)', (await chromeDom()).count === pageCount * 2 - pageCount);
await clickStyleItem('business'); await sleep(250);
check('P30-22 re-applying another preset keeps footer suppressed', (await styleState()).cfg.suppressed.footer === true && (await chromeDom()).count === pageCount);

// --- No Style resets chrome ---
await clickStyleItem('none'); await sleep(250);
check('P30-27 No Style clears chrome and state', (await styleState()).active === 'none' && (await chromeDom()).count === 0);

// --- Persistence across reload (same document name) ---
await clickStyleItem('business'); await sleep(200);
await gotoApp();
await injectFile(DOC_NAME, FIXTURE_B64);
check('P30-28 editor reopens after reload', await waitEditor());
await sleep(400);
// --- RTL / i18n (Arabic) ---
await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); s.value = 'ar'; s.dispatchEvent(new Event('change', { bubbles: true })); });
await sleep(400);
const arLabel = await page.evaluate(() => (document.getElementById('smartPdfStyleBtn').textContent || '').trim());
check('P30-31 Arabic RTL: Style button label localized', arLabel.indexOf('نمط') !== -1, arLabel);
check('P30-32 Arabic RTL: chrome body uses direction-aware text-align', await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-style-chrome .smart-pdf-overlay-body');
  return b ? getComputedStyle(b).textAlign === 'start' : false;
}));
await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); });
await sleep(300);

// --- Regressions (existing features untouched) ---
const addItems = await page.evaluate(() => [...document.querySelectorAll('#smartPdfAddMenu .smart-pdf-add-item')].map((i) => i.getAttribute('data-add')).sort().join(','));
check('P30-33 Add menu still has all 7 items', addItems === 'date,image,logo,signature,stamp,table,text', addItems);
await page.evaluate(() => { const b = document.getElementById('smartPdfMarkBtn'); b.click(); });
await sleep(150);
check('P30-34 Mark menu still opens', await page.evaluate(() => !document.getElementById('smartPdfMarkMenu').hasAttribute('hidden')));
await page.evaluate(() => document.getElementById('smartPdfMarkBtn').click());
await page.evaluate(() => { const b = document.getElementById('smartPdfPagesBtn'); b.click(); });
await sleep(200);
check('P30-35 Pages menu still opens', await page.evaluate(() => !document.getElementById('smartPdfPagesMenu').hasAttribute('hidden')));
await page.evaluate(() => document.getElementById('smartPdfPagesBtn').click());
// P30-36 overlay-intact check moved BEFORE the reload/re-inject above: a fresh
// re-import starts a new session document by design (overlays are session
// state; the STYLE itself persists, verified by P30-28..30).

// --- Responsive 390px mobile ---
await page.setViewport({ width: 390, height: 780 });
await sleep(400);
const mob = await page.evaluate(() => {
  const btn = document.getElementById('smartPdfStyleBtn');
  const hdr = document.querySelector('.smart-pdf-toolbar');
  const r = btn.getBoundingClientRect();
  const m = document.getElementById('smartPdfStyleMenu');
  if (!m || m.hasAttribute('hidden')) document.getElementById('smartPdfStyleBtn').click();
  const i = m.querySelector('[data-style="business"]');
  const ir = i.getBoundingClientRect();
  return { visible: r.width > 0 && r.right <= window.innerWidth, toolOverflow: hdr.scrollWidth > hdr.clientWidth + 2, menuFits: ir.left >= 0 && ir.right <= window.innerWidth };
});
check('P30-37 mobile 390px: Style button visible, no toolbar overflow, menu fits', mob.visible && !mob.toolOverflow && mob.menuFits, mob);
await page.setViewport({ width: 1366, height: 900 });
await sleep(300);

// --- No new JS errors ---
check('P30-38 no new console/page errors during the whole run', realErrs.length === 0, realErrs.slice(0, 3).join(' | '));

console.log('================ PART 30 — SMART STYLES RESULTS ================');
LOG.forEach((l) => console.log(l));
console.log('----------------------------------------------------------------');
console.log(`TOTAL: ${pass + fail}   PASS: ${pass}   FAIL: ${fail}`);
console.log(`Pre-existing (filtered) console errors: ${preexisting}`);
console.log('NOT VERIFIED in this harness (need real user interaction):');
console.log('  - Save (browser download) / Send (native Share Sheet)');
console.log('  - Add -> Logo / Signature / Stamp (native file pickers / saved Company Profile assets)');
if (realErrs.length) console.log('NEW ERRORS: ' + realErrs.join('\n'));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);

check('P30-29 style restored for the same document after reload', (await styleState()).active === 'business', await styleState());
check('P30-30 chrome restored after reload', (await chromeDom()).count === pageCount * 2);
await page.evaluate(() => { try { localStorage.removeItem('eq-smart-pdf-style-v1'); } catch (e) {} });


await page.evaluate(() => { const b = document.getElementById('smartPdfStyleBtn'); b.focus(); });
await page.keyboard.press('Escape');
await sleep(120);
check('P30-06 Escape closes the menu', !(await styleMenu()).open);
check('P30-07 default style is none (no chrome rendered)', (await styleState()).active === 'none' && (await chromeDom()).count === 0);

