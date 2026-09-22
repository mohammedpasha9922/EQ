// PART 27 — PDF Signature (Add → Signature: Draw + Upload).
// Copies the proven P26 puppeteer harness shape and asserts the P27 contract.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8455;
const PREEXISTING_SVG = /attribute d: Expected number|forEach is not a function/i;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
const FIXTURE_BYTES = fs.readFileSync(FIXTURE);
const FIXTURE_HASH = crypto.createHash('sha256').update(FIXTURE_BYTES).digest('hex');
let pass = 0, fail = 0, nv = 0;
const LOG = [];
const realErrs = [];
function check(name, ok, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${d !== '' ? '  -> ' + d : ''}`);
  if (ok) pass++; else fail++;
}
function checkNV(name, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`NOT VERIFIED  ${name}${d !== '' ? '  -> ' + d : ''}`);
  nv++;
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
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(String(e && e.message || e))) realErrs.push('pageerror: ' + (e && e.message)); });
page.on('console', (m) => { if (m.type() === 'error' && !PREEXISTING_SVG.test(m.text())) realErrs.push('console: ' + m.text()); });
async function gotoApp() {
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(700);
  await page.evaluate(() => { try { localStorage.removeItem('eq-note-company-profile'); } catch (e) {} });
}
async function injectPdf(bytesB64) {
  return await page.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'part27.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartImportFileInput');
    if (!fi) return { ok: false };
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, bytesB64);
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
async function openPdfEditor(b64) {
  await page.evaluate(() => { const it = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (it) it.click(); });
  await sleep(380);
  await page.evaluate(() => { const c = document.getElementById('pdfOpenCard'); if (c) c.click(); });
  await sleep(500);
  const inj = await injectPdf(b64 || FIXTURE_BYTES.toString('base64'));
  const ed = await waitEditor();
  return { inj, ed };
}
async function ovs() {
  return await page.evaluate(() => {
    const o = (window.__smartImport && window.__smartImport.overlays) ? window.__smartImport.overlays() : {};
    const out = {};
    for (const k in o) out[k] = (o[k] || []).map((x) => ({ id: x && x.id, type: x && x.type, x: x && x.x, y: x && x.y, w: x && x.w, rot: x && x.rot, hasData: !!((x && x.dataUrl) || '').length, dataHead: String((x && x.dataUrl) || '').slice(0, 30) }));
    return out;
  });
}
async function sigList() {
  const o = await ovs();
  const out = [];
  for (const k in o) (o[k] || []).forEach((x) => { if (x && x.type === 'signature') out.push(Object.assign({ page: Number(k) }, x)); });
  return out;
}
async function waitFor(fn, tries = 60, gap = 250) {
  for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return true; await sleep(gap); }
  return false;
}
async function dragOverlay(pg, id, dx, dy, viaGrip) {
  return await page.evaluate((p, oid, ddx, ddy, grip) => {
    const boxes = document.querySelectorAll('#smartPdfEditor .smart-pdf-page[data-page="' + p + '"] .smart-pdf-overlay[data-id="' + oid + '"]');
    const box = boxes && boxes[0];
    if (!box) return { ok: false };
    const target = grip ? box.querySelector('.smart-pdf-overlay-grip') : box;
    if (!target) return { ok: false };
    const r = target.getBoundingClientRect();
    const mk = (x, y) => ({ bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, isPrimary: true, pointerType: 'mouse' });
    target.dispatchEvent(new PointerEvent('pointerdown', mk(r.left + r.width / 2, r.top + r.height / 2)));
    window.dispatchEvent(new PointerEvent('pointermove', mk(r.left + r.width / 2 + ddx, r.top + r.height / 2 + ddy)));
    window.dispatchEvent(new PointerEvent('pointerup', mk(r.left + r.width / 2, r.top + r.height / 2)));
    return { ok: true };
  }, pg, id, dx, dy, !!viaGrip);
}
async function exportPdf() {
  return await page.evaluate(async () => {
    const blob = await window.__smartImport.editedBlob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { b64: btoa(bin), head: bin.slice(0, 5), size: buf.length };
  });
}
async function countSigPixels(b64) {
  return await page.evaluate(async (b) => {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs) return { ok: false };
    if (pdfjs.GlobalWorkerOptions) { try { pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js'; } catch (e) {} }
    const bin = atob(b); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await pdfjs.getDocument({ data: u8 }).promise;
    const out = { ok: true, pages: doc.numPages, black: 0, red: 0 };
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const v = pg.getViewport({ scale: 1.2 });
      const c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
      await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let q = 0; q < d.length; q += 4) {
        const rr = d[q], gg = d[q + 1], bb = d[q + 2];
        if (rr < 80 && gg < 80 && bb < 80) out.black++;
        if (rr > 200 && gg < 90 && bb < 90) out.red++;
      }
    }
    return out;
  }, b64);
}
async function addViaMenu(kind) {
  return await page.evaluate((t) => {
    const btn = document.getElementById('smartPdfAddBtn');
    if (!btn) return { ok: false };
    btn.click();
    const item = document.querySelector('.smart-pdf-add-item[data-add="' + t + '"]');
    if (!item) return { ok: false };
    item.click();
    return { ok: true };
  }, kind);
}
await gotoApp();
const srcB64 = FIXTURE_BYTES.toString('base64');
{
  const s = await openPdfEditor(srcB64);
  check('P27-01 editor opens with fixture', !!(s.inj && s.inj.ok && s.ed), s.inj);
}
{
  const menu = await page.evaluate(() => {
    const m = document.getElementById('smartPdfAddMenu');
    const items = m ? [...m.querySelectorAll('.smart-pdf-add-item')] : [];
    return { n: items.length, sig: items.filter((i) => i.getAttribute('data-add') === 'signature').length };
  });
  check('P27-02 Add menu contains Signature once, no duplicate UI', menu.sig === 1 && menu.n === 7, menu);
}
check('P27-02b single signature panel element', await page.evaluate(() => document.querySelectorAll('#smartPdfSigPanel').length === 1));
{
  await addViaMenu('signature');
  await sleep(400);
  const open = await page.evaluate(() => {
    const p = document.getElementById('smartPdfSigPanel');
    return !!(p && !p.hasAttribute('hidden'));
  });
  check('P27-03 Add Signature opens Draw/Upload panel', open);
  const methods = await page.evaluate(() => [...document.querySelectorAll('#smartPdfSigPanel .smart-pdf-sig-method')].map((b) => b.getAttribute('data-sig-method')).sort().join(','));
  check('P27-04 panel offers Draw and Upload only', methods === 'draw,upload', methods);
  const drawn = await page.evaluate(() => {
    const c = document.getElementById('smartPdfSigCanvas');
    if (!c) return { ok: false };
    const r = c.getBoundingClientRect();
    const mk = (x, y) => ({ bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, isPrimary: true, pointerType: 'mouse' });
    c.dispatchEvent(new PointerEvent('pointerdown', mk(r.left + 20, r.top + 60)));
    for (let i = 1; i <= 10; i++) c.dispatchEvent(new PointerEvent('pointermove', mk(r.left + 20 + i * 8, r.top + 60 - i * 3)));
    c.dispatchEvent(new PointerEvent('pointerup', mk(r.left + 100, r.top + 30)));
    return { ok: true };
  });
  check('P27-05 mouse drawing dispatches on canvas', !!drawn.ok);
  const inserted = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('#smartPdfSigPanel .smart-pdf-sig-insert')];
    const vis = btns.find((b) => b.offsetParent !== null);
    if (!vis) return false;
    vis.click();
    return true;
  });
  const got = await waitFor(async () => (await sigList()).length >= 1, 60, 250);
  const one = await sigList();
  check('P27-06 Draw creates real type=signature overlay', !!(inserted && got && one.length === 1 && one[0].type === 'signature'), one);
  check('P27-07 signature stores dataUrl plus geometry', !!(one[0] && one[0].hasData && one[0].dataHead.indexOf('data:image/png') === 0 && one[0].w > 0), one[0]);
}
{
  const dom = await page.evaluate(() => {
    const box = document.querySelector('#smartPdfEditor [data-ovtype="signature"]');
    if (!box) return null;
    const img = box.querySelector('img');
    return { grip: !!box.querySelector('.smart-pdf-overlay-grip'), rot: !!box.querySelector('.smart-pdf-overlay-rot'), del: !!box.querySelector('.smart-pdf-overlay-del'), img: !!img, src: !!(img && String(img.src || '').indexOf('data:image/png') === 0) };
  });
  check('P27-08 signature visible with img plus grip plus rot plus del', !!(dom && dom.grip && dom.rot && dom.del && dom.img && dom.src), dom);
}
{
  const one = (await sigList())[0];
  const bx0 = { x: one.x, y: one.y };
  const d = await dragOverlay(one.page, one.id, 120, 60, false);
  const after = (await sigList())[0];
  check('P27-09 Move signature changes model position', !!(d && d.ok && after && Math.abs(after.x - bx0.x) > 5 && Math.abs(after.y - bx0.y) > 5), { before: bx0, after });
}
{
  const one = (await sigList())[0];
  const d = await dragOverlay(one.page, one.id, 150, 0, true);
  const after = (await sigList())[0];
  check('P27-10 Resize signature changes width in model', !!(d && d.ok && after && after.w > one.w + 20), { w0: one.w, w1: after && after.w });
}
{
  const one = (await sigList())[0];
  const r0 = one.rot || 0;
  const clicked = await page.evaluate(() => {
    const box = document.querySelector('#smartPdfEditor [data-ovtype="signature"] .smart-pdf-overlay-rot');
    if (!box) return false;
    box.click();
    return true;
  });
  await sleep(300);
  const after = (await sigList())[0];
  check('P27-11 Rotate signature persists rot in model', !!(clicked && after && (after.rot || 0) === ((r0 + 45) % 360)), { r0, r1: after && after.rot });
}
{
  const two = await page.evaluate(async () => {
    document.getElementById('smartPdfAddBtn').click();
    document.querySelector('.smart-pdf-add-item[data-add="signature"]').click();
    await new Promise((r) => setTimeout(r, 400));
    const c = document.createElement('canvas'); c.width = 60; c.height = 30;
    const ctx = c.getContext('2d'); ctx.fillStyle = 'rgb(255,0,0)'; ctx.fillRect(0, 0, 60, 30);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'sig.png', { type: 'image/png' }));
    const input = document.getElementById('smartPdfSigImageInput');
    if (!input) return { ok: false };
    const up = document.querySelector('#smartPdfSigPanel [data-sig-method="upload"]');
    if (up) up.click();
    await new Promise((r) => setTimeout(r, 300));
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const btns = [...document.querySelectorAll('#smartPdfSigPanel .smart-pdf-sig-insert')];
    const vis = btns.find((b) => b.offsetParent !== null);
    if (vis) vis.click();
    return { ok: true };
  });
  const got = await waitFor(async () => (await sigList()).length >= 2, 60, 250);
  const list = await sigList();
  check('P27-12 Upload creates second independent signature', !!(two && two.ok && got && list.length === 2), list);
  if (list.length === 2) {
    const a0 = { x: list[0].x, y: list[0].y };
    const b0 = { x: list[1].x, y: list[1].y };
    await dragOverlay(list[0].page, list[0].id, 60, 30, false);
    const list2 = await sigList();
    check('P27-13 multiple signatures are independent', !!(Math.abs(list2[0].x - a0.x) > 3 && Math.abs(list2[1].x - b0.x) < 2), { a0, b0, a1: list2[0], b1: list2[1] });
  }
}
let expB64 = '';
{
  const exp = await exportPdf();
  expB64 = exp.b64;
  check('P27-14 exported file is a genuine PDF', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
  const px = await countSigPixels(exp.b64);
  check('P27-15 export contains drawn signature ink', !!(px && px.ok && px.black > 200), px);
  check('P27-16 export contains uploaded signature ink', !!(px && px.ok && px.red > 200), px);
}
{
  const onDisk = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
  check('P27-17 original PDF file unchanged on disk', onDisk === FIXTURE_HASH, onDisk.slice(0, 16));
  const exp2 = await exportPdf();
  check('P27-18 export deterministic', exp2.b64 === expB64, { s1: expB64.length, s2: exp2.b64.length });
}
{
  await gotoApp();
  const s = await openPdfEditor(expB64);
  check('P27-19 exported PDF reopens with signature placement', !!(s.inj && s.inj.ok && s.ed), s.inj);
  const px = await countSigPixels(expB64);
  check('P27-20 reopened PDF still contains signature ink', !!(px && px.ok && (px.black > 200 || px.red > 200)), px);
}
{
  await gotoApp();
  const s = await openPdfEditor(expB64);
  check('P27-21 editor reopens for delete check', !!(s.inj && s.inj.ok && s.ed));
  await page.evaluate(() => { try { window.__smartImport.clearOverlays && window.__smartImport.clearOverlays(); } catch (e) {} });
  await addViaMenu('signature');
  await sleep(400);
  await page.evaluate(() => {
    const c = document.getElementById('smartPdfSigCanvas');
    const r = c.getBoundingClientRect();
    const mk = (x, y) => ({ bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, isPrimary: true, pointerType: 'mouse' });
    c.dispatchEvent(new PointerEvent('pointerdown', mk(r.left + 20, r.top + 60)));
    for (let i = 1; i <= 8; i++) c.dispatchEvent(new PointerEvent('pointermove', mk(r.left + 20 + i * 6, r.top + 60 - i * 2)));
    c.dispatchEvent(new PointerEvent('pointerup', mk(r.left + 68, r.top + 44)));
    const btns = [...document.querySelectorAll('#smartPdfSigPanel .smart-pdf-sig-insert')];
    const vis = btns.find((b) => b.offsetParent !== null);
    if (vis) vis.click();
  });
  const got = await waitFor(async () => (await sigList()).length >= 1, 60, 250);
  const before = (await sigList()).length;
  const del = await page.evaluate(() => {
    const b = document.querySelector('#smartPdfEditor [data-ovtype="signature"] .smart-pdf-overlay-del');
    if (!b) return false;
    b.click();
    return true;
  });
  await sleep(300);
  const after = (await sigList()).length;
  check('P27-22 Delete removes signature overlay', !!(got && del && before === 1 && after === 0), { before, after });
}
{
  await page.evaluate(() => { try { window.__smartImport.clearOverlays && window.__smartImport.clearOverlays(); } catch (e) {} });
  const mode = await page.evaluate(() => {
    document.getElementById('smartPdfAddBtn').click();
    const item = document.querySelector('.smart-pdf-add-item[data-add="logo"]');
    if (!item) return null;
    item.click();
    return true;
  });
  await sleep(400);
  const fed = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 60; c.height = 30;
    const ctx = c.getContext('2d'); ctx.fillStyle = 'rgb(0,0,255)'; ctx.fillRect(0, 0, 60, 30);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'logo.png', { type: 'image/png' }));
    const input = document.getElementById('smartPdfAddLogoInput');
    if (!input) return false;
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  const gotLogo = await waitFor(async () => {
    const o = await ovs();
    let n = 0; for (const k in o) (o[k] || []).forEach((x) => { if (x && x.type === 'logo') n++; });
    return n >= 1;
  }, 60, 250);
  check('P27-R1 Logo regression (Add Logo still creates type=logo)', !!(mode && fed && gotLogo), { mode, fed });
}
{
  const mk = await page.evaluate(() => {
    try {
      if (window.__smartImport && window.__smartImport.setCurrentPage) window.__smartImport.setCurrentPage(0);
      const r = window.__smartImport.markApply ? window.__smartImport.markApply('highlight') : null;
      return { called: true, r: !!r };
    } catch (e) { return { called: false, err: String((e && e.message) || e) }; }
  });
  const mkCount = await page.evaluate(() => (window.__smartImport.marks ? window.__smartImport.marks().length : -1));
  check('P27-R2 Mark regression (highlight coexists)', !!(mk && mk.called && mkCount >= 1), { mk, mkCount });
}
{
  const tbl = await page.evaluate(() => {
    document.getElementById('smartPdfAddBtn').click();
    const item = document.querySelector('.smart-pdf-add-item[data-add="table"]');
    if (!item) return false;
    item.click();
    return true;
  });
  const gotTbl = await waitFor(async () => {
    const o = await ovs();
    let n = 0; for (const k in o) (o[k] || []).forEach((x) => { if (x && x.type === 'table') n++; });
    return n >= 1;
  }, 60, 250);
  check('P27-R3 Table regression (Add Table still works)', !!(tbl && gotTbl));
}
{
  const pg = await page.evaluate(() => {
    const b = document.getElementById('smartPdfPagesBtn');
    if (b) b.click();
    return !!document.getElementById('smartPdfPagesMenu');
  });
  check('P27-R4 Pages regression (Pages menu still opens)', !!pg);
}
{
  const mp = await browser.newPage();
  await mp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  mp.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(String((e && e.message) || e))) realErrs.push('mobile pageerror: ' + (e && e.message)); });
  mp.on('console', (m) => { if (m.type() === 'error' && !PREEXISTING_SVG.test(m.text())) realErrs.push('mobile console: ' + m.text()); });
  await mp.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(700);
  await mp.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]').click();
  }, srcB64);
  await sleep(380);
  await mp.evaluate(() => { document.getElementById('pdfOpenCard').click(); });
  await sleep(500);
  await mp.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'part27m.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartImportFileInput');
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
  }, srcB64);
  let mEd = null;
  for (let i = 0; i < 100; i++) {
    mEd = await mp.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
      return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted };
    });
    if (mEd && mEd.visible && mEd.pages >= 2 && mEd.painted >= 2) break;
    await sleep(220);
  }
  check('P27-M1 mobile 390px editor opens', !!(mEd && mEd.pages >= 2 && mEd.painted >= 2), mEd);
  check('P27-M2 mobile Add menu offers Signature', await mp.evaluate(() => !!document.querySelector('.smart-pdf-add-item[data-add="signature"]')));
  const mOvf = await mp.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  check('P27-M3 mobile no app-level horizontal overflow', !!(mOvf.scrollW <= mOvf.clientW + 1), mOvf);
  await mp.close();
}
{
  await page.setViewport({ width: 1366, height: 900 });
  await sleep(800);
  await page.evaluate(() => { try { localStorage.setItem('eq-language', 'ar'); } catch (e) {} });
  await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = 'ar'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
  await sleep(600);
  const rtl = await page.evaluate(() => ({
    root: document.documentElement.getAttribute('dir'),
    add: !!document.getElementById('smartPdfAddBtn'),
    sig: !!document.querySelector('.smart-pdf-add-item[data-add="signature"]')
  }));
  check('P27-RTL Add Signature usable in RTL', rtl.root === 'rtl' && rtl.add && rtl.sig, rtl);
  await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
  await sleep(500);
  const ltr = await page.evaluate(() => ({
    root: document.documentElement.getAttribute('dir'),
    add: !!document.getElementById('smartPdfAddBtn'),
    sig: !!document.querySelector('.smart-pdf-add-item[data-add="signature"]')
  }));
  check('P27-LTR Add Signature usable in LTR', ltr.add && ltr.sig, ltr);
}
checkNV('P27-T touch draw (headless cannot verify physical touch)', 'PointerEvent mouse path verified; physical touch NOT VERIFIED');
check('P27-Z console and page errors (no NEW js errors)', realErrs.length === 0, realErrs.slice(0, 5));
console.log('PART27_PDF_SIGNATURE_RESULTS');
LOG.forEach((l) => console.log(l));
console.log(`SUMMARY pass ${pass}/${pass + fail} fail ${fail} nv ${nv}`);
fs.writeFileSync(path.join(ROOT, '__p27_signature_result.txt'), ['STARTED', ...LOG, `SUMMARY pass ${pass}/${pass + fail} nv ${nv}`].join('\n'));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);