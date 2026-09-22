// PDF V1 — Phase 2: live behavioral verification (puppeteer).
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e, buf) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => srv.listen(0, r));
const url = 'http://127.0.0.1:' + srv.address().port + '/';

// Minimal 1-page PDF (inline base64).
const pdfB64 = 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA2MTIgNzkyXS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pj4+CmVuZG9iagp0cmFpbGVyCjw8L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTQ3CiUlRU9G';
const pdfBuf = Buffer.from(pdfB64, 'base64');

let fails = 0, checks = 0;
function check(name, ok, d = '') { checks++; if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (d ? '  -> ' + d : '')); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function boxOf(pageRef, idx) {
  return pageRef.evaluate((i) => {
    const el = document.querySelectorAll('#pdfV1Layer .pdfv1-item')[i];
    const L = document.getElementById('pdfV1Layer').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: (r.left - L.left) / L.width, y: (r.top - L.top) / L.height, w: r.width / L.width, h: r.height / L.height };
  }, idx);
}
async function boxOfSafe(pageRef, idx) {
  try { return await boxOf(pageRef, idx); } catch (e) { return null; }
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, hasTouch: true, isMobile: false });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle2' });
await sleep(400);

// 1) Open PDF workspace via feature nav button
await page.evaluate(() => {
  document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click();
});
await sleep(300);
check('workspace opens from nav button', await page.evaluate(() => document.getElementById('pdfReportsWorkspace').classList.contains('show')));

// 2) Phase 1 import still works (write a temp PDF file for uploadFile)
// Multi-page (3) PDF generated with the app's own vendor pdf-lib build.
const PDFMod = await import('../__pdfdiag/vendor/pdf-lib.min.js').catch((e) => { console.log('PDFLIB import failed, fallback single page:', e.message); return null; });
const PDFLib = PDFMod ? (PDFMod.default && PDFMod.default.PDFDocument ? PDFMod.default : (PDFMod.module && PDFMod.module.exports ? PDFMod.module.exports : null)) : null;
console.log('pdf-lib usable:', !!(PDFLib && PDFLib.PDFDocument));
let tmpPdf;
if (PDFLib && PDFLib.PDFDocument) {
  const doc = await PDFLib.PDFDocument.create();
  for (let i = 0; i < 3; i++) doc.addPage([612, 792]);
  tmpPdf = path.join(root, 'tests', '_p2tmp_min.pdf');
  fs.writeFileSync(tmpPdf, await doc.save());
} else {
  tmpPdf = path.join(root, 'tests', '_p2tmp_min.pdf');
  fs.writeFileSync(tmpPdf, pdfBuf);
}
const input = await page.$('#pdfV1FileInput');
await input.uploadFile(tmpPdf);
await sleep(600);
const ph1 = await page.evaluate(() => ({
  viewer: !document.getElementById('pdfV1ViewerWrap').hidden,
  name: document.getElementById('pdfV1FileName').textContent,
  tools: !document.getElementById('pdfV1Tools').hidden
}));
check('Phase1: viewer visible after import', ph1.viewer && ph1.name === '_p2tmp_min.pdf');
check('Phase2 tools bar appears', ph1.tools);
// 3) Company stamp PNG — generated valid 300x100 RGBA PNG via zlib
let png = null;
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
import('node:zlib').then((zlib) => {
  const W = 300, H = 100;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    const off = y * (1 + W * 4);
    raw[off] = 0;
    for (let x = 0; x < W; x++) { const p = off + 1 + x * 4; raw[p] = (x * 255 / W) | 0; raw[p + 3] = 255; }
  }
  png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
});
// wait a tick for the async build
await new Promise((r) => setTimeout(r, 50));
const stampInput = await page.$('#pdfV1StampInput');
const tmpPng = path.join(root, 'tests', '_p2tmp_stamp.png');
fs.writeFileSync(tmpPng, png);
await stampInput.uploadFile(tmpPng);
await sleep(400);
check('stamp PNG added as item', (await page.evaluate(() => document.querySelectorAll('#pdfV1Layer .pdfv1-item').length)) === 1);

// 4) Mouse drag
const before = await boxOf(page, 0);
let el = await page.$('#pdfV1Layer .pdfv1-item');
let bb = await el.boundingBox();
await page.mouse.move(bb.x + 10, bb.y + 10);
await page.mouse.down();
await page.mouse.move(bb.x + 90, bb.y + 70, { steps: 8 });
await page.mouse.up();
const after = await boxOf(page, 0);
check('mouse drag moves item', Math.abs(after.x - before.x) > 0.02 || Math.abs(after.y - before.y) > 0.02, JSON.stringify({ before, after }));

// 5) Resize via handle + aspect ratio
const ratioBefore = after.w / after.h;
const hd = await page.$('#pdfV1Layer .pdfv1-item .pdfv1-handle');
const hb = await hd.boundingBox();
await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
await page.mouse.down();
await page.mouse.move(hb.x + hb.width / 2 + 60, hb.y + hb.height / 2 + 30, { steps: 8 });
await page.mouse.up();
const resized = await boxOf(page, 0);
const ratioAfter = resized.w / resized.h;
check('resize changes size', resized.w > after.w + 0.01 || resized.h > after.h + 0.01);
check('aspect ratio preserved (+-5%)', Math.abs(ratioAfter - ratioBefore) / ratioBefore < 0.05, ratioAfter + ' vs ' + ratioBefore);
check('selection shown', await page.evaluate(() => !!document.querySelector('#pdfV1Layer .pdfv1-item.pdfv1-selected')));
// 5b) Touch drag (touchscreen) while item is fully on-viewport
const tc0 = await boxOf(page, 0);
el = await page.$('#pdfV1Layer .pdfv1-item');
bb = await el.boundingBox();
await page.touchscreen.touchStart(bb.x + 10, bb.y + 10);
await page.touchscreen.touchMove(bb.x + 60, bb.y + 50);
await page.touchscreen.touchEnd();
await sleep(120);
const tc1 = await boxOf(page, 0);
check('touch drag moves item', Math.abs(tc1.x - tc0.x) > 0.01 || Math.abs(tc1.y - tc0.y) > 0.01, JSON.stringify({ tc0, tc1 }));

// 6) Clamp: item never fully outside
el = await page.$('#pdfV1Layer .pdfv1-item');
bb = await el.boundingBox();
await page.mouse.move(bb.x + 10, bb.y + 10);
await page.mouse.down();
await page.mouse.move(bb.x - 4000, bb.y - 4000, { steps: 10 });
await page.mouse.up();
const clamped = await boxOf(page, 0);
check('item never fully outside page', clamped.x > -0.95 && clamped.y > -0.95 && clamped.x < 1 && clamped.y < 1, JSON.stringify(clamped));

// 7) Per-page isolation
await page.evaluate(() => document.getElementById('pdfV1NextPg').click());
await sleep(200);
const emptyP2 = await page.evaluate(() => document.querySelectorAll('#pdfV1Layer .pdfv1-item').length);
await page.evaluate(() => document.getElementById('pdfV1PrevPg').click());
await sleep(200);
const backCount = await page.evaluate(() => document.querySelectorAll('#pdfV1Layer .pdfv1-item').length);
check('page isolation: p2 empty, p1 keeps item', emptyP2 === 0 && backCount === 1, emptyP2 + '/' + backCount);

// 8) Text + date overlays
await page.click('#pdfV1TextBtn');
await sleep(100);
await page.type('#pdfV1TextInput', 'Approved');
await page.click('#pdfV1TextAddBtn');
await sleep(150);
check('text overlay created', await page.evaluate(() => {
  const n = document.querySelector('#pdfV1Layer .pdfv1-item-text');
  return !!n && n.textContent === 'Approved';
}));
await page.click('#pdfV1DateBtn');
await sleep(150);
check('date overlay created', await page.evaluate(() => {
  const t = Array.from(document.querySelectorAll('#pdfV1Layer .pdfv1-item-text')).map((n) => n.textContent);
  return t.length === 2 && t[1].length >= 6;
}));
// 9) Signature draw (mouse) + place
await page.click('#pdfV1SigDrawBtn');
await sleep(150);
const sc = await page.$('#pdfV1SigCanvas');
const sb = await sc.boundingBox();
await page.mouse.move(sb.x + 30, sb.y + 60);
await page.mouse.down();
await page.mouse.move(sb.x + 200, sb.y + 120, { steps: 12 });
await page.mouse.up();
await page.click('#pdfV1SigPlaceBtn');
await sleep(200);
check('drawn signature placed as item', await page.evaluate(() => document.querySelectorAll('#pdfV1Layer .pdfv1-item img').length === 2));

// 10) (touch drag already verified in 5b on the hasTouch viewport; pointer
// events are unified so mouse/touch/pen share one code path)

check('NO page JS errors', errs.length === 0, errs.join(' | '));
console.log(fails === 0 ? 'LIVE PHASE2 ALL PASS (' + checks + ' checks)' : 'LIVE PHASE2 FAILURES: ' + fails);
try { fs.unlinkSync(tmpPdf); } catch (e) {}
try { fs.unlinkSync(tmpPng); } catch (e) {}
await browser.close();
srv.close();
process.exit(fails === 0 ? 0 : 1);



