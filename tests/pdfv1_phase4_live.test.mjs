// PDF V1 — Phase 4: live behavioral verification of Native Share + Download fallback.
// Mocks navigator.share/canShare with controllable behavior and asserts:
//  A) capability available  -> share called ONCE with File(application/pdf), NO download
//  B) user cancellation (AbortError) -> NO download, NO error, button restored
//  C) canShare(files) = false -> Download fallback with the same -edited.pdf name
//  D) no Web Share API at all -> Download fallback
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

let fails = 0, checks = 0;
function check(name, ok, d = '') { checks++; if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (d ? '  -> ' + d : '')); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const PDFMod = await import('../__pdfdiag/vendor/pdf-lib.min.js');
const PDFLib = PDFMod.default && PDFMod.default.PDFDocument ? PDFMod.default : PDFMod;
const doc = await PDFLib.PDFDocument.create();
{ const pg = doc.addPage([612, 792]); pg.drawText('Phase4', { x: 50, y: 700, size: 24 }); }
const srcPath = path.join(root, 'tests', '_p4src.pdf');
fs.writeFileSync(srcPath, await doc.save());

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const errs = [];

async function openApp() {
  const p = await browser.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(url, { waitUntil: 'networkidle2' });
  await sleep(400);
  await p.evaluate(() => {
    window.__lastBlob = null; window.__lastDownload = ''; window.__shareCalls = 0; window.__shareArgs = null; window.__shareFile = null; window.__shareFileType = '';
    const oc = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (o) => { try { if (o instanceof Blob) window.__lastBlob = o; } catch (e) {} return oc(o); };
    const ocl = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { try { if (this.download) window.__lastDownload = this.download; } catch (e) {} return ocl.call(this); };
  });
  await p.click('button.feature-nav-btn[data-action="open-smart-docs"]');
  await sleep(400);
  await (await p.$('#pdfV1FileInput')).uploadFile(srcPath);
  await sleep(1500);
  return p;
}

// mockSet(mode: 'resolve' | 'abort' | null) — null removes the API entirely.
async function mockSet(p, mode) {
  await p.evaluate((m) => {
    try { Object.defineProperty(navigator, 'canShare', { configurable: true, value: m ? (d) => true : undefined }); } catch (e) {}
    try {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: m ? (d) => {
          window.__shareCalls++; window.__shareArgs = { keys: Object.keys(d || {}), title: (d || {}).title };
          if (m === 'abort') { const e = new Error('aborted'); e.name = 'AbortError'; return Promise.reject(e); }
          return Promise.resolve();
        } : undefined
      });
    } catch (e) {}
  }, mode);
}

async function exportAndSettle(p, ms = 20000) {
  await p.evaluate(() => { window.__lastBlob = null; window.__lastDownload = ''; window.__shareCalls = 0; window.__shareArgs = null; });
  await p.click('#pdfV1ExportBtn');
  const t0 = Date.now();
  for (;;) {
    await sleep(100);
    const st = await p.evaluate(() => ({ dl: window.__lastDownload, blob: !!window.__lastBlob, dis: document.getElementById('pdfV1ExportBtn').disabled, calls: window.__shareCalls, args: window.__shareArgs, err: document.getElementById('pdfV1Error').hidden ? '' : document.getElementById('pdfV1Error').textContent }));
    if (!st.dis && Date.now() - t0 > 400 || Date.now() - t0 > ms) return st;
  }
}

// A) share supported -> share once with a PDF file, no download, no error
{
  const p = await openApp();
  await mockSet(p, 'resolve');
  const st = await exportAndSettle(p);
  check('A: share called exactly once', st.calls === 1, 'calls=' + st.calls);
  check('A: shared with files key (not url/text)', !!(st.args && st.args.keys.indexOf('files') >= 0 && st.args.keys.indexOf('url') === -1 && st.args.keys.indexOf('text') === -1), JSON.stringify(st.args));
  check('A: no download when shared', st.dl === '', st.dl);
  check('A: no in-workspace error', st.err === '', st.err);
  await p.close();
}

// A2) the shared File object is a real application/pdf with %PDF bytes
{
  const p = await openApp();
  await p.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => { window.__shareFile = (d.files && d.files[0]) || null; window.__shareFileType = (d.files && d.files[0] && d.files[0].type) || ''; return Promise.resolve(); } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!(d && d.files && d.files[0] && d.files[0].type === 'application/pdf') });
  });
  const st = await exportAndSettle(p);
  const ft = await p.evaluate(() => window.__shareFileType);
  const magic = await p.evaluate(async () => { const f = window.__shareFile; if (!f) return ''; const u = new Uint8Array(await f.arrayBuffer()); return String.fromCharCode(u[0], u[1], u[2], u[3]); });
  check('A2: shared File type = application/pdf', ft === 'application/pdf', ft);
  check('A2: shared File bytes are a real PDF', magic === '%PDF', magic);
  check('A2: no download when shared', st.dl === '', st.dl);
  await p.close();
}

// B) user cancellation (AbortError) -> no download, no error, button restored
{
  const p = await openApp();
  await mockSet(p, 'abort');
  const st = await exportAndSettle(p);
  check('B: cancellation -> no automatic download', st.dl === '', st.dl);
  check('B: cancellation -> no in-workspace error', st.err === '', st.err);
  check('B: cancellation -> button restored (not stuck)', st.dis === false, 'dis=' + st.dis);
  await p.close();
}

// C) canShare(files) = false -> Download fallback, same naming
{
  const p = await openApp();
  await mockSet(p, null);
  const st = await exportAndSettle(p);
  check('C: unsupported file share -> download fallback', st.dl.indexOf('-edited.pdf') > 0, st.dl);
  check('C: share not called', st.calls === 0, 'calls=' + st.calls);
  check('C: fallback blob is real PDF', await p.evaluate(async () => { const u = new Uint8Array(await window.__lastBlob.arrayBuffer()); return String.fromCharCode(u[0], u[1], u[2], u[3]) === '%PDF'; }));
  await p.close();
}

// D) no Web Share API at all -> Download fallback
{
  const p = await openApp();
  await mockSet(p, null, false);
  const st = await exportAndSettle(p);
  check('D: no API -> download fallback', st.dl.indexOf('-edited.pdf') > 0, st.dl);
  await p.close();
}

check('no page JS errors overall', errs.length === 0, errs.join(' | '));
await browser.close();
console.log(fails === 0 ? 'LIVE PHASE4 ALL PASS (' + checks + ' checks)' : 'LIVE PHASE4 FAILURES: ' + fails + ' (' + checks + ' checks)');
process.exit(fails === 0 ? 0 : 1);

