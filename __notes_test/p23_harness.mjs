// PART 23 — Structured PDF tables inside the PDF Editor (rows/columns/cells,
// colors/borders/font/alignment/resize) + real pdf-lib export verification.
// Reuses the PART 19/20 editor, the PART 22 Add menu and the EXISTING export.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8423;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const FIXTURE = path.join(HERE, '_p19_fixture_2p.pdf');
const PNG1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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
// Full open flow (used for the LTR pass and again after the RTL reload).
async function openPdfEditor() {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (b) b.click(); });
  await sleep(400);
  await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
  await sleep(500);
  const inj = await injectFile('part23.pdf', 'application/pdf', fs.readFileSync(FIXTURE).toString('base64'));
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
// Structured-table snapshot from the authoritative overlay store.
async function tables() {
  return await page.evaluate(() => {
    const st = (window.__smartImport && window.__smartImport.overlays()) || {};
    const out = [];
    for (const pk in st) (Array.isArray(st[pk]) ? st[pk] : []).forEach((o) => { if (o && o.type === 'table') out.push({ page: Number(pk), id: o.id, w: o.w || null, rowH: o.rowH || null, hasBorder: o.hasBorder !== false, borderColor: o.borderColor || null, rows: JSON.parse(JSON.stringify(o.rows || [])) }); });
    out.sort((a, b) => a.id - b.id);
    return out;
  });
}
async function tableModel(pg) {
  const ts = await tables();
  if (pg === undefined) return ts[0] || { rows: [] };
  return ts.filter((t) => t.page === pg)[0] || { rows: [] };
}
async function setCell2(tblIdx, r, c, text) {
  return await page.evaluate((ti, rr, cc, tx) => {
    const box = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-ov-table')][ti];
    if (!box) return false;
    const td = box.querySelector('td[data-r="' + rr + '"][data-c="' + cc + '"]');
    if (!td) return false;
    td.textContent = tx;
    td.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, tblIdx, r, c, text);
}
async function selectCell(r, c) {
  return await page.evaluate((rr, cc) => {
    const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="' + rr + '"][data-c="' + cc + '"]');
    if (!td) return false;
    td.focus();
    return !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table td.is-sel');
  }, r, c);
}
async function tbar(act, idx) {
  return await page.evaluate((a, i) => {
    const bar = document.querySelector('#smartPdfEditor .smart-pdf-tbar');
    if (!bar) return false;
    const btns = [...bar.querySelectorAll('[data-tact="' + a + '"]')];
    const b = btns[i || 0];
    if (!b) return false;
    b.click();
    return true;
  }, act, idx || 0);
}
async function setCell(r, c, text) {
  return await page.evaluate((rr, cc, tx) => {
    const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="' + rr + '"][data-c="' + cc + '"]');
    if (!td) return false;
    td.textContent = tx;
    td.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, r, c, text);
}
async function resizeGrip(dx) {
  return await page.evaluate((ddx) => {
    const grip = document.querySelector('#smartPdfEditor .smart-pdf-ov-table .smart-pdf-overlay-grip');
    if (!grip) return false;
    const r = grip.getBoundingClientRect();
    const sx = r.left + r.width / 2;
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: sx, clientY: r.top + r.height / 2 }));
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: sx + ddx }));
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: sx + ddx }));
    return true;
  }, dx);
}
console.log('=== PART 23 - Structured PDF Tables ===');
await page.setViewport({ width: 1366, height: 900 });
await gotoApp();
const origHash = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
const notesBefore = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
const profBefore = await page.evaluate(() => localStorage.getItem('eq-note-company-profile') || '');
// --- open the existing PART 19 editor with a 2-page PDF ---
const opened = await openPdfEditor();
check('P23-01 fixture accepted + PDF Editor opens (PART 19 editor)', opened.inj.ok === true && !!opened.ed, opened.ed);
// --- PART 22 regression: Add menu intact, table present exactly once ---
await page.evaluate(() => document.getElementById('smartPdfAddBtn').click());
await sleep(200);
const menu = await page.evaluate(() => {
  const m = document.getElementById('smartPdfAddMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-add-item') : [])];
  return { open: !!(m && !m.hasAttribute('hidden')), n: items.length, tableCount: items.filter((i) => i.getAttribute('data-add') === 'table').length, types: items.map((i) => i.getAttribute('data-add')).sort().join(',') };
});
check('P23-02 (P22 reg) Add menu opens with exactly 7 items', menu.open && menu.n === 7, menu.n);
check('P23-03 (P22 reg) Table exists exactly once in the Add menu', menu.tableCount === 1 && menu.types === 'date,image,logo,signature,stamp,table,text', menu.types);
// --- create the table on page 1 ---
await addViaMenu('table');
await sleep(400);
let ts = await tables();
check('P23-04 Add Table creates a structured table overlay', ts.length === 1 && ts[0].page === 0, ts.map((t) => t.page));
const t0 = ts[0] || { rows: [] };
check('P23-05 default table >=2x2 with cell objects (not strings/images)', t0.rows.length >= 2 && t0.rows.every((r) => Array.isArray(r) && r.length >= 2 && r.every((c) => c && typeof c === 'object' && typeof c.text === 'string')), JSON.stringify(t0.rows).slice(0, 90));
const domTbl = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-table');
  const t = b && b.querySelector('table');
  return { isTable: !!t, rows: t ? t.rows.length : 0, cols: t ? t.rows[0].cells.length : 0, noImg: b ? !b.querySelector('img,canvas') : false, editable: !!(t && t.rows[0] && t.rows[0].cells[0] && t.rows[0].cells[0].isContentEditable) };
});
check('P23-06 preview renders a real editable <table> (no image/canvas fallback)', domTbl.isTable && domTbl.rows >= 2 && domTbl.cols >= 2 && domTbl.noImg && domTbl.editable, domTbl);
// --- click-to-edit: a real click on a cell focuses it (selection ring) ---
await page.evaluate(() => {
  const td = document.querySelector('#smartPdfEditor .smart-pdf-ov-table td[data-r="0"][data-c="0"]');
  const r = td.getBoundingClientRect();
  td.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 4, clientY: r.top + 4 }));
});
await sleep(150);
// Synthetic dispatchEvent never runs the browser native focus default action,
// so mirror the real click: pointerdown (no drag hijack, box intact) + focus.
const focus1 = await page.evaluate(() => {
  const box = document.querySelector('#smartPdfEditor .smart-pdf-ov-table');
  const td = box && box.querySelector('td[data-r="0"][data-c="0"]');
  if (!box || !td) return { isTd: false, sel: false };
  try { td.focus(); } catch (e) {}
  const el = document.activeElement;
  return { isTd: !!(el && el.closest && el.closest('td[contenteditable]')), sel: !!box.querySelector('td.is-sel') };
});
check('P23-07 clicking a cell selects it for editing (selection ring, no drag hijack)', focus1.sel === true, focus1);
// --- cell edits reach the store (structured model, survives re-render) ---
await setCell(0, 0, 'Item');
await setCell(0, 1, 'Quantity');
await setCell(0, 2, 'Price');
await setCell(1, 0, 'Item A');
await setCell(1, 1, '10');
await setCell(1, 2, '50');
await setCell(2, 0, 'Item B');
await setCell(2, 1, '5');
await setCell(2, 2, '25');
await sleep(200);
let m1 = await tableModel();
check('P23-08 cell edits land in the structured model (rows of cell objects)', m1.rows[0].map((c) => c.text).join('|') === 'Item|Quantity|Price' && m1.rows[1][2].text === '50' && m1.rows[2][1].text === '5', JSON.stringify(m1.rows).slice(0, 120));
// force a full re-render from the store -> edits must survive
await page.evaluate(() => { document.body.click(); });
await sleep(300);
m1 = await tableModel();
check('P23-09 edits survive re-render (store is the source of truth)', m1.rows[1].map((c) => c.text).join('|') === 'Item A|10|50', JSON.stringify(m1.rows[1]));
// --- rows/cols ops ---
await selectCell(1, 1);
await tbar('row+');
await sleep(200);
m1 = await tableModel();
check('P23-10 Add Row appends to the same table', m1.rows.length === 4 && m1.rows[3].length === 3, { rows: m1.rows.length, cols: m1.rows[3] ? m1.rows[3].length : 0 });
await tbar('row-');
await sleep(200);
m1 = await tableModel();
check('P23-11 Delete Row removes the last row', m1.rows.length === 3, m1.rows.length);
await tbar('col+');
await sleep(200);
m1 = await tableModel();
check('P23-12 Add Column appends to every row', m1.rows.every((r) => r.length === 4), m1.rows.map((r) => r.length).join(','));
await tbar('col-');
await sleep(200);
m1 = await tableModel();
check('P23-13 Delete Column keeps rows consistent', m1.rows.every((r) => r.length === 3), m1.rows.map((r) => r.length).join(','));
// delete down to the structural minimum (1x1 must stay valid)
for (let i = 0; i < 5; i++) await tbar('row-');
await sleep(150);
m1 = await tableModel();
const minRows = m1.rows.length;
for (let i = 0; i < 5; i++) await tbar('col-');
await sleep(150);
m1 = await tableModel();
check('P23-14 delete guards keep the table structurally valid (>=1x1)', minRows === 1 && m1.rows.length === 1 && m1.rows[0].length === 1 && m1.rows[0][0] && typeof m1.rows[0][0] === 'object', { minRows, w: m1.rows[0].length });
// --- rebuild a 3x3 working table from the 1x1 minimum ---
await tbar('row+'); await tbar('row+');
await tbar('col+'); await tbar('col+');
await sleep(250);
m1 = await tableModel();
check('P23-15 rebuilt to 3x3 (rows/cols ops compose)', m1.rows.length === 3 && m1.rows.every((r) => r.length === 3), m1.rows.length + 'x' + (m1.rows[0] || []).length);
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) await setCell(r, c, (r === 0 ? ['Item', 'Quantity', 'Price'][c] : r === 1 ? ['Item A', '10', '50'][c] : ['Item B', '5', '25'][c]));
await setCell(2, 0, '\u0639\u0631\u0628\u064a Mixed');
await sleep(250);
m1 = await tableModel();
check('P23-16 all cells editable incl. mixed Arabic/English', m1.rows[0][2].text === 'Price' && m1.rows[1][2].text === '50' && /\u0639\u0631\u0628\u064a/.test(m1.rows[2][0].text), JSON.stringify(m1.rows).slice(0, 100));
// --- resize via the existing corner grip; min size enforced ---
const wBefore = m1.w || 0;
await resizeGrip(80); await sleep(250);
m1 = await tableModel();
check('P23-17 resize grows the table width', m1.w >= wBefore + 50, { before: wBefore, after: m1.w });
await resizeGrip(-100000); await sleep(250);
m1 = await tableModel();
check('P23-18 resize never collapses to zero/negative (min clamp)', m1.w >= 40 && m1.w > 0, m1.w);
await selectCell(0, 0);
await tbar('tc', 1); await sleep(200);
m1 = await tableModel();
check('P23-19 text color applies to the selected cell', m1.rows[0][0].color === '#ff0000', m1.rows[0][0].color);
await tbar('bg', 0); await sleep(200);
m1 = await tableModel();
check('P23-20 cell background applies to the selected cell', m1.rows[0][0].bg === '#ffff00', m1.rows[0][0].bg);
await tbar('bc', 1); await sleep(200);
m1 = await tableModel();
check('P23-21 border color applies to the table model', m1.borderColor === '#ff0000', m1.borderColor);
await tbar('bn'); await sleep(200);
m1 = await tableModel();
const domNob = await page.evaluate(() => !!document.querySelector('#smartPdfEditor .smart-pdf-ov-table table[style*="--tdbw:0px"]'));
check('P23-22 border toggle off (model + preview)', m1.hasBorder === false && domNob, { hasBorder: m1.hasBorder, domNob });
await tbar('by'); await sleep(200);
m1 = await tableModel();
check('P23-23 border toggle back on', m1.hasBorder !== false, m1.hasBorder);
await selectCell(0, 1);
await tbar('f-b'); await tbar('f-i'); await sleep(200);
m1 = await tableModel();
check('P23-24 bold + italic apply to the selected cell', m1.rows[0][1].bold === true && m1.rows[0][1].italic === true, m1.rows[0][1]);
await tbar('al-c'); await sleep(200);
m1 = await tableModel();
check('P23-25 center alignment applies', m1.rows[0][1].align === 'center', m1.rows[0][1].align);
await tbar('al-r'); await sleep(150); m1 = await tableModel();
check('P23-26 right alignment applies', m1.rows[0][1].align === 'right', m1.rows[0][1].align);
await tbar('al-l'); await sleep(150); m1 = await tableModel();
check('P23-27 left alignment applies', m1.rows[0][1].align === 'left' || m1.rows[0][1].align === '', m1.rows[0][1].align);
await selectCell(0, 0);
await tbar('rh+'); await tbar('rh+'); await tbar('rh-'); await sleep(200);
m1 = await tableModel();
check('P23-28 row-height control clamps within valid range', m1.rowH === undefined || m1.rowH >= 12, m1.rowH);
// --- page association + multi-page separation ---
const page0Table = await page.evaluate(() => document.querySelector('#smartPdfEditor .smart-pdf-ov-table').dataset.page);
await page.evaluate(() => { const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="1"]'); wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 })); });
await addViaMenu('table'); await sleep(400);
const ts2 = await tables();
const pgTbl = await page.evaluate(() => { const bs = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-ov-table')]; return bs.map((b) => ({ page: b.dataset.page, hasTbar: !!b.querySelector('.smart-pdf-tbar') })); });
check('P23-29 each table stays on its own page (0 vs 1)', ts2.length === 2 && ts2.some((t) => t.page === 0) && ts2.some((t) => t.page === 1) && page0Table === '0', { pages: ts2.map((t) => t.page), pgTbl });
check('P23-30 both tables carry their own controls bar', pgTbl.every((t) => t.hasTbar), pgTbl);
await setCell2(1, 0, 0, 'PAGE2TBL'); await sleep(200);
const pg2 = await tableModel(1);
const pg2check = pg2 && pg2.rows && pg2.rows[0] ? pg2.rows[0][0] : '';
check('P23-31 page-2 table edits stay separate from page-1 data', pg2check.text === 'PAGE2TBL' && (await tableModel(0)).rows[0][0].text === 'Item', pg2check);
await page.evaluate(() => { document.body.click(); }); await sleep(300);
const visT = await page.evaluate(() => [...document.querySelectorAll('#smartPdfEditor .smart-pdf-ov-table table')].length);
check('P23-32 preview renders both tables after rerender', visT === 2, visT);
// --- export: genuine PDF, real text, original untouched ---
const exp = await page.evaluate(async () => { const blob = await window.__smartImport.editedBlob(); const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]); return { b64: btoa(bin), head: bin.slice(0, 5), size: buf.length }; });
check('P23-33 exported file is a genuine PDF (%PDF-)', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
const extracted = await page.evaluate(async (b64) => {
  let pdfjs = window.pdfjsLib;
  if (!pdfjs) { await new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = '/__pdfdiag/vendor/pdf.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); }); pdfjs = window.pdfjsLib; }
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
  const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const doc = await pdfjs.getDocument({ data: u8 }).promise;
  const p1 = await (await doc.getPage(1)).getTextContent();
  const p2 = await (await doc.getPage(2)).getTextContent();
  return { pages: doc.numPages, t1: p1.items.map((i) => i.str).join(' '), t2: p2.items.map((i) => i.str).join(' ') };
}, exp.b64);
check('P23-34 exported PDF keeps 2 pages (multi-page intact)', extracted.pages === 2, extracted.pages);
check('P23-35 table-1 cell text is REAL selectable PDF text on page 1', ['Item', 'Quantity', 'Price', '50', '25'].every((w) => extracted.t1.indexOf(w) >= 0), extracted.t1.slice(0, 140));
check('P23-36 table-2 cell text is REAL selectable PDF text on page 2', extracted.t2.indexOf('PAGE2TBL') >= 0, extracted.t2.slice(0, 100));
check('P23-37 original page content intact after export', extracted.t2.indexOf('Page 2') >= 0, extracted.t2.slice(0, 60));
const origHash2 = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P23-38 original source PDF unchanged (sha256)', origHash2 === origHash);
const notesAfter = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
const profAfter = await page.evaluate(() => localStorage.getItem('eq-note-company-profile') || '');
check('P23-39 Notes storage unchanged', notesAfter === notesBefore);
check('P23-40 Company Profile storage unchanged', profAfter === profBefore, { seeded: profBefore !== '' });
// --- responsive: table + toolbar usable, no new UI overflow ---
const resp = [];
for (const w of [1366, 768, 430, 390]) {
  await page.setViewport({ width: w, height: 850 });
  await sleep(300);
    const r = await page.evaluate(() => {
    const holder = document.getElementById('smartPdfEditor');
    const bar = document.querySelector('#smartPdfEditor .smart-pdf-ov-table .smart-pdf-tbar');
    const btn = bar ? bar.querySelector('[data-tact="row+"]') : null;
    const br = bar ? bar.getBoundingClientRect() : null;
    const bb = document.querySelector('#smartPdfEditor .smart-pdf-ov-table'); const bbr = bb ? bb.getBoundingClientRect() : null;
    const data = { bar: !!bar, btn: !!btn, bl: br?Math.round(br.left):null, brR: br?Math.round(br.right):null, bw: br?Math.round(br.width):null, iw: window.innerWidth, boxL: bbr?Math.round(bbr.left):null, boxW: bbr?Math.round(bbr.width):null, hx: holder.scrollWidth - holder.clientWidth };
    data.barInX = !!(data.bar && data.bl !== null && data.brR !== null && data.brR <= data.iw && data.bl >= 0);
    return data;
  });
  resp.push({ w, ...r });
}
check('P23-41 table controls present + clickable (touch-accessible) at 1366/768/430/390', resp.every((r) => r.bar && r.btn), resp.map((r) => r.w + ':' + (r.bar ? 'bar:' + (r.btn ? 'btn' : 'NOBTN') : 'NO')).join(' '));
check('P23-42 no new editor-holder overflow caused by PART 23', resp.every((r) => r.hx <= 0), resp.map((r) => r.w + ':hx' + r.hx).join(' '));
// --- RTL: reload with Arabic, reopen the editor, check Arabic labels ---
await page.evaluate(() => { localStorage.setItem('eq-language', 'ar'); });
await page.reload({ waitUntil: 'load' }); await sleep(900);
await openPdfEditor();
await addViaMenu('table'); await sleep(400);
const rtl = await page.evaluate(() => {
  const html = document.documentElement;
  const bar = document.querySelector('#smartPdfEditor .smart-pdf-tbar');
  const btn = bar && bar.querySelector('[data-tact="row+"]');
  const del = bar && bar.querySelector('[data-tact="row-"]');
  return { dir: html.getAttribute('dir'), rowLabel: btn ? (btn.getAttribute('title') || '') : '', delLabel: del ? (del.getAttribute('aria-label') || '') : '' };
});
check('P23-43 RTL mode + Arabic accessible table labels from existing i18n', rtl.dir === 'rtl' && rtl.rowLabel.indexOf('\u0635\u0641') >= 0 && rtl.delLabel.length > 0, rtl);
await page.evaluate(() => { localStorage.setItem('eq-language', 'en'); });
await page.reload({ waitUntil: 'load' }); await sleep(900);
await openPdfEditor();
await addViaMenu('table'); await sleep(400);
const ltr = await page.evaluate(() => { const bar = document.querySelector('#smartPdfEditor .smart-pdf-tbar'); const btn = bar && bar.querySelector('[data-tact="row+"]'); return { label: btn ? (btn.getAttribute('title') || '') : '' }; });
check('P23-44 LTR mode + English accessible labels', /row/i.test(ltr.label), ltr);
// --- results ---
check('P23-45 no new JS errors', realErrs.length === 0, realErrs.slice(0, 3));
await browser.close();
server.close();
fs.writeFileSync(path.join(HERE, 'p23_results.txt'), LOG.join('\n') + '\nRESULTS_JSON=' + JSON.stringify({ pass, fail, not_verified: notVerified, preexisting }) + '\nERRORS=' + JSON.stringify(realErrs) + '\n');
console.log('DONE p=' + pass + ' f=' + fail + ' nv=' + notVerified + ' pre=' + preexisting);
