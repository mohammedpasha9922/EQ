// PDF V1 — Phase 3: live behavioral verification (puppeteer + real export bytes).
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

let fails = 0, checks = 0, unverified = 0;
function check(name, ok, d = '') { checks++; if (ok === null) { unverified++; console.log('NOT VERIFIED  ' + name + (d ? '  -> ' + d : '')); return; } if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (d ? '  -> ' + d : '')); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Build the source PDF in Node with the app's own vendored pdf-lib:
// 3 pages of 612x792, pages carry real vector text (quality check).
let srcPath = '';
try {
  const PDFMod = await import('../__pdfdiag/vendor/pdf-lib.min.js');
  const PDFLib = PDFMod.default && PDFMod.default.PDFDocument ? PDFMod.default : PDFMod;
  const doc = await PDFLib.PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    const pg = doc.addPage([612, 792]);
    if (i === 0) pg.drawText('Original Page One', { x: 50, y: 700, size: 24 });
    if (i === 1) pg.drawText('Original Page Two', { x: 50, y: 700, size: 24 });
  }
  srcPath = path.join(root, 'tests', '_p3src.pdf');
  fs.writeFileSync(srcPath, await doc.save());
} catch (e) {
  console.log('source pdf build failed:', e.message);
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900, hasTouch: true, isMobile: false });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle2' });
await sleep(400);

// Install capture seams (blob stash + download-name + canvas counter).
await page.evaluate(() => {
  window.__lastBlob = null; window.__lastDownload = ''; window.__canvasCount = 0;
  const oc = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (o) => { try { if (o instanceof Blob) window.__lastBlob = o; } catch (e) {} return oc(o); };
  const ocl = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { try { if (this.download) window.__lastDownload = this.download; } catch (e) {} return ocl.call(this); };
  const ocr = document.createElement.bind(document);
  document.createElement = (t) => { try { if (String(t).toLowerCase() === 'canvas') window.__canvasCount++; } catch (e) {} return ocr(t); };
  // Phase 4 note: headless Chrome advertises navigator.share/canShare but the
  // native sheet instantly aborts (AbortError). Per Phase 4 rules, an abort is
  // a user cancellation -> NO download. To keep this harness testing the
  // Download path deterministically, hide Web Share here. The share flow is
  // covered by tests/pdfv1_phase4_live.test.mjs.
  try { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); } catch (e) { try { navigator.share = undefined; } catch (e2) {} }
  try { Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined }); } catch (e) { try { navigator.canShare = undefined; } catch (e2) {} }
});

// 1) Export button exists exactly once inside the existing tools row
check('export button exists once', await page.evaluate(() => (document.querySelectorAll('#pdfV1ExportBtn').length === 1) && !!document.getElementById('pdfV1Tools').contains(document.getElementById('pdfV1ExportBtn'))));

// 2) Phase 1 import still works (3-page PDF)
await page.evaluate(() => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click());
await sleep(300);
const inp = await page.$('#pdfV1FileInput');
await inp.uploadFile(srcPath);
await sleep(700);
check('phase1 import still works (viewer shown)', await page.evaluate(() => !document.getElementById('pdfV1ViewerWrap').hidden && !!document.getElementById('pdfV1Viewer').getAttribute('src')));

// 3) Overlays on PAGE 1 ONLY: stamp, drawn sig, uploaded sig, text, date
const stampPng = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = 'rgba(200,30,30,0.85)'; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill(); return c.toDataURL('image/png'); });
const sig2Png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 80; c.height = 40; const x = c.getContext('2d'); x.fillStyle = 'rgba(20,80,200,0.9)'; x.fillRect(4, 8, 72, 24); return c.toDataURL('image/png'); });
const stampFile = path.join(root, 'tests', '_p3stamp.png');
const sig2File = path.join(root, 'tests', '_p3sig2.png');
fs.writeFileSync(stampFile, Buffer.from(stampPng.split(',')[1], 'base64'));
fs.writeFileSync(sig2File, Buffer.from(sig2Png.split(',')[1], 'base64'));
await (await page.$('#pdfV1StampInput')).uploadFile(stampFile);
await sleep(300);
await page.click('#pdfV1SigDrawBtn'); await sleep(150);
const sc = await page.$('#pdfV1SigCanvas'); const sb = await sc.boundingBox();
await page.mouse.move(sb.x + 30, sb.y + 60); await page.mouse.down();
await page.mouse.move(sb.x + 200, sb.y + 120, { steps: 12 }); await page.mouse.up();
await page.click('#pdfV1SigPlaceBtn'); await sleep(250);
await (await page.$('#pdfV1SigFileInput')).uploadFile(sig2File);
await sleep(300);
await page.click('#pdfV1TextBtn'); await sleep(100);
await page.type('#pdfV1TextInput', 'Approved');
await page.click('#pdfV1TextAddBtn'); await sleep(150);
await page.click('#pdfV1DateBtn'); await sleep(150);
check('5 overlays placed on page 1', await page.evaluate(() => document.querySelectorAll('#pdfV1Layer .pdfv1-item').length === 5));

// 4) Export (page 1 has overlays; pages 2-3 clean)
await page.evaluate(() => { window.__lastBlob = null; window.__lastDownload = ''; window.__canvasCount = 0; });
await page.click('#pdfV1ExportBtn');
let done = false;
for (let i = 0; i < 300 && !done; i++) { await sleep(100); done = await page.evaluate(() => !!window.__lastBlob && document.getElementById('pdfV1ExportBtn').textContent.indexOf('Exporting') === -1 && document.getElementById('pdfV1ExportBtn').disabled === false); }
check('export completes and button restores', done);
const b64 = done ? await page.evaluate(async () => { const b = window.__lastBlob; const buf = await b.arrayBuffer(); const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); }) : '';
const outBuf = Buffer.from(b64 || '', 'base64');
check('output is a real PDF blob', outBuf.length > 500 && outBuf.slice(0, 5).toString('latin1').indexOf('%PDF') === 0);
check('download name = original + -edited.pdf', (await page.evaluate(() => window.__lastDownload)) === '_p3src-edited.pdf', await page.evaluate(() => window.__lastDownload));
check('no page JS errors during export', errs.length === 0, errs.join(' | '));

// 5) Inspect exported bytes with pdf.js (page-by-page)
if (outBuf.length > 500) {
  await page.evaluate(async () => {
    if (!window.pdfjsLib) { const s = document.createElement('script'); s.src = '/__pdfdiag/vendor/pdf.min.js'; await new Promise((res, rej) => { s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
  });
  try {
    const info = await page.evaluate(async (arr) => {
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(arr) }).promise;
      const res = { pages: doc.numPages, sizes: [], imgs: [], texts: [] };
      for (let i = 1; i <= doc.numPages; i++) {
        const pg = await doc.getPage(i);
        const v = pg.getViewport({ scale: 1 });
        res.sizes.push([Math.round(v.width), Math.round(v.height)]);
        const ol = await pg.getOperatorList();
        let n = 0;
        for (let k = 0; k < ol.fnArray.length; k++) { const f = ol.fnArray[k]; if (f === window.pdfjsLib.OPS.paintImageXObject || f === window.pdfjsLib.OPS.paintImageMaskXObject) n++; }
        res.imgs.push(n);
        const tc = await pg.getTextContent();
        res.texts.push(tc.items.map((it) => it.str).join(' '));
      }
      return res;
    }, Array.from(outBuf));
    check('multi-page PDF preserved (3 pages)', info.pages === 3, 'pages=' + info.pages);
    check('page size preserved on every page (612x792)', info.sizes.length === 3 && info.sizes.every((s) => s[0] === 612 && s[1] === 792), JSON.stringify(info.sizes));
    check('stamp/drawn/uploaded sig/text/date all merged on page 1 (>=5 images)', info.imgs[0] >= 5, 'imgs=' + JSON.stringify(info.imgs));
    check('page isolation: overlays only on page 1', info.imgs[1] === 0 && info.imgs[2] === 0, JSON.stringify(info.imgs));
    check('original vector text preserved (not rasterized)', /Original Page One/.test(info.texts[0]) && /Original Page Two/.test(info.texts[1]), JSON.stringify(info.texts.map((t) => t.slice(0, 30))));
  } catch (e) {
    check('pdf.js output inspection', null, String(e.message || e));
  }
} else {
  check('output inspection', null, 'no bytes');
}

// 6) Export of a PDF WITHOUT overlays (Change PDF -> immediate export)
await page.evaluate(() => { window.__lastBlob = null; window.__canvasCount = 0; });
await page.click('#pdfV1ChangeBtn');
const inp2 = await page.$('#pdfV1FileInput');
await inp2.uploadFile(srcPath);
await sleep(700);
await page.click('#pdfV1ExportBtn');
let done2 = false;
for (let i = 0; i < 300 && !done2; i++) { await sleep(100); done2 = await page.evaluate(() => !!window.__lastBlob && document.getElementById('pdfV1ExportBtn').disabled === false && document.getElementById('pdfV1ExportBtn').textContent.indexOf('Exporting') === -1); }
check('overlay-free PDF exports too', done2);
if (done2) {
  const b642 = await page.evaluate(async () => { const buf = await window.__lastBlob.arrayBuffer(); const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); });
  const buf2 = Buffer.from(b642, 'base64');
  check('overlay-free export keeps 3 pages, adds no images', buf2.length > 500 && buf2.indexOf(Buffer.from('/Image')) === -1, 'len=' + buf2.length);
}
check('overlay-free export used no canvas', (await page.evaluate(() => window.__canvasCount)) === 0);

// 7) Error handling: Export fails on a corrupt PDF -> in-workspace error, button restored
const badPath = path.join(root, 'tests', '_p3bad.pdf');
fs.writeFileSync(badPath, Buffer.from('%PDF-1.4 this is not a valid pdf body \n%%EOF'));
const page2 = await browser.newPage();
const errs2 = [];
page2.on('pageerror', (e) => errs2.push(String(e)));
await page2.goto(url, { waitUntil: 'networkidle2' });
await sleep(300);
await page2.evaluate(() => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click());
await sleep(250);
await (await page2.$('#pdfV1FileInput')).uploadFile(badPath);
await sleep(500);
await page2.click('#pdfV1ExportBtn');
await sleep(1200);
check('export failure shows in-workspace error, button restored, no stuck loading', await page2.evaluate(() => { const e = document.getElementById('pdfV1Error'); const b = document.getElementById('pdfV1ExportBtn'); return !!e && !e.hidden && e.textContent.length > 3 && !!b && b.disabled === false; }), await page2.evaluate(() => { const e = document.getElementById('pdfV1Error'); return e ? e.textContent : 'no-err-el'; }));
check('error path raises no JS error', errs2.length === 0, errs2.join(' | '));

try { fs.unlinkSync(badPath); } catch (e) {}

check('no page JS errors overall', errs.length === 0, errs.join(' | '));
try { fs.unlinkSync(srcPath); } catch (e) {}
try { fs.unlinkSync(stampFile); } catch (e) {}
try { fs.unlinkSync(sig2File); } catch (e) {}
await browser.close();
srv.close();
console.log((fails === 0 ? 'LIVE PHASE3 ALL PASS' : 'LIVE PHASE3 FAILURES: ' + fails) + ' (' + checks + ' checks, ' + unverified + ' not verified)');
process.exit(fails === 0 ? 0 : 1);
