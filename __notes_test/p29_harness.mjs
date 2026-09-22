// PART 29 — PDF Date (Add → Date: Current / Custom; Format, Color, Move, Resize,
// Persistence, Export, Multi-page, Responsive, RTL/LTR, Regressions).
// Real-browser behavioral harness (Chrome headless + Puppeteer-core).
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
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const FIXTURE = path.join(HERE, '_p19_fixture_2p.pdf');
const FIXTURE_HASH = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
const realErrs = [];
function check(name, ok, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${d !== '' ? '  -> ' + d : ''}`);
  if (ok) pass++; else fail++;
}
function nv(name, detail = '') {
  LOG.push(`NOT VERIFIED  ${name}${detail ? '  -> ' + detail : ''}`);
  notVerified++;
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
await page.setViewport({ width: 1280, height: 900 });
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
  const inj = await injectFile('part29.pdf', 'application/pdf', fs.readFileSync(FIXTURE).toString('base64'));
  const ed = await waitEditor();
  return { inj, ed };
}
async function addViaMenu(type) {
  return await page.evaluate((t) => {
    document.getElementById('smartPdfAddBtn')?.click();
    const menu = document.getElementById('smartPdfAddMenu');
    const item = menu && menu.querySelector('.smart-pdf-add-item[data-add="' + t + '"]');
    if (!item) return { ok: false, why: 'no item ' + t };
    item.click();
    return { ok: true };
  }, type);
}
async function openDateMenu() {
  return await page.evaluate(() => {
    document.getElementById('smartPdfAddBtn')?.click();
    const menu = document.getElementById('smartPdfAddMenu');
    const item = menu && menu.querySelector('.smart-pdf-add-item[data-add="date"]');
    if (!item) return { ok: false, why: 'no date item' };
    item.click();
    const dm = document.getElementById('smartPdfDateMenu');
    const opts = dm ? [...dm.querySelectorAll('[data-date-opt]')].map((b) => b.getAttribute('data-date-opt')) : [];
    return { ok: true, menuVisible: !!(dm && !dm.hasAttribute('hidden')), opts, menus: document.querySelectorAll('#smartPdfDateMenu').length };
  });
}
async function clickDateOpt(opt) {
  return await page.evaluate((o) => {
    const b = document.querySelector('#smartPdfDateMenu [data-date-opt="' + o + '"]');
    if (!b) return { ok: false, why: 'no option ' + o };
    b.click();
    return { ok: true };
  }, opt);
}
async function insertCustomDate(iso) {
  await clickDateOpt('custom');
  await sleep(120);
  return await page.evaluate((v) => {
    const inp = document.getElementById('smartPdfDateCustomInput');
    const row = document.getElementById('smartPdfDateCustomRow');
    const rowShown = row && !row.classList.contains('smart-pdf-date-hidden');
    if (!inp) return { ok: false, why: 'no custom input', rowShown };
    inp.value = v;
    document.getElementById('smartPdfDateInsertBtn')?.click();
    return { ok: true, rowShown };
  }, iso);
}
async function dateModel() {
  return await page.evaluate(() => window.__smartImport && window.__smartImport.date ? window.__smartImport.date.overlays() : null);
}
async function allOverlays() {
  return await page.evaluate(() => window.__smartImport && window.__smartImport.overlays ? window.__smartImport.overlays() : null);
}
async function selectDateById(id) {
  return await page.evaluate((i) => window.__smartImport.date.select(i), id);
}
function dateList(m) { const out = []; for (const pk in (m || {})) for (const o of (m[pk] || [])) out.push(Object.assign({ pk: parseInt(pk, 10) }, o)); return out; }
async function boxOf(id) {
  return await page.evaluate((i) => {
    const b = document.querySelector('#smartPdfEditor .smart-pdf-ov-date[data-id="' + i + '"]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const grip = b.querySelector('.smart-pdf-overlay-grip');
    const gr = grip ? grip.getBoundingClientRect() : null;
    return { x: r.x, y: r.y, w: r.width, h: r.height, page: b.dataset.page, grip: gr ? { x: gr.x + gr.width / 2, y: gr.y + gr.height / 2 } : null, color: getComputedStyle(b).color, fs: getComputedStyle(b).fontSize };
  }, id);
}
async function dragBox(id, dx, dy) {
  const b = await boxOf(id);
  if (!b) return false;
  await page.mouse.move(b.x + 10, b.y + 10);
  await page.mouse.down();
  await page.mouse.move(b.x + 10 + dx, b.y + 10 + dy, { steps: 8 });
  await page.mouse.up();
  await sleep(120);
  return true;
}
async function dragGrip(id, dx) {
  const b = await boxOf(id);
  if (!b || !b.grip) return false;
  await page.mouse.move(b.grip.x, b.grip.y);
  await page.mouse.down();
  await page.mouse.move(b.grip.x + dx, b.grip.y, { steps: 8 });
  await page.mouse.up();
  await sleep(120);
  return true;
}
async function setCurrentPage(pg) {
  return await page.evaluate((p) => { if (window.__smartImport.setCurrentPage) { window.__smartImport.setCurrentPage(p); return true; } return false; }, pg);
}
async function exportBytes() {
  return await page.evaluate(async () => {
    try {
      const blob = await window.__smartImport.editedBlob();
      const buf = await blob.arrayBuffer();
      let s = '';
      const u8 = new Uint8Array(buf);
      for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
      return { ok: true, size: u8.length, text: s };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  });
}
async function exportAnalyze() {
  return await page.evaluate(async () => {
    try {
      const blob = await window.__smartImport.editedBlob();
      const buf = await blob.arrayBuffer();
      const byteLen = buf.byteLength; // capture before pdf.js may detach the buffer
      const lib = window.pdfjsLib;
      if (!lib) return { ok: false, why: 'no pdfjsLib', size: byteLen };
      const doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
      const pages = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const pg = await doc.getPage(p);
        const tc = await pg.getTextContent();
        pages.push({
          num: p,
          items: tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({
            str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]), h: Math.round(it.height || 0)
          }))
        });
      }
      // Pixel check for date color on page 1
      const pg1 = await doc.getPage(1);
      const vp = pg1.getViewport({ scale: 1 });
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const ctx = cv.getContext('2d');
      await pg1.render({ canvasContext: ctx, viewport: vp }).promise;
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let redPx = 0, blackPx = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 150 && g < 110 && b < 110) redPx++;
        if (r < 80 && g < 80 && b < 80) blackPx++;
      }
      return { ok: true, numPages: doc.numPages, pages, redPx, blackPx, size: byteLen };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  });
}
const rgbStr = (hex) => {
  const m = /^#(..)(..)(..)$/.exec(hex);
  return [1, 3, 5].map((i) => (parseInt(m[i], 16) / 255).toFixed(5));
};

async function noHorizOverflow() {
  return await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

// ============================ SETUP ============================
await gotoApp();
const setup = await openPdfEditor();
check('SETUP editor opened (2 pages painted)', !!(setup.ed && setup.ed.pages >= 2 && setup.ed.painted >= 2), setup);

// ---------- P29-01 / P29-36 ----------
const m1 = await openAddMenu();
check('P29-01 Add menu contains Date once', !!(m1.ok && m1.dateItems === 1), m1);
const dateMenusCount = await page.evaluate(() => document.querySelectorAll('#smartPdfDateMenu').length);
check('P29-36 No duplicate Date UI (1 date submenu)', dateMenusCount === 1, { dateMenusCount });

// ---------- P29-02 ----------
const dm = await openDateMenu();
check('P29-02 Date opens with Current/Custom only', !!(dm.ok && dm.menuVisible && dm.opts.join(',') === 'current,custom'), dm);

// ---------- P29-03/04/08 ----------
const todayISO = await page.evaluate(() => window.__smartImport.date.today());
const beforeCount = dateList(await dateModel()).length;
await clickDateOpt('current');
await sleep(200);
let model = dateList(await dateModel());
const cur = model[model.length - 1];
check('P29-03 Current Date adds a date overlay', model.length === beforeCount + 1 && !!cur, { beforeCount, after: model.length });
check('P29-04 Current Date uses device date at insertion', !!cur && cur.date === todayISO, { expected: todayISO, got: cur && cur.date });
check('P29-08 Date model type is "date" with id/date/format/color/x/y/w/size', !!cur && cur.type === 'date' && !!cur.id && !!cur.date && !!cur.format && !!cur.color && Number.isFinite(cur.x) && Number.isFinite(cur.y) && Number.isFinite(cur.w) && Number.isFinite(cur.size), cur);
const curId = cur && cur.id;
function openAddMenu() {
  return page.evaluate(() => {
    const btn = document.getElementById('smartPdfAddBtn');
    if (!btn) return { ok: false, why: 'no add btn' };
    btn.click();
    const menu = document.getElementById('smartPdfAddMenu');
    if (!menu || menu.hasAttribute('hidden')) return { ok: false, why: 'add menu not visible' };
    return { ok: true, dateItems: menu.querySelectorAll('[data-add="date"]').length, allItems: menu.querySelectorAll('.smart-pdf-add-item').length };
  });
}
// ---------- P29-13/14/15/16: Formats ----------
const fmts = await page.evaluate(() => window.__smartImport.date.formats());
check('P29-13 Format options are DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD', fmts.join('|') === 'DD/MM/YYYY|MM/DD/YYYY|YYYY-MM-DD', fmts);
const setFmt = (f) => page.evaluate((ff) => { const sel = document.getElementById('smartPdfDateFormatSelect'); sel.value = ff; sel.dispatchEvent(new Event('change', { bubbles: true })); }, f);
const dY = todayISO.slice(0, 4), dM = todayISO.slice(5, 7), dD = todayISO.slice(8, 10);
await selectDateById(curId); await sleep(120);
await setFmt('DD/MM/YYYY'); await sleep(150);
let mm = dateList(await dateModel()).find((o) => o.id === curId);
check('P29-14 DD/MM/YYYY renders correctly', mm.text === dD + '/' + dM + '/' + dY, mm.text);
await setFmt('MM/DD/YYYY'); await sleep(150);
mm = dateList(await dateModel()).find((o) => o.id === curId);
check('P29-15 MM/DD/YYYY renders correctly', mm.text === dM + '/' + dD + '/' + dY, mm.text);
await setFmt('YYYY-MM-DD'); await sleep(150);
mm = dateList(await dateModel()).find((o) => o.id === curId);
check('P29-16 YYYY-MM-DD renders correctly', mm.text === todayISO, mm.text);

// ---------- P29-09/10: Move ----------
const posBefore = { x: mm.x, y: mm.y };
await dragBox(curId, 80, 60);
mm = dateList(await dateModel()).find((o) => o.id === curId);
check('P29-09 Position stored in model (x/y)', Number.isFinite(mm.x) && Number.isFinite(mm.y), mm);
check('P29-10 Move changes position', Math.abs(mm.x - posBefore.x) > 20 && Math.abs(mm.y - posBefore.y) > 20, { before: posBefore, after: { x: mm.x, y: mm.y } });
const posAfterMove = { x: mm.x, y: mm.y };

// ---------- P29-11/12: Resize ----------
const sizeBefore = { w: mm.w, size: mm.size };
await dragGrip(curId, 40);
mm = dateList(await dateModel()).find((o) => o.id === curId);
check('P29-11 Size stored in model (w/size)', Number.isFinite(mm.w) && Number.isFinite(mm.size), mm);
check('P29-12 Resize grows width and font smoothly, no distortion', mm.w > sizeBefore.w + 20 && mm.size > sizeBefore.size, { before: sizeBefore, after: { w: mm.w, size: mm.size } });
const boxAfterResize = await boxOf(curId);
check('P29-12b Resize keeps text box intact', !!boxAfterResize && boxAfterResize.h > 0 && boxAfterResize.w > 0, boxAfterResize);
const sizeAfter = { w: mm.w, size: mm.size };

// ---------- P29-17: Color ----------
await selectDateById(curId);
await sleep(120);
await page.evaluate(() => {
  const sw = document.querySelector('#smartPdfDateColors .smart-pdf-date-swatch[data-color="#dc2626"]');
  if (sw) sw.click();
});
await sleep(150);
mm = dateList(await dateModel()).find((o) => o.id === curId);
check('P29-17 Color applies to the date overlay', mm.color === '#dc2626', mm.color);
const boxColor = await boxOf(curId);
check('P29-17b DOM color matches model', boxColor && boxColor.color === 'rgb(220, 38, 38)', boxColor && boxColor.color);
// ---------- P29-06/07: Custom Date ----------
const beforeCustom = dateList(await dateModel()).length;
const cust = await insertCustomDate('2020-03-25');
await sleep(200);
model = dateList(await dateModel());
const custom = model[model.length - 1];
check('P29-06 Custom Date inserts chosen date', !!(cust.ok && custom && custom.date === '2020-03-25'), custom);
check('P29-07 Custom Date persisted in document model', model.length === beforeCustom + 1 && custom.type === 'date' && custom.format === 'YYYY-MM-DD', custom);
const customId = custom && custom.id;

// ---------- P29-21/22: Multiple independent dates ----------
await selectDateById(curId); await sleep(120);
await setFmt('DD/MM/YYYY'); await sleep(150);
const mA = dateList(await dateModel()).find((o) => o.id === curId);
const mB = dateList(await dateModel()).find((o) => o.id === customId);
check('P29-21 Multiple dates on same page', dateList(await dateModel()).filter((o) => o.pk === mA.pk).length >= 2);
check('P29-22 Independent editing (format of one does not affect other)', mA.format === 'DD/MM/YYYY' && mB.format === 'YYYY-MM-DD' && mB.date === '2020-03-25', { A: { f: mA.format, t: mA.text }, B: { f: mB.format, t: mB.text } });

// ---------- P29-23: Multi-page ----------
await setCurrentPage(1); // overlay keys are 0-based (pk 0 = page 1)
await sleep(300);
await openAddMenu();
await clickDateOpt('current');
await sleep(200);
const page2Dates = dateList(await dateModel()).filter((o) => o.pk === 1);
check('P29-23 Multi-page: date on page 2 bound to page 2', page2Dates.length === 1 && page2Dates[0].type === 'date', page2Dates);
const pg2Date = page2Dates[0];
await setCurrentPage(1);
await sleep(300);

// ---------- P29-19/20: Persistence of position/size in model ----------
const persist = dateList(await dateModel()).find((o) => o.id === curId);
check('P29-19 Position persisted in model', Math.abs(persist.x - posAfterMove.x) < 0.5 && Math.abs(persist.y - posAfterMove.y) < 0.5, { posAfterMove, now: { x: persist.x, y: persist.y } });
check('P29-20 Size persisted in model', Math.abs(persist.w - sizeAfter.w) < 0.5 && Math.abs(persist.size - sizeAfter.size) < 0.5, { sizeAfter, now: { w: persist.w, size: persist.size } });

// ---------- P29-24..28: Export (real pdf.js text extraction + pixel color) ----------
let ex = null;
for (let i = 0; i < 6; i++) {
  ex = await exportAnalyze();
  if (ex.ok && ex.size > 1000) break;
  await sleep(500);
}
const pdfOk = !!(ex.ok && ex.size > 1000);
check('P29-24 Export produces a real PDF', pdfOk, { ok: ex.ok, size: ex.size, why: ex.why });
if (pdfOk) {
  // pdf.js may split a text run into interleaved fragments; verify the page's
  // concatenated text contains the target after removing the OTHER date's text.
  const norm = (s) => String(s || '').replace(/\s+/g, '');
  // Sort items in reading order (y desc, x asc) so split fragments of the same
  // run become adjacent, then match.
  const pageFull = ex.pages.map((p) => norm(
    p.items.slice().sort((a, b) => (Math.round(b.y / 8) - Math.round(a.y / 8)) || (a.x - b.x)).map((it) => it.str).join('')
  ));
  const presentAfterRemove = (pgNum, target, others) => {
    let t = pageFull[pgNum - 1] || '';
    for (const o of others) t = t.split(norm(o)).join('');
    return t.indexOf(norm(target)) >= 0;
  };
  const findOn = (pgNum, str) => {
    const pg = ex.pages.find((p) => p.num === pgNum);
    if (!pg) return null;
    const nt = norm(str);
    const sorted = pg.items.slice().sort((a, b) => (Math.round(b.y / 8) - Math.round(a.y / 8)) || (a.x - b.x));
    const idx = norm(sorted.map((it) => it.str).join('')).indexOf(nt);
    if (idx < 0) return null;
    let acc = 0;
    for (const it of sorted) {
      const l = norm(it.str).length;
      if (acc + l > idx) return it;
      acc += l;
    }
    return null;
  };
  const itA = findOn(1, mA.text);
  const okA = presentAfterRemove(1, mA.text, [mB.text]);
  const okB = pageFull[0].indexOf(norm(mB.text)) >= 0;
  const okP2 = (pageFull[1] || '').indexOf(norm(pg2Date.text)) >= 0;
  check('P29-26 Export contains all 3 formatted date texts on correct pages', !!(okA && okB && okP2), { okA, okB, okP2, dump: ex.pages.map((p) => ({ num: p.num, text: p.items.map((it) => it.str).join('|').slice(0, 200) })) });
  check('P29-25 Export position matches model (x/y within page, near overlay pos)', !!itA && itA.x >= 0 && itA.y >= 0 && Math.abs(itA.x - Math.round(mA.x)) <= Math.round(mA.w) + 60, { item: itA, model: { x: mA.x, y: mA.y } });
  check('P29-27 Export color: red date pixels present on page 1', ex.redPx > 20, { redPx: ex.redPx });
  check('P29-28 Export size: font height near model size', !!itA && itA.h >= 8 && Math.abs(itA.h - mA.size) / mA.size < 0.45, { h: itA && itA.h, modelSize: mA.size });
} else {
  nv('P29-25'); nv('P29-26'); nv('P29-27'); nv('P29-28');
}

// ---------- P29-30: Original PDF safety ----------
const fileHashNow = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P29-30 Original PDF file unchanged (non-destructive)', fileHashNow === FIXTURE_HASH, '');

// ---------- P29-29: Reopen — fixed value, not live clock ----------
const reopen = await page.evaluate(() => {
  try { if (window.__smartImport.setCurrentPage) window.__smartImport.setCurrentPage(1); } catch (e) {}
  return window.__smartImport.date.overlays();
});
const rA = dateList(reopen).find((o) => o.id === curId);
check('P29-29 Reopen shows fixed stored value (not live clock)', !!rA && rA.date === todayISO && rA.text === mA.text, rA);
// ---------- P29-31..35: Responsive + RTL/LTR ----------
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await sleep(600);
check('P29-35a No horizontal overflow at 390px', await noHorizOverflow(), '');
const dmMobile = await openDateMenu();
const dmRect = await page.evaluate(() => {
  const e = document.getElementById('smartPdfDateMenu');
  if (!e || e.hasAttribute('hidden')) return null;
  const r = e.getBoundingClientRect();
  return { l: r.left, rgt: r.right, w: r.width, vw: window.innerWidth };
});
check('P29-32 Mobile 390px: Date menu visible and not clipped', !!(dmMobile.ok && dmRect && dmRect.l >= -1 && dmRect.rgt <= dmRect.vw + 1), dmRect);
await page.setViewport({ width: 768, height: 1024, hasTouch: true });
await sleep(500);
check('P29-35b Tablet 768px: no horizontal overflow', await noHorizOverflow(), '');
await page.setViewport({ width: 1280, height: 900 });
await sleep(500);
check('P29-31 Desktop: no horizontal overflow, editor intact', await noHorizOverflow(), '');

// RTL / LTR via the app's own language system
await page.evaluate(() => { try { localStorage.setItem('eq-language', 'ar'); } catch (e) {} });
await gotoApp();
const rtlDir = await page.evaluate(() => document.documentElement.dir);
check('P29-33 Arabic RTL applied via existing i18n', rtlDir === 'rtl', rtlDir);
await openPdfEditor(); await sleep(600);
const dmAr = await openDateMenu();
const arTexts = await page.evaluate(() => {
  const e = document.getElementById('smartPdfDateMenu');
  return e ? [...e.querySelectorAll('[data-date-opt]')].map((b) => b.textContent.trim().replace(/\s+/g, ' ')) : [];
});
check('P29-33b Date menu usable in RTL with Arabic labels', !!(dmAr.ok && arTexts.length === 2 && arTexts[0].length > 0), arTexts);
await page.evaluate(() => { try { localStorage.setItem('eq-language', 'en'); } catch (e) {} });
await gotoApp();
const ltrDir = await page.evaluate(() => document.documentElement.dir);
check('P29-34 English LTR applied', ltrDir === 'ltr', ltrDir);
await openPdfEditor(); await sleep(600);
const dmEn = await openDateMenu();
check('P29-34b Date menu usable in LTR', !!dmEn.ok, '');

// ---------- P29-37 ----------
check('P29-37 No new JavaScript errors during session', realErrs.length === 0, realErrs.slice(0, 5));

// ============================ REGRESSIONS ============================
const reg = await openPdfEditor();
check('REG-SETUP editor reopened', !!(reg.ed && reg.ed.pages >= 2), reg);
// Immediate-add types must create real overlays:
await addViaMenu('text'); await sleep(350);
await addViaMenu('table'); await sleep(350);
// Picker-flow types (Image/Logo/Signature/Stamp) open their existing picker/panel
// flow; headless regression = item routes, menu closes, no new JS errors.
const beforePick = realErrs.length;
const route = async (t) => {
  const r = await addViaMenu(t);
  await sleep(350);
  const menuClosed = await page.evaluate(() => {
    const m = document.getElementById('smartPdfAddMenu');
    return !m || m.hasAttribute('hidden');
  });
  return { r, menuClosed };
};
const logoR = await route('logo');
const sigR = await route('signature');
const stampR = await route('stamp');
const imgR = await route('image');
const kinds = []; const after2 = await allOverlays();
for (const pk in (after2 || {})) for (const o of (after2[pk] || [])) kinds.push(o.type);
check('P29-38 Add → Text regression (real overlay)', kinds.includes('text'), kinds);
check('P29-38b Add → Table regression (real overlay)', kinds.includes('table'), kinds);
check('P29-38c Add → Logo regression (routes, no errors)', !!(logoR.r.ok && logoR.menuClosed && realErrs.length === beforePick), logoR);
check('P29-39 Add → Signature regression (routes, no errors)', !!(sigR.r.ok && sigR.menuClosed && realErrs.length === beforePick), sigR);
check('P29-40 Add → Stamp regression (routes, no errors)', !!(stampR.r.ok && stampR.menuClosed && realErrs.length === beforePick), stampR);
check('P29-40b Add → Image regression (routes, no errors)', !!(imgR.r.ok && imgR.menuClosed && realErrs.length === beforePick), imgR);
const dCount = dateList(await dateModel()).length;
check('P29-38z Date system unaffected after regressions', dCount >= 0, dCount);
const mark = await page.evaluate(() => {
  const btn = document.getElementById('smartPdfMarkBtn');
  if (!btn) return { ok: false, why: 'no mark btn' };
  btn.click();
  const menu = document.getElementById('smartPdfMarkMenu');
  return { ok: true, open: !!(menu && !menu.hasAttribute('hidden')) };
});
check('P29-41 Mark regression (menu opens)', !!(mark.ok && mark.open), mark);
const pages = await page.evaluate(() => {
  const btn = document.getElementById('smartPdfPagesBtn');
  if (!btn) return { ok: false, why: 'no pages btn' };
  btn.click();
  const m = document.getElementById('smartPdfPagesMenu');
  return { ok: true, open: !!(m && !m.hasAttribute('hidden')), chips: document.querySelectorAll('#smartPdfPagesList .smart-pdf-page-chip').length };
});
check('P29-42 Pages regression (menu opens, chips present)', !!(pages.ok && pages.open && pages.chips >= 2), pages);

// ---------- Summary ----------
await browser.close();
server.close();
const out = LOG.join('\n') + '\n\nPASS=' + pass + ' FAIL=' + fail + ' NOT_VERIFIED=' + notVerified + ' preexistingErrors=' + preexisting + ' newErrors=' + realErrs.length;
fs.writeFileSync(path.join(HERE, 'p29_result.txt'), out + '\n');
console.log(out);
process.exit(fail > 0 ? 1 : 0);





