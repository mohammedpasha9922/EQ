// Smart Documents — STAMP COLOR + OPACITY OPTIONS: live Chrome verification.
// Run: node tests/pdfv1_stamp_options_live.test.mjs
// Uses the same harness pattern as tests/pdfv1_phase2_live.test.mjs and the
// local Chrome build (like _smoke_final.mjs) — no new dependency.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8321;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + PORT + '/';
setTimeout(() => process.exit(124), 180000);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -> ' + detail : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- fixtures: minimal 1-page PDF + RGBA stamp PNG (transparent right half) ----
const pdfB64 = 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pj4+CmVuZG9iagp0cmFpbGVyCjw8L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTQ3CiUlRU9G';
const tmpPdf = path.join(HERE, '_stampopt_tmp.pdf');
fs.writeFileSync(tmpPdf, Buffer.from(pdfB64, 'base64'));

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const W = 300, H = 100;
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
const rawPng = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  const off = y * (1 + W * 4);
  for (let x = 0; x < W; x++) {
    const p = off + 1 + x * 4;
    rawPng[p] = (x * 255 / W) | 0; rawPng[p + 1] = (x * 255 / W) | 0; rawPng[p + 2] = (x * 255 / W) | 0;
    rawPng[p + 3] = (x < W / 2) ? 255 : 0; // right half fully transparent
  }
}
const stampPng = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rawPng)), chunk('IEND', Buffer.alloc(0))
]);
const tmpPng = path.join(HERE, '_stampopt_tmp.png');
fs.writeFileSync(tmpPng, stampPng);
// ---- browser ----
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, hasTouch: true, isMobile: false });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const badHttp = [];
page.on('response', (r) => { try { if (r.status() >= 400) badHttp.push(r.status() + ' ' + r.url()); } catch (e) {} });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(800);

// ---- helpers ----
const popState = () => page.evaluate(() => {
  const p = document.getElementById('pdfV1StampOptions');
  const r = p.getBoundingClientRect();
  return {
    exists: !!p, hidden: p.hidden, left: r.left, top: r.top, right: r.right, bottom: r.bottom,
    w: r.width, h: r.height,
    title: (document.getElementById('pdfV1StampOptTitle') || {}).textContent || '',
    reset: (document.getElementById('pdfV1StampReset') || {}).textContent || ''
  };
});
const itemBoxes = () => page.evaluate(() => {
  const L = document.getElementById('pdfV1Layer');
  const lr = L.getBoundingClientRect();
  return Array.from(document.querySelectorAll('#pdfV1Layer .pdfv1-item')).map((el) => {
    const r = el.getBoundingClientRect();
    const im = el.querySelector('img');
    return {
      pid: el.dataset.pid, selected: el.classList.contains('pdfv1-selected'),
      handles: el.querySelectorAll('.pdfv1-handle').length,
      x: (r.left - lr.left) / lr.width, y: (r.top - lr.top) / lr.height,
      w: r.width / lr.width, h: r.height / lr.height,
      cx: r.left + r.width / 2, cy: r.top + r.height / 2,
      hasImg: !!im, opacity: im ? (im.style.opacity || '') : ''
    };
  });
});
const imgProbe = () => page.evaluate(() => {
  const img = document.querySelector('#pdfV1Layer .pdfv1-item img');
  if (!img) return null;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  const L = ctx.getImageData(Math.floor(c.width * 0.25), Math.floor(c.height / 2), 1, 1).data;
  const Rp = ctx.getImageData(Math.floor(c.width * 0.75), Math.floor(c.height / 2), 1, 1).data;
  c.width = 0; c.height = 0;
  const pop = document.getElementById('pdfV1StampOptions');
  return {
    kind: String(img.src).slice(0, 24), srcFull: img.src, opaque: [L[0], L[1], L[2], L[3]], transparent: [Rp[0], Rp[1], Rp[2], Rp[3]],
    natW: img.naturalWidth, natH: img.naturalHeight, cssOpacity: img.style.opacity || '',
    val: (document.getElementById('pdfV1StampOpacityVal') || {}).textContent || '',
    slider: (document.getElementById('pdfV1StampOpacity') || {}).value || '',
    popHidden: pop ? pop.hidden : true
  };
});
const setSlider = (v) => page.evaluate((val) => {
  const s = document.getElementById('pdfV1StampOpacity');
  s.value = String(val);
  s.dispatchEvent(new Event('input', { bubbles: true }));
}, v);
async function dblClickAt(x, y) {
  await page.mouse.move(x, y);
  await page.mouse.down(); await page.mouse.up();
  await sleep(80);
  await page.mouse.down(); await page.mouse.up();
  await sleep(260);
}
async function dblTapAt(x, y) {
  await page.touchscreen.tap(x, y);
  await sleep(90);
  await page.touchscreen.tap(x, y);
  await sleep(260);
}
async function closePop() {
  await page.evaluate(() => { const b = document.getElementById('pdfV1StampOptClose'); if (b) b.click(); });
  await sleep(180);
}
const stampPx = () => page.evaluate(() => {
  const el = document.querySelector('#pdfV1Layer .pdfv1-item');
  const r = el.getBoundingClientRect();
  return { w: r.width, h: r.height, ratio: r.width / Math.max(1, r.height) };
});

/* ---- 1) Smart Documents opens ---- */
await page.evaluate(() => {
  const b = document.querySelector('#featureNavBar [data-action="open-smart-docs"]') || document.querySelector('[data-action="open-smart-docs"]');
  b.click();
});
await sleep(400);
check('1) Smart Documents opens (PDF workspace becomes visible)', await page.evaluate(() => {
  const w = document.getElementById('pdfReportsWorkspace');
  if (!w || !w.classList.contains('show')) return false;
  const r = w.getBoundingClientRect();
  return r.width > 100 && r.height > 100;
}));

/* ---- 2) upload a PDF ---- */
await (await page.$('#pdfV1FileInput')).uploadFile(tmpPdf);
await sleep(900);
const ph1 = await page.evaluate(() => ({
  viewer: !document.getElementById('pdfV1ViewerWrap').hidden,
  tools: !document.getElementById('pdfV1Tools').hidden,
  name: document.getElementById('pdfV1FileName').textContent
}));
check('2) PDF uploaded — viewer + overlay toolbar visible', ph1.viewer && ph1.tools, JSON.stringify(ph1));
check('2b) overlay layer is laid out (non-zero) after opening', await page.evaluate(() => {
  const L = document.getElementById('pdfV1Layer').getBoundingClientRect();
  return L.width > 50 && L.height > 50;
}));

/* ---- 3) add a stamp ---- */
await (await page.$('#pdfV1StampInput')).uploadFile(tmpPng);
await sleep(600);
let boxes = await itemBoxes();
check('3) Stamp added as one image overlay', boxes.length === 1 && boxes[0].hasImg, 'items=' + boxes.length);
const origSrcPrefix = await page.evaluate(() => String(document.querySelector('#pdfV1Layer .pdfv1-item img').src).slice(0, 24));
const origSrc = await page.evaluate(() => String(document.querySelector('#pdfV1Layer .pdfv1-item img').src));
check('3b) stamp renders the original upload (PNG)', origSrcPrefix.indexOf('data:image/png') === 0, origSrcPrefix);

/* ---- 4) single click selects (+4 handles) and never opens the popover ---- */
const c0 = { x: boxes[0].cx, y: boxes[0].cy };
await page.mouse.click(c0.x, c0.y);
await sleep(200);
boxes = await itemBoxes();
let pop = await popState();
check('4) single click selects the stamp + 4 resize handles', boxes[0].selected === true && boxes[0].handles === 4,
  JSON.stringify({ selected: boxes[0].selected, handles: boxes[0].handles }));
check('5) single click does NOT open Stamp Options', pop.hidden === true);

/* ---- 5) resize handle still works + aspect ratio kept ---- */
const beforeResize = await stampPx();
const hb = await (await page.$('#pdfV1Layer .pdfv1-item .pdfv1-handle[data-handle="se"]')).boundingBox();
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await page.mouse.down();
await page.mouse.move(hb.x + hb.width / 2 + 70, hb.y + hb.height / 2 + 40, { steps: 8 });
await page.mouse.up();
await sleep(200);
const afterResize = await stampPx();
check('6) resize handle still works (center-anchored resize intact)',
  afterResize.w > beforeResize.w + 2 || afterResize.h > beforeResize.h + 2,
  JSON.stringify({ beforeResize, afterResize }));
check('6b) stamp aspect ratio preserved after resize (300:100)',
  Math.abs(afterResize.ratio - 3) / 3 < 0.05, 'ratio=' + afterResize.ratio.toFixed(3));

/* ---- 6) double-click opens Stamp Options ---- */
await sleep(520); // let the previous tap window expire
const b6 = (await itemBoxes())[0];
await dblClickAt(b6.cx, b6.cy);
pop = await popState();
check('7) double-click opens Stamp Options', pop.hidden === false && pop.w > 100, JSON.stringify({ hidden: pop.hidden, w: pop.w }));

/* ---- 7) change color ---- */
await page.click('.pdfv1-stamp-swatch[data-color="#2563eb"]');
await sleep(500);
const probe1 = await imgProbe();
check('8) chosen color applied to the stamp image (blue #2563eb)',
  probe1.kind.indexOf('data:image/png') === 0 && probe1.opaque[0] === 0x25 && probe1.opaque[1] === 0x63 && probe1.opaque[2] === 0xeb,
  JSON.stringify(probe1.opaque));
check('8b) stamp shape/alpha preserved (transparent half stays transparent)', probe1.transparent[3] === 0,
  JSON.stringify(probe1.transparent));
check('8c) no dimension distortion (300x100 bitmap)', probe1.natW === 300 && probe1.natH === 100, probe1.natW + 'x' + probe1.natH);
check('8d) color picker synced with the swatch',
  (await page.evaluate(() => document.getElementById('pdfV1StampColorPicker').value)) === '#2563eb');
const b8 = (await itemBoxes())[0];
check('8e) color change did not move/resize the stamp',
  Math.abs(b8.x - b6.x) < 0.001 && Math.abs(b8.y - b6.y) < 0.001 && Math.abs(b8.w - b6.w) < 0.001,
  JSON.stringify({ b6: [b6.x, b6.y, b6.w], b8: [b8.x, b8.y, b8.w] }));

/* ---- 8) change opacity ---- */
await setSlider(35);
await sleep(250);
const probe2 = await imgProbe();
check('9) opacity applied to the stamp image only', probe2.cssOpacity === '0.35', 'opacity=' + probe2.cssOpacity);
check('9b) opacity readout shows 35%', probe2.val.trim() === '35%', probe2.val);
check('9c) the PDF page / stage opacity is untouched', await page.evaluate(() => {
  const fr = document.getElementById('pdfV1Viewer');
  const st = document.getElementById('pdfV1Stage');
  return (!fr.style.opacity || fr.style.opacity === '1') && (!st.style.opacity || st.style.opacity === '1');
}));
/* ---- 8f) move must still work while a color + opacity are applied ---- */
const m8 = (await itemBoxes())[0];
await page.mouse.move(m8.cx, m8.cy);
await page.mouse.down();
await page.mouse.move(m8.cx + 40, m8.cy - 30, { steps: 6 });
await page.mouse.up();
await sleep(220);
const m8b = (await itemBoxes())[0];
check('9d) stamp can still be moved while color + opacity are applied',
  Math.abs(m8b.x - m8.x) > 0.005 || Math.abs(m8b.y - m8.y) > 0.005,
  JSON.stringify({ from: [m8.x, m8.y], to: [m8b.x, m8b.y] }));

/* ---- 9) Reset ---- */
await page.click('#pdfV1StampReset');
await sleep(400);
const probe3 = await imgProbe();
check('10) Reset restores the original image look + 100% opacity',
  probe3.cssOpacity === '1' && probe3.srcFull === origSrc && probe3.slider === '100' && probe3.val.trim() === '100%',
  JSON.stringify({ opacity: probe3.cssOpacity, sameSrc: probe3.srcFull === origSrc, slider: probe3.slider }));

/* ---- 10) clicking outside closes the popover only ---- */
const b10 = (await itemBoxes())[0];
const bg = await page.evaluate(() => {
  const L = document.getElementById('pdfV1Layer').getBoundingClientRect();
  return { x: L.left + 14, y: L.top + 14 };
});
await page.mouse.click(bg.x, bg.y);
await sleep(250);
pop = await popState();
const b10b = (await itemBoxes())[0];
check('11) click outside closes the popover', pop.hidden === true);
check('11b) the stamp is not deleted and not moved by closing',
  !!b10b && Math.abs(b10b.x - b10.x) < 0.001 && Math.abs(b10b.y - b10.y) < 0.001,
  JSON.stringify({ before: [b10.x, b10.y], after: b10b ? [b10b.x, b10b.y] : null }));

/* ---- park the stamp in a clear area so the signature never covers it ---- */
const park = await page.evaluate(() => {
  const L = document.getElementById('pdfV1Layer').getBoundingClientRect();
  const r = document.querySelector('#pdfV1Layer .pdfv1-item').getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, tx: L.left + 30 + r.width / 2, ty: L.top + 30 + r.height / 2 };
});
await page.mouse.move(park.cx, park.cy);
await page.mouse.down();
await page.mouse.move(park.tx, park.ty, { steps: 10 });
await page.mouse.up();
await sleep(300);

/* ---- 11) signature over the stamp (independent) ---- */
await page.click('#pdfV1SigDrawBtn');
await sleep(250);
const sc = await page.$('#pdfV1SigCanvas');
const sb = await sc.boundingBox();
await page.mouse.move(sb.x + 30, sb.y + 60);
await page.mouse.down();
await page.mouse.move(sb.x + 200, sb.y + 120, { steps: 10 });
await page.mouse.up();
await page.click('#pdfV1SigPlaceBtn');
await sleep(350);
const both12 = await itemBoxes();
check('12) signature can still be placed as a second overlay over the stamp',
  both12.length === 2 && both12[1].hasImg, 'items=' + both12.length);
check('12b) signature is layered above the stamp and stays independent',
  await page.evaluate(() => {
    const ch = document.getElementById('pdfV1Layer').children;
    return ch.length === 2 && ch[0].dataset.pid !== ch[1].dataset.pid;
  }));
await sleep(560);
const sigC = both12[1];
await dblClickAt(sigC.cx, sigC.cy);
pop = await popState();
check('12c) double-click on a signature does NOT open Stamp Options', pop.hidden === true);

/* ---- 12d) stamp opacity affects the stamp ONLY ---- */
const st12 = (await itemBoxes())[0];
await sleep(520);
await dblClickAt(st12.cx, st12.cy);
await setSlider(40);
await sleep(250);
const both12b = await itemBoxes();
check('12d) stamp opacity applies to the stamp only (signature untouched)',
  both12b[0].opacity === '0.4' && both12b[1].opacity === '',
  JSON.stringify(both12b.map((b) => b.opacity)));
await page.evaluate(() => document.getElementById('pdfV1StampReset').click());
await sleep(250);
await closePop();
await sleep(200);
/* ---- 13) touch: single tap selects, double-tap opens ---- */
await sleep(650);
const t13 = (await itemBoxes())[0];
await page.touchscreen.tap(t13.cx, t13.cy);
await sleep(300);
pop = await popState();
const t13sel = (await itemBoxes())[0];
check('13) touch single tap selects the stamp and does NOT open options',
  pop.hidden === true && t13sel.selected === true, JSON.stringify({ hidden: pop.hidden, selected: t13sel.selected }));
await sleep(560);
const t13b = (await itemBoxes())[0];
await dblTapAt(t13b.cx, t13b.cy);
pop = await popState();
check('14) touch double-tap opens Stamp Options', pop.hidden === false);
check('14b) popover stays inside the viewport after opening',
  pop.left >= 0 && pop.top >= 0, JSON.stringify({ left: pop.left, top: pop.top }));

/* ---- 14) short long-press alternative (~650ms, never 3s) ---- */
await closePop();
await sleep(700); // let every tap/long-press window expire
const t14 = (await itemBoxes())[0];
const posBefore14 = { x: t14.x, y: t14.y };
await page.touchscreen.touchStart(t14.cx, t14.cy);
await sleep(285);
const mid14 = await popState();
check('15) long-press has NOT opened yet at 285ms (no 3s wait)', mid14.hidden === true);
await sleep(520);
const end14 = await popState();
check('16) long-press (~650ms) opens Stamp Options', end14.hidden === false);
await page.touchscreen.touchEnd();
await sleep(250);
const t14b = (await itemBoxes())[0];
check('16b) the long-press did not move or resize the stamp',
  Math.abs(t14b.x - posBefore14.x) < 0.001 && Math.abs(t14b.y - posBefore14.y) < 0.001,
  JSON.stringify({ before: [posBefore14.x, posBefore14.y], after: [t14b.x, t14b.y] }));

/* ---- 15) near the viewport edges: no overflow, popover flips ---- */
const vp = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
const geo = await page.evaluate(() => {
  const L = document.getElementById('pdfV1Layer').getBoundingClientRect();
  const r = document.querySelector('#pdfV1Layer .pdfv1-item').getBoundingClientRect();
  return { lx: L.left, ly: L.top, lw: L.width, lh: L.height, rl: r.left, rt: r.top, rw: r.width, rh: r.height,
    cx: r.left + r.width / 2, cy: r.top + r.height / 2, layerRight: L.right, layerBottom: L.bottom };
});
await closePop();
await sleep(650);
await page.mouse.move(geo.cx, geo.cy);
await page.mouse.down();
await page.mouse.move(geo.cx + (geo.layerRight - 2 - (geo.rl + geo.rw)), geo.cy + (geo.layerBottom - 2 - (geo.rt + geo.rh)), { steps: 12 });
await page.mouse.up();
await sleep(300);
const e15 = (await itemBoxes())[0];
await sleep(560);
await dblClickAt(e15.cx, e15.cy);
const popEdge = await popState();
check('17) near the right/bottom edge the popover stays fully inside the viewport',
  popEdge.hidden === false && popEdge.left >= 0 && popEdge.top >= 0 &&
  popEdge.right <= vp.w + 0.5 && popEdge.bottom <= vp.h + 0.5,
  JSON.stringify({ vp, pop: [popEdge.left, popEdge.top, popEdge.right, popEdge.bottom] }));
check('17b) popover flipped to the free side of the stamp (not overflowing right)',
  popEdge.right <= geo.layerRight + 3, 'popRight=' + popEdge.right.toFixed(1) + ' layerRight=' + geo.layerRight.toFixed(1));
check('17c) no horizontal page overflow', await page.evaluate(() =>
  document.scrollingElement.scrollWidth <= window.innerWidth + 1), 'scrollWidth vs innerWidth');
/* ---- 16) RTL ---- */
await page.evaluate(() => { document.documentElement.setAttribute('lang', 'ar'); document.documentElement.setAttribute('dir', 'rtl'); });
await closePop();
await sleep(650);
const r16 = (await itemBoxes())[0];
await dblClickAt(r16.cx, r16.cy);
const popRtl = await popState();
check('18) RTL: popover labels are Arabic and the panel stays in the viewport',
  popRtl.title.indexOf('خيارات') === 0 && popRtl.reset.indexOf('إعادة') === 0 &&
  popRtl.left >= 0 && popRtl.right <= vp.w + 0.5,
  JSON.stringify({ title: popRtl.title, reset: popRtl.reset, left: popRtl.left }));

/* ---- 17) LTR ---- */
await page.evaluate(() => { document.documentElement.setAttribute('lang', 'en'); document.documentElement.setAttribute('dir', 'ltr'); });
await closePop();
await sleep(650);
const l17 = (await itemBoxes())[0];
await dblClickAt(l17.cx, l17.cy);
const popLtr = await popState();
check('18b) LTR: popover labels switch to English',
  popLtr.title === 'Stamp options' && popLtr.reset === 'Reset',
  JSON.stringify({ title: popLtr.title, reset: popLtr.reset }));

/* ---- 18) colors keep the stamp inside the page boundaries ---- */
await page.click('.pdfv1-stamp-swatch[data-color="#16a34a"]');
await sleep(450);
await page.evaluate(() => { document.documentElement.setAttribute('lang', 'ar'); document.documentElement.setAttribute('dir', 'rtl'); });
const g18 = (await itemBoxes())[0];
check('18c) green applied and the stamp stays inside the page area',
  g18.x > -0.95 && g18.y > -0.95 && g18.x < 1 && g18.y < 1,
  JSON.stringify({ x: g18.x, y: g18.y }));
await closePop();

/* ---- 19) console / runtime errors ---- */
check('19) no JS runtime errors during the whole run', errs.filter((e) => e.indexOf('pageerror:') === 0).length === 0, errs.slice(0, 4).join(' | '));
console.log('INFO  non-2xx responses seen: ' + (badHttp.length ? badHttp.slice(0, 6).join(' ; ') : 'none'));

await browser.close();
server.close();
try { fs.unlinkSync(tmpPdf); } catch (e) {}
try { fs.unlinkSync(tmpPng); } catch (e) {}

const failed = results.filter((r) => !r.ok);
console.log('\nSUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' passed');
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log('  - ' + f.name));
  process.exit(1);
}
process.exit(0);





