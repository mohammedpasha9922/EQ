// PART 26 (new numbering) — PDF Logo (Add → Logo in the PDF Editor).
// Behavioral harness: real Chrome via puppeteer-core.
// Run:  node tests/part26_pdf_logo.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8442;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0|forEach is not a function/i;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
const FIXTURE_BYTES = fs.readFileSync(FIXTURE);
const FIXTURE_HASH = crypto.createHash('sha256').update(FIXTURE_BYTES).digest('hex');

let pass = 0, fail = 0;
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
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(String(e && e.message || e))) realErrs.push('pageerror: ' + (e && e.message)); });
page.on('console', (m) => { if (m.type() === 'error' && !PREEXISTING_SVG.test(m.text())) realErrs.push('console: ' + m.text()); });
// helpers A
async function gotoApp() {
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(700);
  await page.evaluate(() => { try { localStorage.removeItem('eq-note-company-profile'); } catch (e) {} });
}
async function injectPdf(bytesB64) {
  return await page.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'part26.pdf', { type: 'application/pdf' }));
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
// helpers B
async function ovs() {
  return await page.evaluate(() => {
    const o = (window.__smartImport && window.__smartImport.overlays) ? window.__smartImport.overlays() : {};
    const out = {};
    for (const k in o) out[k] = (o[k] || []).map((x) => ({ id: x && x.id, type: x && x.type, x: x && x.x, y: x && x.y, w: x && x.w, hasData: !!((x && x.dataUrl) || '').length, dataHead: String((x && x.dataUrl) || '').slice(0, 30) }));
    return out;
  });
}
async function waitFor(fn, tries = 60, gap = 250) {
  for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return true; await sleep(gap); }
  return false;
}
async function clickAddLogo() {
  const r = await page.evaluate(() => {
    const btn = document.getElementById('smartPdfAddBtn');
    if (!btn) return { ok: false };
    btn.click();
    const item = document.querySelector('.smart-pdf-add-item[data-add="logo"]');
    if (!item) return { ok: false, btn: true };
    item.click();
    return { ok: true };
  });
  if (!r.ok) return null;
  await sleep(400);
  const hasChoice = await page.evaluate(() => !!document.querySelector('.pdf-logo-choice'));
  return hasChoice ? 'choice' : 'direct';
}
async function feedLogoFile(r, g, b, w, h) {
  return await page.evaluate(async (rr, gg, bb, ww, hh) => {
    const c = document.createElement('canvas'); c.width = ww || 60; c.height = hh || 30;
    const ctx = c.getContext('2d'); ctx.fillStyle = 'rgb(' + rr + ',' + gg + ',' + bb + ')'; ctx.fillRect(0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'logo.png', { type: 'image/png' }));
    const input = document.getElementById('smartPdfAddLogoInput');
    if (!input) return false;
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, r, g, b, w, h);
}
async function logoList() {
  const o = await ovs();
  const out = [];
  for (const k in o) (o[k] || []).forEach((x) => { if (x && x.type === 'logo') out.push(Object.assign({ page: Number(k) }, x)); });
  return out;
}
// helpers C
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
async function countLogoPixels(b64) {
  return await page.evaluate(async (b) => {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs) return { ok: false };
    if (pdfjs.GlobalWorkerOptions) { try { pdfjs.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js'; } catch (e) {} }
    const bin = atob(b); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await pdfjs.getDocument({ data: u8 }).promise;
    const out = { ok: true, pages: doc.numPages, red: 0, blue: 0 };
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const v = pg.getViewport({ scale: 1.2 });
      const c = document.createElement('canvas'); c.width = Math.ceil(v.width); c.height = Math.ceil(v.height);
      await pg.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let q = 0; q < d.length; q += 4) {
        const rr = d[q], gg = d[q + 1], bb = d[q + 2];
        if (rr > 200 && gg < 90 && bb < 90) out.red++;
        if (rr < 90 && gg < 90 && bb > 200) out.blue++;
      }
    }
    return out;
  }, b64);
}
// SESSION A — upload / move / resize / placement / multi / export / reopen
await gotoApp();
const srcB64 = FIXTURE_BYTES.toString('base64');
{
  const s = await openPdfEditor(srcB64);
  check('P26-A0 editor opens with fixture (open/import seam intact)', !!(s.inj && s.inj.ok && s.ed), s.inj);
}
check('P26-A1 Add menu contains Logo', await page.evaluate(() => !!document.querySelector('.smart-pdf-add-item[data-add="logo"]')));
{
  const mode = await clickAddLogo();
  check('P26-A2 Add Logo with no saved profile opens picker directly', mode === 'direct', mode);
  const fed = await feedLogoFile(255, 0, 0, 60, 30);
  check('P26-A3 logo file fed to picker input', !!fed);
  const got = await waitFor(async () => (await logoList()).length >= 1, 60, 250);
  const one = await logoList();
  check('P26-A4 uploaded Logo is a REAL element (type=logo)', got && one.length === 1 && one[0].type === 'logo', one);
  check('P26-A5 logo model stores dataUrl plus geometry', !!(one[0] && one[0].hasData && one[0].dataHead.indexOf('data:image/png') === 0 && one[0].w > 0), one[0]);
}
{
  const dom = await page.evaluate(() => {
    const box = document.querySelector('#smartPdfEditor [data-ovtype="logo"]');
    if (!box) return null;
    const img = box.querySelector('img');
    return { grip: !!box.querySelector('.smart-pdf-overlay-grip'), img: !!img, src: !!(img && String(img.src || '').indexOf('data:image/png') === 0), ratio: img ? (img.clientHeight / Math.max(1, img.clientWidth)) : 0, nat: img ? (img.naturalHeight / Math.max(1, img.naturalWidth)) : 0 };
  });
  check('P26-A6 Logo visible in editor (box, img, grip)', !!(dom && dom.grip && dom.img && dom.src), dom);
  check('P26-A7 editor aspect ratio equals natural (no distortion)', !!(dom && Math.abs(dom.ratio - dom.nat) < 0.05), dom);
}
{
  const one = (await logoList())[0];
  const bx0 = { x: one.x, y: one.y };
  const d = await dragOverlay(one.page, one.id, 120, 60, false);
  const after = (await logoList())[0];
  check('P26-A8 Move Logo (drag changes model position)', !!(d && d.ok && after && Math.abs(after.x - bx0.x) > 5 && Math.abs(after.y - bx0.y) > 5), { before: bx0, after });
  check('P26-A9 logo stays inside page bounds (x,y >= 0)', !!(after && after.x >= 0 && after.y >= 0), after);
}
{
  const one = (await logoList())[0];
  const d = await dragOverlay(one.page, one.id, 150, 0, true);
  const after = (await logoList())[0];
  check('P26-A10 Resize Logo (grip changes width in model)', !!(d && d.ok && after && after.w > one.w + 20), { w0: one.w, w1: after && after.w });
  const dom = await page.evaluate(() => {
    const img = document.querySelector('#smartPdfEditor [data-ovtype="logo"] img');
    return img ? { ratio: img.clientHeight / Math.max(1, img.clientWidth), nat: img.naturalHeight / Math.max(1, img.naturalWidth) } : null;
  });
  check('P26-A11 aspect ratio preserved after resize', !!(dom && Math.abs(dom.ratio - dom.nat) < 0.05), dom);
}
// SESSION A continued — placement, multi logos, export, original safety, reopen
{
  const one = (await logoList())[0];
  const top = await dragOverlay(one.page, one.id, -2000, -2000, false);
  const cur = (await logoList())[0];
  check('P26-A12 Header/top placement (logo can sit at page top)', !!(top && top.ok && cur && cur.y < 30 && cur.x < 30 && cur.x >= 0 && cur.y >= 0), cur);
  const mid = await dragOverlay(one.page, one.id, 300, 400, false);
  const cur2 = (await logoList())[0];
  check('P26-A13 Anywhere placement (free move to middle)', !!(mid && mid.ok && cur2 && cur2.x > 50 && cur2.y > 50), cur2);
}
{
  const mode = await clickAddLogo();
  const fed = await feedLogoFile(0, 0, 255, 60, 30);
  const got = await waitFor(async () => (await logoList()).length >= 2, 60, 250);
  check('P26-A14 multiple logos (2 independent elements)', !!(mode && fed && got), { mode, fed });
  const two = await logoList();
  check('P26-A15 logos have distinct ids', !!(two.length === 2 && two[0].id !== two[1].id), two.map((t) => t.id));
  if (two.length === 2) {
    const a0 = { x: two[0].x, y: two[0].y };
    const b0 = { x: two[1].x, y: two[1].y };
    await dragOverlay(two[0].page, two[0].id, 90, 40, false);
    const two2 = await logoList();
    check('P26-A16 moving logo A does not move logo B', !!(Math.abs(two2[0].x - a0.x) > 5 && Math.abs(two2[1].x - b0.x) < 2 && Math.abs(two2[1].y - b0.y) < 2), { a0, b0, a1: two2[0], b1: two2[1] });
  }
}
let expB64 = '';
{
  const exp = await exportPdf();
  expB64 = exp.b64;
  check('P26-A17 exported file is a genuine PDF', exp.head === '%PDF-' && exp.size > 1000, { head: exp.head, size: exp.size });
  const px = await countLogoPixels(exp.b64);
  check('P26-A18 Saved file shows RED (uploaded) logo', !!(px && px.ok && px.red > 200), px);
  check('P26-A19 Saved file shows BLUE (2nd) logo', !!(px && px.ok && px.blue > 200), px);
  check('P26-A20 exported page count matches model', !!(px && px.pages === 2), px);
}
{
  const onDisk = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
  check('P26-A21 original PDF file unchanged on disk', onDisk === FIXTURE_HASH, onDisk.slice(0, 16));
  const exp2 = await exportPdf();
  check('P26-A22 export is deterministic (no source mutation)', exp2.b64 === expB64, { s1: expB64.length, s2: exp2.b64.length });
}
{
  await gotoApp();
  const s = await openPdfEditor(expB64);
  check('P26-A23 saved PDF reopens in editor', !!(s.inj && s.inj.ok && s.ed), s.inj);
  const px = await countLogoPixels(expB64);
  check('P26-A24 reopened PDF still contains the logos', !!(px && px.ok && px.red > 200 && px.blue > 200), px);
  const o = await ovs();
  const n = Object.keys(o).reduce((acc, k) => acc + (o[k] || []).length, 0);
  check('P26-A25 fresh session has no stale overlays', n === 0, o);
}
// SESSION B — Use Saved Logo
await gotoApp();
await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 80; c.height = 20;
  const ctx = c.getContext('2d'); ctx.fillStyle = 'rgb(0,0,255)'; ctx.fillRect(0, 0, 80, 20);
  const url = c.toDataURL('image/png');
  localStorage.setItem('eq-note-company-profile', JSON.stringify({ companyName: 'T', logo: url, signature: '', stamp: '' }));
  window.__p26saved = url;
});
{
  const s = await openPdfEditor(srcB64);
  check('P26-B0 fresh editor session (saved logo present)', !!(s.inj && s.inj.ok && s.ed), s.inj);
  const mode = await clickAddLogo();
  check('P26-B1 Add Logo shows Upload / Use Saved Logo choice', mode === 'choice', mode);
  const labels = await page.evaluate(() => [...document.querySelectorAll('.pdf-logo-choice [data-logo-choice]')].map((b) => b.getAttribute('data-logo-choice')).sort().join(','));
  check('P26-B2 choice offers upload plus saved plus cancel', labels === 'cancel,saved,upload', labels);
  const dir = await page.evaluate(() => { const m = document.querySelector('.pdf-logo-choice'); return m ? m.getAttribute('dir') : null; });
  check('P26-B3 choice popover follows LTR (en)', dir === 'ltr', dir);
  await page.evaluate(() => { const b = document.querySelector('.pdf-logo-choice [data-logo-choice="saved"]'); if (b) b.click(); });
  const got = await waitFor(async () => (await logoList()).length >= 1, 60, 250);
  const savedUrl = await page.evaluate(() => window.__p26saved || '');
  const inDom = await page.evaluate((u) => {
    const img = document.querySelector('#smartPdfEditor [data-ovtype="logo"] img');
    return !!(img && img.src === u);
  }, savedUrl);
  check('P26-B4 Use Saved Logo inserts profile logo (no re-upload)', !!(got && inDom), { got, inDom });
  const mv = await logoList();
  await dragOverlay(mv[0].page, mv[0].id, 70, 60, false);
  const mv2 = await logoList();
  check('P26-B5 saved logo is movable like an upload', !!(Math.abs(mv2[0].x - mv[0].x) > 5 && Math.abs(mv2[0].y - mv[0].y) > 5), { m0: mv[0], m1: mv2[0] });
  await dragOverlay(mv2[0].page, mv2[0].id, 80, 0, true);
  const mv3 = await logoList();
  check('P26-B6 saved logo resizes via grip', !!(mv3[0].w > mv2[0].w + 10), { w0: mv2[0].w, w1: mv3[0].w });
}
// SESSION B continued — page ops, mark regression, mobile, RTL, errors
{
  const before = (await logoList())[0];
  await page.evaluate(() => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (m && m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
  });
  await sleep(300);
  const dup = await page.evaluate(() => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (m && m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
    const chip = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="0"]');
    if (chip) chip.click();
    const b = document.querySelector('#smartPdfPagesMenu [data-pact="dup"]');
    if (!b) return false; b.click(); return true;
  });
  const dupOk = await waitFor(async () => {
    const mm = await page.evaluate(() => (window.__smartImport && window.__smartImport.pageModel) ? window.__smartImport.pageModel() : []);
    return mm && mm.length === 3;
  }, 60, 250);
  const afterDup = await logoList();
  const modelAfterDup = await page.evaluate(() => (window.__smartImport && window.__smartImport.pageModel) ? window.__smartImport.pageModel() : []);
  check('P26-B7 Page Duplicate copies the logo', !!(dup && dupOk && afterDup.length === 2), { dup, dupOk, modelAfterDup, afterDup });
  if (afterDup.length === 2) {
    // Independence via the STORE (no viewport/DOM dependence): mutate the
    // copy object directly and confirm the original is untouched. Reads back
    // through the same overlay seam the earlier checks use.
    const indep = await page.evaluate(() => {
      try {
        const ov = window.__smartImport.overlays();
        const ks = Object.keys(ov);
        const all = [];
        ks.forEach((k) => (ov[k] || []).forEach((o) => { if (o && o.type === 'logo') all.push({ k, o }); }));
        if (all.length !== 2) return { ok: false, n: all.length };
        const a = all[0].o, b = all[1].o;
        const ax0 = a.x, bx0 = b.x;
        b.x = bx0 + 55;
        return { ok: true, sameObj: a === b, axSame: a.x === ax0, bMoved: b.x === bx0 + 55, ids: [a.id, b.id], keys: [all[0].k, all[1].k] };
      } catch (e) { return { ok: false, err: String((e && e.message) || e) }; }
    });
    check('P26-B8 duplicate logo is independent of the original', !!(indep && indep.ok && !indep.sameObj && indep.axSame && indep.bMoved && indep.ids[0] !== indep.ids[1]), indep);
  }
  const moved = await page.evaluate(() => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (m && m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
    const c = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="0"]');
    const b = c && c.querySelector('[data-pmove="1"]');
    if (!b || b.disabled) return { moved: false, reason: 'no-btn' }; b.click(); return { moved: true };
  });
  const movedOk = await waitFor(async () => {
    const mm = await page.evaluate(() => (window.__smartImport && window.__smartImport.pageModel) ? window.__smartImport.pageModel() : []);
    return mm && mm.length === 3 && mm[0].src === 1;
  }, 60, 250);
  const afterMove2 = await logoList();
  check('P26-B9 Page Reorder keeps logos with their page', !!(moved && moved.moved && afterMove2.length >= 1), { moved, afterMove2 });
  const del = await page.evaluate(() => {
    const m = document.getElementById('smartPdfPagesMenu');
    if (m && m.hasAttribute('hidden')) document.getElementById('smartPdfPagesBtn').click();
    const target = document.querySelector('#smartPdfPagesList .smart-pdf-page-chip[data-pidx="0"]')
      || [...document.querySelectorAll('#smartPdfPagesList .smart-pdf-page-chip')].pop();
    if (target) target.click();
    const b = document.querySelector('#smartPdfPagesMenu [data-pact="del"]');
    if (!b) return false; b.click(); return true;
  });
  const delGone = await waitFor(async () => {
    const mm = await page.evaluate(() => (window.__smartImport && window.__smartImport.pageModel) ? window.__smartImport.pageModel() : []);
    return mm && mm.length === 2;
  }, 60, 250);
  const afterDel = await logoList();
  const modelAfterDel = await page.evaluate(() => (window.__smartImport && window.__smartImport.pageModel) ? window.__smartImport.pageModel() : []);
  check('P26-B10 Delete Page deletes its logo only', !!(del && delGone && afterDel.length === 1), { del, delGone, modelAfterDel, afterDel });
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
  check('P26-B11 MARK regression (highlight coexists with logo)', !!(mk && mk.called && mkCount >= 1), { mk, mkCount });
}
{
  // B12 — mobile-responsive: OPEN A FRESH PAGE at 390x844 (the blessed
  // pattern from part31: isMobile:true at creation, editor built for mobile).
  // Same checks as desktop B9/B6 above, but at mobile width: the Add menu
  // still offers Logo, model geometry is sane, and there is no NEW JS error
  // and no app-level horizontal overflow.
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
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'part26m.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartImportFileInput');
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
  }, srcB64);
  const mEd = await (async () => {
    for (let i = 0; i < 100; i++) {
      const s = await mp.evaluate(() => {
        const ed = document.getElementById('smartEditorView');
        const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
        const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
        return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted };
      });
      if (s.visible && s.pages >= 2 && s.painted >= 2) return s;
      await sleep(220);
    }
    return null;
  })();
  check('P26-B12a mobile 390px: editor opens (2 painted pages)', !!(mEd && mEd.pages >= 2 && mEd.painted >= 2), mEd);
  const mAdd = await mp.evaluate(() => !!document.querySelector('.smart-pdf-add-item[data-add="logo"]'));
  check('P26-B12b mobile: Add menu still offers Logo', !!mAdd);
  const mFed = await mp.evaluate(async () => {
    document.getElementById('smartPdfAddBtn').click();
    document.querySelector('.smart-pdf-add-item[data-add="logo"]').click();
    await new Promise((r) => setTimeout(r, 400));
    // The mobile page shares localStorage with the desktop session, so a
    // saved Company Profile logo may exist → choice popover instead of the
    // direct picker. Choose Upload in that case (also proves the choice
    // works at mobile width).
    const up = document.querySelector('.pdf-logo-choice [data-logo-choice="upload"]');
    if (up) up.click();
    await new Promise((r) => setTimeout(r, 300));
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
  let mLogo = null;
  for (let i = 0; i < 60; i++) {
    mLogo = await mp.evaluate(() => {
      const o = (window.__smartImport && window.__smartImport.overlays) ? window.__smartImport.overlays() : {};
      const out = [];
      for (const k in o) (o[k] || []).forEach((x) => { if (x && x.type === 'logo') out.push({ page: Number(k), w: x.w }); });
      return out;
    });
    if (mLogo && mLogo.length >= 1) break;
    await sleep(250);
  }
  check('P26-B12c mobile: uploaded Logo is a REAL element', !!(mFed && mLogo && mLogo.length === 1 && mLogo[0].w > 0), mLogo);
  const mOvf = await mp.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  check('P26-B12d mobile 390px: no app-level horizontal overflow', !!(mOvf.scrollW <= mOvf.clientW + 1), mOvf);
  await mp.close();
}
{
  await page.setViewport({ width: 1366, height: 900 });
  await sleep(800);
  const logosBack = await waitFor(async () => (await logoList()).length >= 1, 60, 250);
  await page.evaluate(() => { try { localStorage.setItem('eq-language', 'ar'); } catch (e) {} });
  await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = 'ar'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
  await sleep(600);
  const arLogo = await page.evaluate(() => {
    const o = (window.__smartImport && window.__smartImport.overlays) ? window.__smartImport.overlays() : {};
    let n = 0; for (const k in o) (o[k] || []).forEach((x) => { if (x && x.type === 'logo') n++; });
    let prof = '';
    try { prof = JSON.parse(localStorage.getItem('eq-note-company-profile') || '{}').logo || ''; } catch (e) { prof = ''; }
    return { n, prof: !!prof };
  });
  const mode = await clickAddLogo();
  const dir = await page.evaluate(() => { const m = document.querySelector('.pdf-logo-choice'); return m ? m.getAttribute('dir') : null; });
  const rdir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
  check('P26-B13 RTL: choice popover dir=rtl (ar)', mode === 'choice' && dir === 'rtl', { mode, dir, rootDir: rdir, logosBack, arLogo });
  await page.evaluate(() => { const c = document.querySelector('.pdf-logo-choice [data-logo-choice="cancel"]'); if (c) c.click(); });
  await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
  await sleep(500);
}
check('P26-Z console/page errors (no NEW js errors)', realErrs.length === 0, realErrs.slice(0, 5));

console.log('PART26_PDF_LOGO_RESULTS');
LOG.forEach((l) => console.log(l));
console.log(`SUMMARY pass ${pass}/${pass + fail} fail ${fail}`);
fs.writeFileSync(path.join(ROOT, '__p26_logo_result.txt'), ['STARTED', ...LOG, `SUMMARY pass ${pass}/${pass + fail}`].join('\n'));
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
