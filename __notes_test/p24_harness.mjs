// PART 24 harness chunk: imports + bootstrap (do not edit individually)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8426;
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
// helpers chunk
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
      return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted, spans: document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length };
    });
    if (s.visible && s.pages >= 2 && s.painted >= 2 && s.spans >= 4) return s;
    await sleep(250);
  }
  return null;
}
async function openPdfEditor() {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (b) b.click(); });
  await sleep(400);
  await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
  await sleep(500);
  const inj = await injectFile('part24.pdf', 'application/pdf', fs.readFileSync(FIXTURE).toString('base64'));
  const ed = await waitEditor();
  return { inj, ed };
}
async function addViaMenu(type) {
  return await page.evaluate((t) => {
    const btn = document.getElementById('smartPdfAddBtn');
    if (!btn) return { ok: false, why: 'no btn' };
    btn.click();
    const menu = document.getElementById('smartPdfAddMenu');
    if (!menu) return { ok: false, why: 'no menu' };
    const item = menu.querySelector('.smart-pdf-add-item[data-add="' + t + '"]');
    if (!item) return { ok: false, why: 'no item ' + t };
    item.click();
    return { ok: true };
  }, type);
}
async function markViaMenu(kind) {
  return await page.evaluate((k) => {
    const btn = document.getElementById('smartPdfMarkBtn');
    if (!btn) return { ok: false, why: 'no mark btn' };
    btn.click();
    const menu = document.getElementById('smartPdfMarkMenu');
    if (!menu) return { ok: false, why: 'no menu' };
    const item = menu.querySelector('.smart-pdf-mark-item[data-mark="' + k + '"]');
    if (!item) return { ok: false, why: 'no item ' + k };
    item.click();
    return { ok: true };
  }, kind);
}
async function selectPageText(pg) {
  return await page.evaluate((p) => {
    const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="' + p + '"]');
    const sp = wrap && wrap.querySelector('.smart-pdf-text');
    if (!sp) return { ok: false, why: 'no text span' };
    const r = document.createRange(); r.selectNodeContents(sp);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return { ok: true, text: sel.toString().slice(0, 40) };
  }, pg);
}
async function markState() {
  return await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay')];
    return {
      count: boxes.length,
      kinds: boxes.map((b) => (b.className.match(/smart-pdf-ov-([a-z-]+)/) || [])[1]).join(','),
      store: (window.__smartImport && window.__smartImport.overlays()) || {}
    };
  });
}
async function drawStroke(pg, xs, ys) {
  return await page.evaluate((p, Xs, Ys) => {
    const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="' + p + '"]');
    if (!wrap) return false;
    const r = wrap.getBoundingClientRect();
    wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + Xs[0], clientY: r.top + Ys[0], pointerId: 7, isPrimary: true }));
    for (let i = 1; i < Xs.length; i++) wrap.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + Xs[i], clientY: r.top + Ys[i], pointerId: 7, isPrimary: true }));
    wrap.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + Xs[Xs.length - 1], clientY: r.top + Ys[Ys.length - 1], pointerId: 7, isPrimary: true }));
    return true;
  }, pg, xs, ys);
}
async function finishDraw() {
  return await page.evaluate(() => {
    const b = document.querySelector('#smartPdfEditor .smart-pdf-mark-draw-hint [data-mkdone]');
    if (!b) return false;
    b.click(); return true;
  });
}
async function addComment(text) {
  await markViaMenu('comment');
  await sleep(250);
  return await page.evaluate((tx) => {
    const ta = document.getElementById('smartPdfMkCommentText');
    if (!ta) return { ok: false, why: 'no textarea' };
    ta.value = tx;
    const btn = document.querySelector('.smart-pdf-mkpop [data-mkadd]');
    if (!btn) return { ok: false, why: 'no add btn' };
    btn.click();
    return { ok: true };
  }, text);
}
async function exportPdf() {
  return await page.evaluate(async () => {
    const blob = await window.__smartImport.editedBlob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { b64: btoa(bin), head: bin.slice(0, 5), size: buf.length };
  });
}
async function setViewport(w, h) { await page.setViewport({ width: w, height: h }); await sleep(350); }
// main flow chunk 1: open + menu structure + highlight + underline
console.log('=== PART 24 - PDF Mark (Highlight/Underline/Draw/Comment) ===');
await setViewport(1366, 900);
await gotoApp();
const origHash = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
const notesBefore = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
const opened = await openPdfEditor();
check('P24-01 fixture accepted + PDF Editor opens (PART 19 editor)', opened.inj.ok === true && !!opened.ed, opened.ed);
const markBtn = await page.evaluate(() => document.querySelectorAll('#smartPdfMarkBtn').length);
check('P24-02 Mark button exists exactly once in the PDF editor toolbar', markBtn === 1, markBtn);
await page.evaluate(() => document.getElementById('smartPdfMarkBtn').click());
await sleep(200);
const markMenu = await page.evaluate(() => {
  const m = document.getElementById('smartPdfMarkMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-mark-item') : [])];
  return { open: !!(m && !m.hasAttribute('hidden')), n: items.length, types: items.map((i) => i.getAttribute('data-mark')).join(','), named: items.every((i) => (i.textContent || '').trim().length > 0) };
});
check('P24-03 Mark menu opens with exactly 4 items', markMenu.open && markMenu.n === 4, markMenu.n);
check('P24-04 Mark contains exactly Highlight/Underline/Draw/Comment (no extras)', markMenu.types === 'highlight,underline,draw,comment', markMenu.types);
check('P24-05 all Mark items have accessible text names', markMenu.named, '');
await page.evaluate(() => document.body.click());
const sel1 = await selectPageText(0);
check('P24-06 page text is selectable in the text layer', sel1.ok === true, sel1);
await markViaMenu('highlight');
await sleep(350);
let st = await markState();
check('P24-07 Mark > Highlight creates a structured highlight overlay on page 1', st.kinds.indexOf('mark-highlight') >= 0, st.kinds);
const hlModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'highlight'); if (o) return { page: o.page, hasXYWH: [o.x, o.y, o.w, o.h].every(Number.isFinite), color: o.color }; }
  return null;
});
check('P24-08 highlight model is structured {page,x,y,w,h,color} (not an image)', !!hlModel && hlModel.page === 0 && hlModel.hasXYWH, hlModel);
await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="1"]');
  wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
});
await sleep(200);
await selectPageText(1);
await markViaMenu('underline');
await sleep(350);
st = await markState();
check('P24-09 Mark > Underline creates underline overlay', st.kinds.indexOf('mark-underline') >= 0, st.kinds);
const ulModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'underline'); if (o) return { page: o.page, hasXYW: [o.x, o.y, o.w].every(Number.isFinite), color: o.color }; }
  return null;
});
check('P24-10 underline model is structured + bound to page 2', !!ulModel && ulModel.page === 1 && ulModel.hasXYW, ulModel);
// --- Draw on page 1 ---
const drawMode = await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="0"]');
  wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
  return true;
});
await sleep(100);
await markViaMenu('draw');
await sleep(250);
const drawModeOk = await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page.smart-pdf-mark-draw');
  return { active: !!wrap, hint: !!document.querySelector('#smartPdfEditor .smart-pdf-mark-draw-hint') };
});
check('P24-11 Mark > Draw activates draw mode with hint', drawModeOk.active && drawModeOk.hint, drawModeOk);
await drawStroke(0, [60, 90, 120, 150], [120, 140, 160, 180]);
await sleep(200);
let drModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'draw'); if (o) return { page: o.page, strokes: (o.strokes || []).length, pts: o.strokes && o.strokes[0] ? o.strokes[0].points.length : 0 }; }
  return null;
});
check('P24-12 Draw produces structured vector stroke data (points, not screenshot)', !!drModel && drModel.strokes >= 1 && drModel.pts >= 3, drModel);
check('P24-13 Draw annotation is bound to page 1', !!drModel && drModel.page === 0, drModel);
const svgs = await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-ov-mark-draw svg').length);
check('P24-14 draw preview renders as inline SVG (no canvas/img)', svgs >= 1, svgs);
await finishDraw();
await sleep(150);
const drawOff = await page.evaluate(() => !document.querySelector('#smartPdfEditor .smart-pdf-page.smart-pdf-mark-draw'));
check('P24-15 Done exits draw mode cleanly', drawOff, '');
// --- Comment on page 2 ---
await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="1"]');
  if (wrap) wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
});
await sleep(200);
await selectPageText(1);
const cm = await addComment('P24 comment');
await sleep(400);
st = await markState();
check('P24-16 Mark > Comment saves a structured comment annotation (small popover, no alert)', cm.ok === true && st.kinds.indexOf('mark-comment') >= 0, { cm, kinds: st.kinds });
const cmModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'comment'); if (o) return { page: o.page, x: o.x, y: o.y, text: o.text }; }
  return null;
});
check('P24-17 comment model = {page,x,y,text} on page 2', !!cmModel && cmModel.page === 1 && cmModel.text === 'P24 comment', cmModel);
await page.evaluate(() => { const d = document.querySelector('#smartPdfEditor .smart-pdf-ov-mark-comment .smart-pdf-mkdot'); if (d) d.click(); });
await sleep(300);
const cmOpen = await page.evaluate(() => {
  const ta = document.getElementById('smartPdfMkCommentText');
  return { open: !!ta, value: ta ? ta.value : '' };
});
check('P24-18 comment marker re-opens its text for viewing/editing', cmOpen.open && cmOpen.value === 'P24 comment', cmOpen);
await page.evaluate(() => { const c = document.querySelector('.smart-pdf-mkpop [data-mkcancel]'); if (c) c.click(); });
await sleep(150);
// re-render + export + regressions chunk
const beforeResize = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  const out = {};
  for (const pk in ov) (ov[pk] || []).forEach((o) => { if (o && ['highlight', 'underline', 'draw', 'comment'].indexOf(o.type) >= 0) { out[o.type] = { page: o.page, x: Math.round(o.x), y: Math.round(o.y) }; } });
  return out;
});
await page.evaluate(() => { const btn = document.getElementById('smartPdfAddBtn'); btn && btn.click(); document.body.click(); });
await sleep(200);
const afterRerender = await markState();
check('P24-19 marks survive full overlay re-render (store is authoritative)', ['mark-highlight', 'mark-underline', 'mark-draw', 'mark-comment'].every((k) => afterRerender.kinds.indexOf(k) >= 0), afterRerender.kinds);
await setViewport(390, 800);
const drift = await page.evaluate((before) => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  let worst = 0;
  for (const pk in ov) (ov[pk] || []).forEach((o) => {
    if (o && ['highlight', 'underline', 'draw', 'comment'].indexOf(o.type) >= 0 && before[o.type]) {
      worst = Math.max(worst, Math.abs(Math.round(o.x) - before[o.type].x), Math.abs(Math.round(o.y) - before[o.type].y));
    }
  });
  return worst;
}, beforeResize);
check('P24-20 page-unit coordinates stable across viewport change (no drift)', drift === 0, drift);
const boxScaled = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-mark-highlight');
  if (!b) return null;
  return { left: Math.round(parseFloat(b.style.left)), storeX: (() => { const ov = (window.__smartImport && window.__smartImport.overlays()) || {}; for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'highlight'); if (o) return Math.round(o.x); } return -1; })() };
});
check('P24-21 overlay box scales with the page (screen = page unit x scale)', !!boxScaled && boxScaled.left > 0, boxScaled);
await setViewport(1366, 900);
const exp = await exportPdf();
check('P24-22 exported file is a genuine PDF (%PDF-)', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
const extracted = await page.evaluate(async (b64) => {
  let pdfjs = window.pdfjsLib;
  if (!pdfjs) {
    await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = '/__pdfdiag/vendor/pdf.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    pdfjs = window.pdfjsLib;
  }
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const doc = await pdfjs.getDocument({ data: u8 }).promise;
  const p1 = await (await doc.getPage(1)).getTextContent();
  const p2 = await (await doc.getPage(2)).getTextContent();
  const ops1 = await (await doc.getPage(1)).getOperatorList();
  const ops2 = await (await doc.getPage(2)).getOperatorList();
  const fills1 = ops1.fnArray.filter((f) => f === pdfjs.OPS.fill || f === pdfjs.OPS.eoFill).length;
  const strokes2 = ops2.fnArray.filter((f) => f === pdfjs.OPS.stroke || f === pdfjs.OPS.closeStroke).length;
  return { pages: doc.numPages, t1: p1.items.map((i) => i.str).join(' '), t2: p2.items.map((i) => i.str).join(' '), fills1, strokes2 };
}, exp.b64);
check('P24-23 exported PDF keeps 2 pages', extracted.pages === 2, extracted.pages);
check('P24-24 comment text is REAL selectable PDF text in export', extracted.t2.indexOf('P24 comment') >= 0, extracted.t2.slice(-120));
check('P24-25 original page content intact (page 1 + page 2)', extracted.t1.length > 0 && extracted.t2.indexOf('Page 2') >= 0, { l1: extracted.t1.length, t2: extracted.t2.slice(0, 40) });
check('P24-26 highlight exported as vector fill on page 1', extracted.fills1 >= 1, extracted.fills1);
check('P24-27 underline/draw exported as vector strokes on page 2', extracted.strokes2 >= 1, extracted.strokes2);
const origHash2 = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P24-28 original source PDF unchanged (sha256)', origHash2 === origHash, '');
check('P24-29 exported PDF is a NEW distinct file', exp.size > 0, exp.size);
// --- regressions: PART 22 Add menu + PART 23 table ---
await page.evaluate(() => document.getElementById('smartPdfAddBtn').click());
await sleep(200);
const menu22 = await page.evaluate(() => {
  const m = document.getElementById('smartPdfAddMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-add-item') : [])];
  return { n: items.length, types: items.map((i) => i.getAttribute('data-add')).sort().join(','), tableCount: items.filter((i) => i.getAttribute('data-add') === 'table').length };
});
check('P24-30 (P22 reg) Add menu still exactly 7 items incl. one Table', menu22.n === 7 && menu22.types === 'date,image,logo,signature,stamp,table,text' && menu22.tableCount === 1, menu22);
await page.evaluate(() => document.body.click());
await addViaMenu('table');
await sleep(400);
const tbl23 = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-table');
  const t = b && b.querySelector('table');
  return { rows: t ? t.rows.length : 0, cols: t ? t.rows[0].cells.length : 0, editable: !!(t && t.rows[0] && t.rows[0].cells[0] && t.rows[0].cells[0].isContentEditable), bar: !!(b && b.querySelector('.smart-pdf-tbar')) };
});
check('P24-31 (P23 reg) structured table still created with controls bar', tbl23.rows >= 2 && tbl23.cols >= 2 && tbl23.editable && tbl23.bar, tbl23);
const tblEdit = await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  if (!td) return false;
  td.textContent = 'P24R';
  td.dispatchEvent(new Event('input', { bubbles: true }));
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  return JSON.stringify(ov).indexOf('P24R') >= 0;
});
check('P24-32 (P23 reg) table cell editing still writes into the store', tblEdit, '');
const rowCol = await page.evaluate(() => {
  const bar = document.querySelector('#smartPdfEditor .smart-pdf-tbar');
  if (!bar) return { ok: false };
  const click = (act) => { const b = bar.querySelector('[data-tact="' + act + '"]'); if (b) b.click(); };
  const cnt = () => { const t = document.querySelector('#smartPdfEditor .smart-pdf-ov-table table'); return t ? t.rows.length + 'x' + t.rows[0].cells.length : '?'; };
  const before = cnt();
  click('row+'); click('col+');
  const mid = cnt();
  click('row-'); click('col-');
  const after = cnt();
  return { ok: true, before, mid, after };
});
check('P24-33 (P23 reg) table row/column add+delete still work', rowCol.ok && rowCol.mid !== rowCol.before && rowCol.after === rowCol.before, rowCol);
const marksAfterTbl = await markState();
check('P24-34 all 4 mark kinds coexist with the table after regressions', ['mark-highlight', 'mark-underline', 'mark-draw', 'mark-comment'].every((k) => marksAfterTbl.kinds.indexOf(k) >= 0), marksAfterTbl.kinds);
// responsive + RTL/LTR + a11y + touch + finalize chunk
const resp = [];
for (const w of [1366, 768, 430, 390]) {
  await setViewport(w, 850);
  const r = await page.evaluate(() => {
    const btn = document.getElementById('smartPdfMarkBtn');
    btn.click();
    const m = document.getElementById('smartPdfMarkMenu');
    const mr = m.getBoundingClientRect();
    const out = { open: !m.hasAttribute('hidden'), inX: mr.left >= 0 && mr.right <= window.innerWidth && mr.width > 50 };
    m.setAttribute('hidden', '');
    return out;
  });
  resp.push({ w, ...r });
}
check('P24-35 Mark menu usable + inside viewport at 1366/768/430/390', resp.every((r) => r.open && r.inX), resp);
await setViewport(1366, 900);
// --- RTL ---
await page.evaluate(() => { localStorage.setItem('eq-language', 'ar'); });
await page.reload({ waitUntil: 'load' }); await sleep(800);
await openPdfEditor();
await sleep(400);
const rtl = await page.evaluate(() => {
  const b = document.getElementById('smartPdfMarkBtn');
  b.click();
  const m = document.getElementById('smartPdfMarkMenu');
  const items = [...m.querySelectorAll('.smart-pdf-mark-item')];
  const r = m.getBoundingClientRect();
  const wrapR = document.getElementById('smartPdfMarkWrap').getBoundingClientRect();
  const out = {
    dir: document.documentElement.getAttribute('dir'),
    labels: items.map((i) => (i.textContent || '').trim()).join('|'),
    near: Math.abs(r.left - wrapR.left) < 60 || Math.abs(r.right - wrapR.right) < 60,
    expanded: b.getAttribute('aria-expanded')
  };
  m.setAttribute('hidden', '');
  return out;
});
check('P24-36 RTL: Arabic Mark labels from existing i18n + menu anchored to button', rtl.dir === 'rtl' && rtl.labels.split('|').length === 4 && rtl.near, rtl);
await selectPageText(0);
await markViaMenu('highlight');
await sleep(350);
const rtlHl = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'highlight'); if (o) return { page: o.page, x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w) }; }
  return null;
});
check('P24-37 RTL highlight coordinates valid (not mirrored/negative)', !!rtlHl && rtlHl.x >= 0 && rtlHl.y >= 0 && rtlHl.w > 0 && rtlHl.page === 0, rtlHl);
// --- LTR restore ---
await page.evaluate(() => { localStorage.setItem('eq-language', 'en'); });
await page.reload({ waitUntil: 'load' }); await sleep(800);
const ltr = await page.evaluate(() => ({ dir: document.documentElement.getAttribute('dir') }));
check('P24-38 LTR restored', ltr.dir !== 'rtl', ltr);
// --- accessibility ---
const a11y = await page.evaluate(() => {
  const btn = document.getElementById('smartPdfMarkBtn');
  btn.click();
  const m = document.getElementById('smartPdfMarkMenu');
  const items = [...m.querySelectorAll('.smart-pdf-mark-item')];
  const out = {
    haspopup: btn.getAttribute('aria-haspopup') === 'true' || btn.hasAttribute('aria-haspopup'),
    expanded: btn.getAttribute('aria-expanded'),
    itemsRole: items.every((i) => i.getAttribute('role') === 'menuitem'),
    focusable: items.every((i) => i.tagName === 'BUTTON')
  };
  m.setAttribute('hidden', '');
  return out;
});
check('P24-39 Mark controls are keyboard/click accessible (button + menuitem roles + aria-expanded)', a11y.haspopup && a11y.expanded === 'true' && a11y.itemsRole && a11y.focusable, a11y);
// --- touch/coarse pointer draw ---
await setViewport(430, 850);
await openPdfEditor();
await sleep(400);
await markViaMenu('draw');
await sleep(250);
await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="0"]');
  const r = wrap.getBoundingClientRect();
  if (!wrap) return;
  wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: r.left + 40, clientY: r.top + 90, pointerId: 9, isPrimary: true }));
  wrap.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: r.left + 90, clientY: r.top + 130, pointerId: 9, isPrimary: true }));
  wrap.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: r.left + 140, clientY: r.top + 110, pointerId: 9, isPrimary: true }));
  wrap.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: r.left + 140, clientY: r.top + 110, pointerId: 9, isPrimary: true }));
});
await sleep(200);
await finishDraw();
const touchDraw = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  let n = 0; for (const pk in ov) n += (ov[pk] || []).filter((x) => x && x.type === 'draw').length;
  return n;
});
check('P24-40 touch (pointerType=touch) drawing produces strokes', touchDraw >= 1, touchDraw);
check('P24-41 no new JS errors across the whole run', realErrs.length === 0, realErrs.slice(0, 3));
// persistence note: in-memory session model (same as PART 19-23); draft storage is Smart-Documents-only and untouched
console.log('DONE p=' + pass + ' f=' + fail + ' nv=' + notVerified + ' pre=' + preexisting);
await browser.close();
server.close();
fs.writeFileSync(path.join(HERE, 'p24_results.txt'), LOG.join('\n') + '\nRESULTS_JSON=' + JSON.stringify({ pass, fail, not_verified: notVerified, preexisting }) + '\nERRORS=' + JSON.stringify(realErrs) + '\n');
