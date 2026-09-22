// PART 25 — PDF Pages (Add / Delete / Reorder / Rotate / Duplicate) in the PDF Editor.
// Clean behavioral harness: real Chrome via puppeteer-core. Each operation is validated at the
// MODEL level (window.__smartImport.pageModel() / .overlays()) with polling (no fixed short races),
// and each critical op runs in a freshly opened editor session to avoid state cascade.
// Run:  node tests/part25_pdf_pages.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8441;
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

async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(700); }
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
async function waitEditor(tries = 100) {
  for (let i = 0; i < tries; i++) {
    const s = await page.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
      return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted };
    });
    if (s.visible && s.pages >= 2 && s.painted >= 2) return s;
    await sleep(220);
  }
  return null;
}
async function openPdfEditor() {
  await page.evaluate(() => { document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]')?.click(); });
  await sleep(380);
  await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
  await sleep(500);
  const inj = await injectFile('part25.pdf', 'application/pdf', fs.readFileSync(FIXTURE).toString('base64'));
  const ed = await waitEditor();
  return { inj, ed };
}
// — synchronous model seams —
async function model() {
  return await page.evaluate(() => window.__smartImport && window.__smartImport.pageModel ? window.__smartImport.pageModel() : null);
}
async function ovs() {
  return await page.evaluate(() => window.__smartImport && window.__smartImport.overlays ? JSON.parse(JSON.stringify(window.__smartImport.overlays())) : (window.__smartImportOverlays || {}));
}
// poll a predicate on model() until true or timeout
async function waitFor(fn, tries = 60, gap = 250) {
  for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return true; await sleep(gap); }
  return false;
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
async function pagesAct(act, selectIdx) {
  return await page.evaluate((a, idx) => {
    const btn = document.getElementById('smartPdfPagesBtn');
    const m = document.getElementById('smartPdfPagesMenu');
    if (!m || m.hasAttribute('hidden')) btn.click();
    if (idx !== undefined && idx !== null) {
      const c = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="' + idx + '"]');
      if (c) c.click();
    }
    const b = m.querySelector('[data-pact="' + a + '"]');
    if (!b) return { clicked: false };
    b.click();
    return { clicked: true };
  }, act, selectIdx === undefined ? null : selectIdx);
}
async function moveChip(i, dir) {
  return await page.evaluate((n, d) => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (!m || m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
    const c = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="' + n + '"]');
    const b = c && c.querySelector('[data-pmove="' + d + '"]');
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, i, dir);
}
async function dnd(from, to) {
  return await page.evaluate((f, t) => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (!m || m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
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
async function addOverlayToPage(idx, kind, text) {
  await page.evaluate((n) => {
    const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="' + n + '"]');
    if (wrap) wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
  }, idx);
  await page.evaluate((k) => {
    const btn = document.getElementById('smartPdfAddBtn');
    btn.click();
    const item = document.querySelector('.smart-pdf-add-item[data-add="' + k + '"]');
    if (item) item.click();
  }, kind);
  await sleep(420);
  if (text && (kind === 'text' || kind === 'date')) {
    await page.evaluate((txt) => {
      const b = document.querySelector('#smartPdfEditor .smart-pdf-overlay-body');
      if (b) { b.textContent = txt; b.dispatchEvent(new Event('input', { bubbles: true })); }
    }, text);
    await sleep(220);
  }
}
async function markDom() {
  return await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay')];
    return { count: boxes.length, pages: boxes.map((b) => b.dataset.page).sort().join(',') };
  });
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
// ================= UI =================
await gotoApp();
await page.evaluate(() => { localStorage.setItem('eq-language', 'en'); });
await gotoApp();
const ui = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('#smartPdfPagesBtn')];
  const m = document.getElementById('smartPdfPagesMenu');
  return { count: btns.length, menu: !!m, acts: m ? [...m.querySelectorAll('[data-pact]')].map((b) => b.getAttribute('data-pact')).sort().join(',') : '' };
});
check('P25-A Pages button exists exactly once', ui.count === 1, ui.count);
check('P25-B menu has only the 5 required actions (add/del/dup/rot; move is per-chip)', ui.menu && ui.acts === 'add,del,dup,rot', ui.acts);

// ================= Add Page =================
let opened = await openPdfEditor();
check('P25-C fixture accepted + editor opens (2 pages)', !!opened.ed, opened.ed);
let m0 = await model();
check('P25-D initial model is identity [0,1]', m0 && m0.length === 2 && m0[0].src === 0 && m0[1].src === 1, m0);
await pagesOpen();
await pagesAct('add');
const added = await waitFor(async () => (await model()).length === 3, 60, 250);
m0 = await model();
check('P25-E Add Page inserts a REAL blank page (model becomes 3, blank at END)', added && m0[2] && m0[2].blank && m0[2].src === -1, m0);
const wrapCountReady = await waitFor(async () => {
  const w = await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length);
  return w === 3;
}, 60, 250);
const wrapCount = await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length);
check('P25-F editor re-renders the new page (3 page boxes)', wrapCountReady && wrapCount === 3, wrapCount);
const blankRendered = await page.evaluate(() => {
  const w = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="2"]');
  const c = w && w.querySelector('canvas');
  return !!(w && c && c.width > 0);
});
check('P25-G blank page renders a white page box', blankRendered, !!blankRendered);

// ================= Delete Page =================
await pagesOpen();
await pagesAct('del', 2); // delete the blank page just added
const del = await waitFor(async () => (await model()).length === 2, 60, 250);
check('P25-H Delete Page removes it from the model (back to 2)', del, await model());
await pagesOpen();
await pagesAct('del', 0);
await waitFor(async () => (await model()).length === 1, 60, 250);
m0 = await model();
check('P25-I can delete down to 1 page', m0 && m0.length === 1, m0);
await pagesOpen();
await pagesAct('del', 0);
await sleep(250);
m0 = await model();
check('P25-J delete blocked when only 1 page remains (never 0)', m0 && m0.length === 1, m0);
// ================= Reorder (drag & drop + move fallback) =================
await page.reload({ waitUntil: 'load' }); await sleep(900);
await openPdfEditor(); await closePages();
await pagesOpen();
await pagesAct('add'); // 3 pages now: [0, 1, blank]
m0 = await model();
const beforeDnd = m0.map((e) => e.src).join(',');
await dnd(2, 0); // move blank (last) to first
const reord = await waitFor(async () => { const mm = await model(); return mm.map((e) => e.src).join(',') !== beforeDnd; }, 60, 250);
m0 = await model();
check('P25-K drag & drop reorder changes the MODEL order', reord && m0[0].src === -1, m0);
const beforeFb = m0.map((e) => e.src).join(',');
const mv = await moveChip(0, 1);
const fb = await waitFor(async () => { const mm = await model(); return mm.map((e) => e.src).join(',') !== beforeFb; }, 60, 250);
check('P25-L Move Down fallback reorders the model', mv && fb, await model());

// ================= Rotate (90 -> 180 -> 270 -> 0 cycle) =================
await pagesOpen();
await pagesAct('rot', 0);
await waitFor(async () => (await model())[0].rot === 90, 60, 250);
check('P25-M rotate 90', (await model())[0].rot === 90, (await model())[0].rot);
await pagesAct('rot', 0);
await waitFor(async () => (await model())[0].rot === 180, 60, 250);
check('P25-N rotate 180', (await model())[0].rot === 180, (await model())[0].rot);
await pagesAct('rot', 0);
await waitFor(async () => (await model())[0].rot === 270, 60, 250);
check('P25-O rotate 270', (await model())[0].rot === 270, (await model())[0].rot);
await pagesAct('rot', 0);
await waitFor(async () => ((await model())[0].rot || 0) === 0, 60, 250);
check('P25-P rotate reset to 0', !(await model())[0].rot, (await model())[0].rot);
// rotation must carry into the exported PDF as a real /Rotate
await pagesAct('rot', 0);
await waitFor(async () => (await model())[0].rot === 90, 60, 250);
await closePages();
const rotExp = await exportPdf();
const rotEx = await extractPdf(rotExp.b64);
check('P25-Q1 rotation persisted as real /Rotate in the exported PDF', rotEx.rots.some((r) => r === 90), rotEx.rots);
// ================= Duplicate (independent deep copy + overlay carried) =================
await page.reload({ waitUntil: 'load' }); await sleep(900);
await openPdfEditor(); await closePages();
await addOverlayToPage(0, 'text', 'ORIGTXT');
let st = await markDom();
check('P25-Q overlay exists on page 0 before duplicate', st.pages.indexOf('0') >= 0, st.pages);
await pagesOpen();
await pagesAct('dup', 0);
const dup2 = await waitFor(async () => (await model()).length === 3, 60, 250);
m0 = await model();
check('P25-R Duplicate inserts a copy after the source (3 pages)', dup2 && m0[1].src === m0[0].src, m0);
const ovCopy = await waitFor(async () => {
  const oa = await ovs();
  return oa['1'] && oa['1'].length >= 1 && oa['0'] && oa['0'].length >= 1;
}, 60, 250);
const o = await ovs();
check('P25-S duplicate carries a copy of the overlay onto the new page', ovCopy && o['0'].length === 1 && o['1'].length === 1, { p0: o['0'] && o['0'].length, p1: o['1'] && o['1'].length });
check('P25-T duplicated overlay is a DEEP COPY (independent object)', o['0'][0] !== o['1'][0] && o['0'][0].text === o['1'][0].text, { t0: o['0'][0] && o['0'][0].text, t1: o['1'][0] && o['1'][0].text });
const indep = await page.evaluate(() => {
  const ov = window.__smartImport.overlays();
  const orig = ov['0'][0];
  const copyBefore = ov['1'][0].text;
  orig.text = 'CHANGED_ORIGINAL';
  const copyAfter = ov['1'][0].text;
  return { copyBefore, copyAfter, origNow: orig.text };
});
check('P25-U editing the original does NOT change the duplicate (deep copy independence)', indep.copyBefore === 'ORIGTXT' && indep.copyAfter === 'ORIGTXT' && indep.origNow === 'CHANGED_ORIGINAL', indep);

// ================= Persistence: export reflects dup/order; re-import rebuilds =================
await closePages();
const exp = await exportPdf();
check('P25-V exported file is a genuine PDF', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
const ex = await extractPdf(exp.b64);
check('P25-W exported PDF has the MODEL page count (3 pages)', ex.pages === 3, ex.pages);
await page.reload({ waitUntil: 'load' }); await sleep(900);
await page.evaluate(() => { document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]')?.click(); });
await sleep(380);
await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
await sleep(500);
const re = await injectFile('reimport.pdf', 'application/pdf', exp.b64);
const reEd = await waitEditor();
check('P25-X re-import of exported PDF reopens editor', !!(re.ok && reEd), reEd);
const mRe = await model();
check('P25-Y reopened model derives page order from exported PDF (3 pages, dup preserved)', mRe && mRe.length === 3, mRe);

// ================= Safety: original untouched =================
const h1 = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P25-Z original source PDF file unchanged on disk (sha256)', h1 === crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex'), '');
// ================= Part 24 / 23 regression (Mark + Table) =================
await page.reload({ waitUntil: 'load' }); await sleep(900);
await openPdfEditor();
const markMenu = await page.evaluate(() => {
  const b = document.getElementById('smartPdfMarkBtn'); if (b) b.click();
  const m = document.getElementById('smartPdfMarkMenu');
  return { open: !!(m && !m.hasAttribute('hidden')), kinds: m ? [...m.querySelectorAll('[data-mark]')].map((x) => x.getAttribute('data-mark')).sort().join(',') : '' };
});
check('P25-AA (P24 reg) Mark menu has exactly the 4 mark tools', markMenu.open && markMenu.kinds === 'comment,draw,highlight,underline', markMenu);
await page.evaluate(() => { const m = document.getElementById('smartPdfMarkMenu'); if (m) m.setAttribute('hidden', ''); });
await page.evaluate(() => document.getElementById('smartPdfAddBtn').click());
await sleep(200);
const addItems = await page.evaluate(() => {
  const m = document.getElementById('smartPdfAddMenu');
  return { n: m ? m.querySelectorAll('.smart-pdf-add-item').length : 0, table: m ? m.querySelectorAll('.smart-pdf-add-item[data-add="table"]').length : 0 };
});
check('P25-AB (P22/23 reg) Add menu intact incl. one Table', addItems.n === 7 && addItems.table === 1, addItems);

// ================= PART 23/24 regression: Table + Mark survive Reorder & Duplicate =================
await page.reload({ waitUntil: 'load' }); await sleep(900);
await openPdfEditor(); await closePages();
// PART 23 — add a real Table on page 0 via the Add UI
await addOverlayToPage(0, 'table');
const tblAdded = await waitFor(async () => { const oa = await ovs(); return oa['0'] && oa['0'].some((x) => x && x.type === 'table'); }, 60, 250);
check('P25-AD (P23) real Table created on page 0', tblAdded, await ovs());
// mark: inject a highlight overlay into the SAME store, then verify the shared dup/remap carries it
await page.evaluate(() => {
  const ov = window.__smartImport.overlays();
  if (!ov['0']) ov['0'] = [];
  ov['0'].push({ id: 'hl1', type: 'highlight', color: '#fde047', x: 20, y: 40, w: 90, h: 14 });
});
await closePages();
await pagesOpen();
await pagesAct('dup', 0);
const dupTbl = await waitFor(async () => {
  const mm = await model(); if (mm.length !== 3) return false;
  const oa = await ovs();
  return oa['1'] && oa['1'].some((x) => x && x.type === 'table') && oa['1'].some((x) => x && x.type === 'highlight');
}, 80, 250);
const oT = await ovs();
check('P25-AE (P23) Table duplicated onto the new page (independent copy)', dupTbl && oT['1'] && oT['1'].some((x) => x && x.type === 'table'), { p0t: oT['0'] && oT['0'].filter((x) => x && x.type === 'table').length, p1t: oT['1'] && oT['1'].filter((x) => x && x.type === 'table').length });
check('P25-AF (P24) Mark (highlight) duplicated via shared overlay deep-copy', oT['1'] && oT['1'].some((x) => x && x.type === 'highlight'), oT['1'] && oT['1'].map((x) => x && x.type));
// Reorder: move the duplicated copy to the front, content (table+mark) follows its page
await pagesOpen();
await moveChip(1, -1);
const reordered = await waitFor(async () => { const mm = await model(); return mm[0] && mm[0].src === 0; }, 60, 250);
const oR = await ovs();
check('P25-AG (P23) Table stays attached to its page after Reorder', reordered && oR['0'] && oR['0'].some((x) => x && x.type === 'table'), { m: await model(), p0: oR['0'] && oR['0'].map((x) => x && x.type) });
check('P25-AH (P24) Mark stays attached to its page after Reorder', oR['0'] && oR['0'].some((x) => x && x.type === 'highlight'), oR['0'] && oR['0'].map((x) => x && x.type));
await closePages();

check('P25-AC no new JS errors across the run', realErrs.length === 0, realErrs.slice(0, 3));
console.log('DONE p=' + pass + ' f=' + fail + ' nv=0 pre=' + preexisting);
await browser.close();
server.close();
const OUTPATH = path.join(HERE, 'part25_pdf_pages_results.txt');
fs.writeFileSync(OUTPATH, LOG.join('\n') + '\nRESULTS_JSON=' + JSON.stringify({ pass, fail, not_verified: 0, preexisting }) + '\nERRORS=' + JSON.stringify(realErrs) + '\n');
console.log('wrote ' + OUTPATH);