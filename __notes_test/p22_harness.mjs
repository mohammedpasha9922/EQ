// PART 22 — PDF Add (Text/Image/Logo/Signature/Stamp/Date/Table) in the PDF Editor.
// Real-browser behavioral harness. Reuses the EXISTING Smart Documents import flow,
// the PART 19/20 editor UI, and the EXISTING pdf-lib export. No new engine.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8413;
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
      return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted, spans: document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length };
    });
    if (s.visible && s.pages >= 2 && s.painted >= 2 && s.spans >= 4) return s;
    await sleep(250);
  }
  return null;
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
    return { ok: true, menuOpen: !menu.hasAttribute('hidden') };
  }, type);
}
async function overlayState() {
  return await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay')];
    return {
      count: boxes.length,
      kinds: boxes.map((b) => b.className.replace('smart-pdf-overlay smart-pdf-ov-', '')).sort().join(','),
      pages: boxes.map((b) => b.dataset.page).sort().join(','),
      store: (window.__smartImport && window.__smartImport.overlays()) || {}
    };
  });
}
console.log('=== PART 22 - PDF Add (7 items) ===');
await page.setViewport({ width: 1366, height: 900 });
await gotoApp();
const origHash = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
const notesBefore = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
let profBefore = await page.evaluate(() => localStorage.getItem('eq-note-company-profile') || '');
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (b) b.click(); });
await sleep(400);
await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
await sleep(500);
const inj = await injectFile('part22.pdf', 'application/pdf', fs.readFileSync(FIXTURE).toString('base64'));
check('P22-01 fixture accepted into existing input', inj.ok === true, inj);
const ed = await waitEditor();
check('P22-02 PDF Editor opens (existing PART 19 editor)', !!ed, ed);
const btn = await page.evaluate(() => document.querySelectorAll('#smartPdfAddBtn').length);
check('P22-03 Add button exists exactly once', btn === 1, { count: btn });
await page.evaluate(() => document.getElementById('smartPdfAddBtn').click());
await sleep(200);
const menu = await page.evaluate(() => {
  const m = document.getElementById('smartPdfAddMenu');
  const items = [...(m ? m.querySelectorAll('.smart-pdf-add-item') : [])];
  const types = items.map((i) => i.getAttribute('data-add')).sort().join(',');
  const r = m ? m.getBoundingClientRect() : { width: 0, height: 0, left: -1, top: -1 };
  return { open: !!(m && !m.hasAttribute('hidden')), n: items.length, types, w: r.width, h: r.height, left: r.left, top: r.top };
});
check('P22-04 Add menu opens', menu.open === true, menu);
check('P22-05 Add menu contains exactly 7 primary items', menu.n === 7, menu.n);
check('P22-06 all 7 required types present', menu.types === 'date,image,logo,signature,stamp,table,text', menu.types);
const beforeTxt = (await overlayState()).count;
await addViaMenu('text');
await sleep(300);
let st = await overlayState();
const txtBox = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-text');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { page: b.dataset.page, text: b.querySelector('.smart-pdf-overlay-body').textContent, inPage: r.width > 10 && r.height > 10 };
});
check('P22-07 Add Text creates editable overlay on current page', st.count === beforeTxt + 1 && !!txtBox && txtBox.page === '0' && txtBox.inPage, { st: st.count, txtBox });
await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-text .smart-pdf-overlay-body');
  b.textContent = 'ADDED22';
  b.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(200);
st = await overlayState();
check('P22-08 edited overlay text persists in the store (not DOM-only)', JSON.stringify(st.store).indexOf('ADDED22') >= 0, {});
await addViaMenu('date'); await sleep(250);
st = await overlayState();
check('P22-09 Add Date creates overlay', st.kinds.indexOf('date') >= 0, st.kinds);
await addViaMenu('table'); await sleep(250);
const tbl = await page.evaluate(() => {
  const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-table');
  if (!b) return null;
  const t = b.querySelector('table');
  return { isTable: !!t, rows: t ? t.rows.length : 0, cells: t ? t.rows[0].cells.length : 0, noImg: !b.querySelector('img') };
});
check('P22-10 Add Table creates structured HTML table (not image)', !!tbl && tbl.isTable && tbl.rows >= 2 && tbl.cells >= 2 && tbl.noImg, tbl);
const preNoLogo = (await overlayState()).count;
await addViaMenu('logo'); await sleep(300);
st = await overlayState();
check('P22-11 missing logo handled without crash (no new overlay)', st.count === preNoLogo && realErrs.length === 0, { count: st.count, errs: realErrs.length });
await page.evaluate((png) => {
  localStorage.setItem('eq-note-company-profile', JSON.stringify({ companyName: 'Acme', address: '', phone: '', email: '', website: '', logo: 'data:image/png;base64,' + png, signature: 'data:image/png;base64,' + png, stamp: 'data:image/png;base64,' + png, footer: '' }));
}, PNG1x1);
profBefore = await page.evaluate(() => localStorage.getItem('eq-note-company-profile') || '');
await addViaMenu('logo'); await sleep(350);
await addViaMenu('signature'); await sleep(350);
await addViaMenu('stamp'); await sleep(350);
st = await overlayState();
const imgs = await page.evaluate(() => [...document.querySelectorAll('#smartPdfEditor .smart-pdf-ov-image img')].filter((i) => (i.src || '').indexOf('data:image/') === 0).length);
check('P22-12 Logo/Signature/Stamp reuse Company Profile (image overlays)', imgs >= 3, { kinds: st.kinds, imgs });
// P22-13 Add Image via the real file-input path (blob URL -> data URL for export)
await addViaMenu('image'); await sleep(250);
const imgInj = await page.evaluate(async (png) => {
  const input = document.getElementById('smartPdfAddImageInput');
  if (!input) return { ok: false, why: 'no input' };
  const bin = atob(png); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const dt = new DataTransfer(); dt.items.add(new File([u8], 'pic.png', { type: 'image/png' }));
  input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true };
}, PNG1x1);
await sleep(500);
st = await overlayState();
check('P22-13 Add Image via file input creates overlay with embeddable data URL', imgInj.ok === true && JSON.stringify(st.store).indexOf('data:image/png;base64,') >= 0, { count: st.count });
// P22-14 page association: real pointerdown on page 2, then add -> data-page 1
await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="1"]');
  wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
});
await addViaMenu('text'); await sleep(300);
st = await overlayState();
check('P22-14 element added on page 2 keeps its page association', st.pages.indexOf('1') >= 0, st.pages);
// P22-15 preview: every overlay box visible on its page (the editor IS the preview)
const vis = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay')];
  const holder = document.getElementById('smartPdfEditor');
  return { n: boxes.length, onscreen: boxes.filter((b) => { const r = b.getBoundingClientRect(); const hr = holder.getBoundingClientRect(); return r.width > 5 && r.height > 5; }).length, hx: holder.scrollWidth - holder.clientWidth };
});
check('P22-15 preview renders all added elements', vis.n >= 6 && vis.onscreen === vis.n, vis);
// P22-16 export: genuine PDF containing the added text + table, original untouched
const exp = await page.evaluate(async () => {
  const blob = await window.__smartImport.editedBlob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { b64: btoa(bin), head: bin.slice(0, 5), size: buf.length };
});
check('P22-16 exported file is a genuine PDF (%PDF-)', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
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
  return { pages: doc.numPages, t1: p1.items.map((i) => i.str).join(' '), t2: p2.items.map((i) => i.str).join(' ') };
}, exp.b64);
check('P22-17 exported PDF still has 2 pages (multi-page intact)', extracted.pages === 2, extracted.pages);
check('P22-18 added text ADDED22 appears in exported PDF (real text)', extracted.t1.indexOf('ADDED22') >= 0, extracted.t1.slice(0, 80));
check('P22-19 original page 2 content intact after export', extracted.t2.indexOf('Page 2') >= 0, extracted.t2.slice(0, 60));
const origHash2 = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P22-20 original source PDF unchanged (sha256)', origHash2 === origHash);
const notesAfter = await page.evaluate(() => localStorage.getItem('eq-notes-data') || localStorage.getItem('notesData') || '');
const profAfter = await page.evaluate(() => localStorage.getItem('eq-note-company-profile') || '');
check('P22-21 Notes storage unchanged', notesAfter === notesBefore);
check('P22-22 Company Profile storage unchanged by export', profAfter === profBefore, { seeded: profBefore !== '' });
// P22-23..26 responsive: menu inside viewport + editor holder no overflow
const resp = [];
for (const w of [1366, 768, 430, 390]) {
  await page.setViewport({ width: w, height: 850 });
  await sleep(300);
  const r = await page.evaluate(() => {
    const btn = document.getElementById('smartPdfAddBtn');
    btn.click();
    const m = document.getElementById('smartPdfAddMenu');
    const mr = m.getBoundingClientRect();
    const holder = document.getElementById('smartPdfEditor');
    const out = { open: !m.hasAttribute('hidden'), inX: mr.left >= 0 && mr.right <= window.innerWidth, hx: holder.scrollWidth - holder.clientWidth };
    m.setAttribute('hidden', '');
    return out;
  });
  resp.push({ w, ...r });
}
check('P22-23 menu usable + inside viewport at 1366/768/430/390', resp.every((r) => r.open && r.inX), resp);
check('P22-24 no new editor-holder overflow at any width', resp.every((r) => r.hx <= 0), resp.map((r) => r.w + ':' + r.hx).join(' '));
// P22-25 RTL: Arabic labels applied from the existing i18n system
await page.evaluate(() => { localStorage.setItem('eq-language', 'ar'); });
await page.reload({ waitUntil: 'load' }); await sleep(800);
const rtl = await page.evaluate(() => {
  const html = document.documentElement;
  const b = document.getElementById('smartPdfAddBtn');
  return { dir: html.getAttribute('dir'), label: b ? b.textContent.trim() : '', locale: (window.state && window.state.locale) || '' };
});
check('P22-25 RTL + Arabic Add label from existing i18n', rtl.dir === 'rtl' && rtl.label.length > 0 && rtl.label !== 'Add', rtl);
// results
check('P22-26 no new JS errors', realErrs.length === 0, realErrs.slice(0, 3));
await browser.close();
server.close();
fs.writeFileSync(path.join(HERE, 'p22_results.txt'), LOG.join('\n') + '\nRESULTS_JSON=' + JSON.stringify({ pass, fail, not_verified: notVerified, preexisting }) + '\nERRORS=' + JSON.stringify(realErrs) + '\n');
console.log('DONE p=' + pass + ' f=' + fail + ' nv=' + notVerified + ' pre=' + preexisting);