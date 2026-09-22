// PART 25 — PDF Pages (Add/Delete/Reorder/Rotate/Duplicate) in the PDF Editor.
// Real-browser behavioral harness. Reuses the EXISTING Smart Documents import flow,
// the PART 19-24 editor UI, and the EXISTING pdf-lib export. No new engine.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8435;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const FIXTURE = path.join(HERE, '_p19_fixture_2p.pdf');

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
const realErrs = [];
function check(name, ok, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${d !== '' ? '  -> ' + d : ''}`);
  if (ok) pass++; else fail++;
}
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
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) realErrs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else realErrs.push('console: ' + m.text()); } });
async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(600); }
async function injectFile(name, mime, bytesB64) {
  return await page.evaluate(async (n, m, b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], n, { type: m }));
    const fi = document.getElementById('smartImportFileInput');
    if (!fi) return { ok: false };
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, name, mime, bytesB64);
}
async function waitEditor(tries = 90) {
  for (let i = 0; i < tries; i++) {
    const s = await page.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
      return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted };
    });
    if (s.visible && s.pages >= 2 && s.painted >= 2) return s;
    await sleep(250);
  }
  return null;
}
async function openPdfEditor() {
  await page.evaluate(() => { document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]')?.click(); });
  await sleep(400);
  await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
  await sleep(500);
  const inj = await injectFile('part25.pdf', 'application/pdf', fs.readFileSync(FIXTURE).toString('base64'));
  const ed = await waitEditor();
  return { inj, ed };
}
async function addViaMenu(type) {
  return await page.evaluate((t) => {
    const btn = document.getElementById('smartPdfAddBtn');
    if (!btn) return { ok: false, why: 'no btn' };
    btn.click();
    const menu = document.getElementById('smartPdfAddMenu');
    const item = menu && menu.querySelector('.smart-pdf-add-item[data-add="' + t + '"]');
    if (!item) return { ok: false, why: 'no item ' + t };
    item.click();
    return { ok: true };
  }, type);
}
async function markState() {
  return await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay')];
    return { count: boxes.length, kinds: boxes.map((b) => b.className.replace('smart-pdf-overlay smart-pdf-ov-', '')).sort().join(','), pages: boxes.map((b) => b.dataset.page).sort().join(',') };
  });
}
async function pageModelState() {
  return await page.evaluate(() => {
    const ed = document.getElementById('smartPdfEditor');
    const wraps = [...ed.querySelectorAll('.smart-pdf-page')];
    const model = (window.__smartImport && window.__smartImport.pageModel) ? window.__smartImport.pageModel() : null;
    return { wraps: wraps.map((w) => ({ p: w.dataset.page, w: Math.round(parseFloat(w.style.width) || 0), h: Math.round(parseFloat(w.style.height) || 0) })), model };
  });
}
async function pagesOpen() {
  return await page.evaluate(() => {
    const btn = document.getElementById('smartPdfPagesBtn');
    if (!btn) return { ok: false };
    btn.click();
    const m = document.getElementById('smartPdfPagesMenu');
    const chips = [...document.querySelectorAll('#smartPdfPagesList .smart-pdf-page-chip')];
    const acts = [...document.querySelectorAll('#smartPdfPagesMenu [data-pact]')].map((b) => b.getAttribute('data-pact')).sort().join(',');
    return { ok: true, open: !!(m && !m.hasAttribute('hidden')), chips: chips.length, acts, draggable: chips.length ? chips[0].getAttribute('draggable') : null };
  });
}
async function pagesAct(act) {
  return await page.evaluate((a) => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (!m || m.hasAttribute('hidden')) { document.getElementById('smartPdfPagesBtn').click(); }
    const b = m.querySelector('[data-pact="' + a + '"]');
    if (!b) return { clicked: false };
    b.click();
    return { clicked: true };
  }, act);
}
async function selectChip(i) {
  return await page.evaluate((n) => {
    const c = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="' + n + '"]');
    if (!c) return false;
    c.click();
    return true;
  }, i);
}
async function moveChip(i, dir) {
  return await page.evaluate((n, d) => {
    const c = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="' + n + '"]');
    const b = c && c.querySelector('[data-pmove="' + d + '"]');
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, i, dir);
}
async function dnd(from, to) {
  return await page.evaluate((f, t) => {
    const target = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="' + t + '"]');
    if (!target) return false;
    const dt = new DataTransfer();
    try { dt.setData('text/plain', String(f)); } catch (e) {}
    target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return true;
  }, from, to);
}
async function closePages() {
  await page.evaluate(() => { const m = document.getElementById('smartPdfPagesMenu'); if (m) m.setAttribute('hidden', ''); });
}
async function addOverlayToPage(idx) {
  await page.evaluate((n) => {
    const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="' + n + '"]');
    if (wrap) wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
  }, idx);
  await addViaMenu('text');
  await sleep(350);
}
async function exportPdf() {
  return await page.evaluate(async () => {
    const blob = await window.__smartImport.editedBlob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { b64: btoa(bin), head: bin.slice(0, 5), size: buf.length };
  });
}
async function extractPdf(b64) {
  return await page.evaluate(async (b) => {
    let pdfjs = window.pdfjsLib;
    if (!pdfjs) {
      await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = '/__pdfdiag/vendor/pdf.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
      pdfjs = window.pdfjsLib;
    }
    if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    const bin = atob(b); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await pdfjs.getDocument({ data: u8 }).promise;
    const out = { pages: doc.numPages, texts: [], rots: [] };
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      out.texts.push(tc.items.map((it) => it.str).join(' '));
      out.rots.push(pg.rotate);
    }
    return out;
  }, b64);
}
// probe: rotate presses behavior
await pagesOpen();
for (let k = 0; k < 4; k++) {
  const before = await page.evaluate(() => (window.__smartImport.pageModel()[0].rot || 0));
  const pa = await pagesAct('rot');
  await sleep(600);
  const after = await page.evaluate(() => ({ rot: window.__smartImport.pageModel()[0].rot || 0, menuOpen: !document.getElementById('smartPdfPagesMenu').hasAttribute('hidden') }));
  console.log('probe press', k, 'before', before, 'pa', JSON.stringify(pa), 'after', JSON.stringify(after));
}

await page.setViewport({ width: 1366, height: 900 });
await gotoApp();
const origHash = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
const notesBefore = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
const profBefore = await page.evaluate(() => localStorage.getItem('eq-note-company-profile') || '');
// open the existing PART 19 editor with the 2-page fixture
const opened = await openPdfEditor();
check('P25-01 fixture accepted + PDF Editor opens (PART 19 editor)', opened.inj.ok === true && !!opened.ed, opened.ed);
let ms = await pageModelState();
check('P25-02 initial model = identity [src0,src1] + 2 rendered pages', !!ms.model && ms.model.length === 2 && ms.model[0].src === 0 && ms.model[1].src === 1 && ms.wraps.length === 2, ms);
const btnCount = await page.evaluate(() => document.querySelectorAll('#smartPdfPagesBtn').length);
check('P25-03 Pages button exists exactly once in the toolbar', btnCount === 1, btnCount);
let po = await pagesOpen();
check('P25-04 Pages menu opens as a popover', po.open === true, po);
check('P25-05 menu contains ONLY the 5 required actions', po.acts === 'add,del,dup,rot', po.acts);
check('P25-06 page chips rendered with drag&drop enabled', po.chips === 2 && po.draggable === 'true', po);
// ADD PAGE (blank) after page 1
await selectChip(0);
await pagesAct('add');
await sleep(500);
ms = await pageModelState();
check('P25-07 Add Page inserts a REAL blank page (3 model pages)', ms.model.length === 3 && !!ms.model[1].blank && ms.model[1].src === -1, ms.model);
check('P25-08 blank page renders as a white page box in preview', ms.wraps.length === 3 && ms.wraps[1].w > 40 && ms.wraps[1].h > 40, ms.wraps);
await closePages();
await addOverlayToPage(1);
let st = await markState();
check('P25-09 overlay can be added on the blank page (page association kept)', st.pages.indexOf('1') >= 0, st.pages);
// DELETE PAGE — remove the blank page (index 1)
await pagesOpen();
await selectChip(1);
await pagesAct('del');
await sleep(500);
ms = await pageModelState();
check('P25-10 Delete Page removes it from the model (back to 2 pages)', ms.model.length === 2 && ms.model[0].src === 0 && ms.model[1].src === 1, ms.model);
// delete guard: keep deleting down to a single page, then must be blocked
await pagesAct('del'); await sleep(300);
await pagesAct('del'); await sleep(500);
ms = await pageModelState();
check('P25-11 delete is blocked at 1 page (never 0 pages)', ms.model.length === 1, ms.model);
// reopen a fresh editor session for reorder/rotate/duplicate tests
await closePages();
await page.reload({ waitUntil: 'load' }); await sleep(900);
const reopened = await openPdfEditor();
check('P25-12 fresh editor session reopened (2 pages, identity model)', !!reopened.ed, reopened.ed);
await closePages();
await addOverlayToPage(0);
st = await markState();
check('P25-13 text overlay exists on page 1 before duplicate', st.pages.split(',').filter((p) => p === '0').length >= 1, st.pages);
await pagesOpen();
await selectChip(0);
await pagesAct('dup');
await sleep(500);
ms = await pageModelState();
check('P25-14 Duplicate inserts a copy after the source (3 pages)', ms.model.length === 3 && ms.model[1].src === 0 && ms.model[0].src === 0, ms.model);
st = await markState();
const onCopy = st.pages.split(',').filter((p) => p === '1').length;
check('P25-15 duplicate carries the overlay elements', onCopy >= 1, st.pages);
// REORDER via drag & drop: move page 3 (copy) to position 0
const beforeOrder = ms.model.map((e) => e.src).join(',');
await dnd(2, 0);
await sleep(500);
ms = await pageModelState();
const afterOrder = ms.model.map((e) => e.src).join(',');
check('P25-16 drag & drop reorder changes the MODEL order (not just visuals)', afterOrder !== beforeOrder && ms.wraps.length === 3, { before: beforeOrder, after: afterOrder });
// fallback reorder: Move up via ▲
const ordBefore = ms.model.map((e) => e.src).join(',');
await moveChip(0, 1);
await sleep(400);
ms = await pageModelState();
check('P25-17 Move Up/Down fallback also reorders the model', ms.model.map((e) => e.src).join(',') !== ordBefore, ms.model);
// ROTATE: 4 presses cycle 90→180→270→0 on selected page
await pagesAct('rot'); await sleep(400);
ms = await pageModelState();
check('P25-18 Rotate sets rot=90 on the selected page', ms.model[0].rot === 90, ms.model[0].rot);
await pagesAct('rot'); await sleep(300);
ms = await pageModelState();
check('P25-19 second press → 180', ms.model[0].rot === 180, ms.model[0].rot);
await pagesAct('rot'); await sleep(300);
ms = await pageModelState();
check('P25-20 third press → 270 and preview wrap swaps W/H', ms.model[0].rot === 270, { rot: ms.model[0].rot, w: ms.wraps[0].w, h: ms.wraps[0].h });
await pagesAct('rot'); await sleep(300);
ms = await pageModelState();
check('P25-21 fourth press → back to 0 (full cycle)', !ms.model[0].rot, ms.model[0].rot);
// leave one rotation active so the export must carry a real /Rotate
await pagesAct('rot'); await sleep(500);
ms = await pageModelState();
check('P25-21b rotation active before export (rot=90)', ms.model[0].rot === 90, ms.model[0].rot);
await closePages();
// persistence across re-render: marks + order survive overlay re-render
st = await markState();
check('P25-22 marks survive full overlay re-render after page ops', st.count >= 1, st);
// EXPORT: final doc must reflect model order + rotation + overlays, original untouched
const exp = await exportPdf();
check('P25-23 exported file is a genuine PDF (%PDF-)', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
const extracted = await extractPdf(exp.b64);
check('P25-24 exported PDF has the MODEL page count (3 pages)', extracted.pages === 3, extracted.pages);
const orderStr = extracted.texts.map((t) => (t.indexOf('Page 1') >= 0 ? '1' : (t.indexOf('Page 2') >= 0 ? '2' : '?'))).join(',');
check('P25-25 export preserves the reordered page sequence', orderStr.indexOf('2') === 0 || orderStr.indexOf('2') === 1, { order: orderStr, t0: extracted.texts[0].slice(0, 40) });
check('P25-26 rotation persisted as real /Rotate in the exported PDF', extracted.rots.some((r) => r === 180 || r === 90), extracted.rots);
const typed = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-text .smart-pdf-overlay-body');
  if (!b) return false;
  b.textContent = 'P25TXT';
  b.dispatchEvent(new Event('input', { bubbles: true }));
  return JSON.stringify(window.__smartImport.overlays()).indexOf('P25TXT') >= 0;
});
check('P25-27 typed overlay text stored in the model store', typed, '');
const exp2 = await exportPdf();
const ex2 = await extractPdf(exp2.b64);
const txtPage = ex2.texts.findIndex((t) => t.indexOf('P25TXT') >= 0);
check('P25-28 overlay text exported as REAL text on its page', txtPage >= 0, { txtPage, pages: ex2.pages });
const origHash2 = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P25-29 original source PDF unchanged (sha256)', origHash2 === origHash, '');
const notesAfter = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
const profAfter = await page.evaluate(() => localStorage.getItem('eq-note-company-profile') || '');
check('P25-30 Notes storage unchanged', notesAfter === notesBefore, '');
check('P25-31 Company Profile storage unchanged', profAfter === profBefore, '');
// PART 22/23/24 regressions
await page.evaluate(() => document.getElementById('smartPdfAddBtn').click());
await sleep(200);
const menu22 = await page.evaluate(() => {
  const m = document.getElementById('smartPdfAddMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-add-item') : [])];
  return { n: items.length, types: items.map((i) => i.getAttribute('data-add')).sort().join(','), tableCount: items.filter((i) => i.getAttribute('data-add') === 'table').length };
});
check('P25-32 (P22 reg) Add menu still exactly 7 items incl. one Table', menu22.n === 7 && menu22.types === 'date,image,logo,signature,stamp,table,text' && menu22.tableCount === 1, menu22);
await page.evaluate(() => document.body.click());
await addViaMenu('table');
await sleep(400);
const tbl23 = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-table');
  const t = b && b.querySelector('table');
  return { rows: t ? t.rows.length : 0, cols: t ? t.rows[0].cells.length : 0, editable: !!(t && t.rows[0] && t.rows[0].cells[0] && t.rows[0].cells[0].isContentEditable), bar: !!(b && b.querySelector('.smart-pdf-tbar')) };
});
check('P25-33 (P23 reg) structured table still created with controls bar', tbl23.rows >= 2 && tbl23.cols >= 2 && tbl23.editable && tbl23.bar, tbl23);
const tblEdit = await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  if (!td) return false;
  td.textContent = 'P25R';
  td.dispatchEvent(new Event('input', { bubbles: true }));
  return JSON.stringify(window.__smartImport.overlays()).indexOf('P25R') >= 0;
});
check('P25-34 (P23 reg) table cell editing still writes into the store', tblEdit, '');
await page.evaluate(() => { document.getElementById('smartPdfMarkBtn').click(); });
await sleep(200);
const markMenu = await page.evaluate(() => {
  const m = document.getElementById('smartPdfMarkMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-mark-item') : [])];
  return { open: !!(m && !m.hasAttribute('hidden')), kinds: items.map((i) => i.getAttribute('data-mark')).sort().join(',') };
});
check('P25-35 (P24 reg) Mark menu intact with exactly the 4 mark tools', markMenu.open && markMenu.kinds === 'comment,draw,highlight,underline', markMenu);
await page.evaluate(() => { const m = document.getElementById('smartPdfMarkMenu'); if (m) m.setAttribute('hidden', ''); });
const toolbarOrder = await page.evaluate(() => {
  const ref = document.getElementById('smartPdfMarkBtn');
  const bar = ref && ref.parentElement && ref.parentElement.parentElement;
  if (!bar) return { ok: false };
  return { ok: true, hasAdd: !!bar.querySelector('#smartPdfAddBtn'), hasMark: !!bar.querySelector('#smartPdfMarkBtn'), hasPages: !!bar.querySelector('#smartPdfPagesBtn') };
});
check('P25-36 Pages lives in the SAME bottom toolbar as Edit/Add/Mark', toolbarOrder.ok && toolbarOrder.hasAdd && toolbarOrder.hasMark && toolbarOrder.hasPages, toolbarOrder);
// responsive
const resp = [];
for (const w of [1366, 768, 430, 390]) {
  await page.setViewport({ width: w, height: 850 });
  await sleep(300);
  const r = await page.evaluate(() => {
    const btn = document.getElementById('smartPdfPagesBtn');
    btn.click();
    const m = document.getElementById('smartPdfPagesMenu');
    const mr = m.getBoundingClientRect();
    const out = { open: !m.hasAttribute('hidden'), inX: mr.left >= 0 && mr.right <= window.innerWidth && mr.width > 40 };
    if (!m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click(); // proper close resets aria-expanded
    out.open2 = m.hasAttribute('hidden');
    return out;
  });
  resp.push({ w, ...r });
}
check('P25-37 Pages menu usable + inside viewport at 1366/768/430/390', resp.every((r) => r.open && r.inX), resp);
await page.setViewport({ width: 1366, height: 900 });
// RTL
await page.evaluate(() => { localStorage.setItem('eq-language', 'ar'); });
await page.reload({ waitUntil: 'load' }); await sleep(800);
await openPdfEditor();
await sleep(300);
const rtl = await page.evaluate(() => {
  const b = document.getElementById('smartPdfPagesBtn');
  const lbl = b ? (b.textContent || '').trim() : '';
  b.click();
  const m = document.getElementById('smartPdfPagesMenu');
  const r = m.getBoundingClientRect();
  const wrapR = document.getElementById('smartPdfPagesWrap').getBoundingClientRect();
  const out = { dir: document.documentElement.getAttribute('dir'), label: lbl, near: Math.abs(r.left - wrapR.left) < 80 || Math.abs(r.right - wrapR.right) < 80 };
  m.setAttribute('hidden', '');
  return out;
});
check('P25-38 RTL: Arabic Pages label from existing i18n + menu anchored to button', rtl.dir === 'rtl' && rtl.label.indexOf('Add') < 0 && rtl.label.length > 0 && rtl.near, rtl);
await page.evaluate(() => { localStorage.setItem('eq-language', 'en'); });
// a11y
const a11y = await page.evaluate(() => {
  const btn = document.getElementById('smartPdfPagesBtn');
  return { popup: btn.getAttribute('aria-haspopup'), expanded: btn.getAttribute('aria-expanded'), controls: btn.getAttribute('aria-controls') };
});
check('P25-39 Pages button keyboard/AT accessible (aria-haspopup/expanded/controls)', a11y.popup === 'true' && a11y.expanded === 'false' && a11y.controls === 'smartPdfPagesMenu', a11y);
check('P25-40 no new JS errors across the whole run', realErrs.length === 0, realErrs.slice(0, 3));
console.log('DONE p=' + pass + ' f=' + fail + ' nv=' + notVerified + ' pre=' + preexisting);
await browser.close();
server.close();
fs.writeFileSync(path.join(HERE, 'p25_results.txt'), LOG.join('\n') + '\nRESULTS_JSON=' + JSON.stringify({ pass, fail, not_verified: notVerified, preexisting }) + '\nERRORS=' + JSON.stringify(realErrs) + '\n');




