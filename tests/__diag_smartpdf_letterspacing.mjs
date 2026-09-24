// TEMPORARY DIAGNOSTIC (not part of the test suite).
// Answers ONE question: where does the incorrect letter spacing of Smart PDF
// text come from — the pdf.js canvas render or the editable text layer?
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const require2 = createRequire(import.meta.url);
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8399;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.pdf': 'application/pdf', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.pfb': 'application/octet-stream', '.bcmap': 'application/octet-stream'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 300000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fontkitMod = null;
try { fontkitMod = require2('@pdf-lib/fontkit'); } catch (e) { fontkitMod = null; }
if (!fontkitMod) { console.error('FATAL: no @pdf-lib/fontkit'); process.exit(2); }

const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
async function buildFixture(out) {
  const doc = await pdfLib.PDFDocument.create();
  if (typeof doc.registerFontkit === 'function') doc.registerFontkit(fontkitMod);
  const regular = await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/arial.ttf'));
  const bold = await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/arialbd.ttf'));
  const p = doc.addPage([595.28, 841.89]);
  p.drawText('Quarterly Report', { x: 72, y: 770, size: 24, font: bold });
  p.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 730, size: 11, font: regular });
  p.drawText('Total invoice 1500 USD', { x: 72, y: 700, size: 12, font: regular });
  p.drawText('مرحبا بالعالم', { x: 72, y: 640, size: 16, font: regular });
  p.drawText('کوردیی ناوەندی', { x: 72, y: 610, size: 13, font: regular });
  p.drawText('Привет мир 123', { x: 72, y: 580, size: 12, font: regular });
  p.drawText('Report تقرير 2026', { x: 72, y: 550, size: 12, font: regular });
  p.drawText('Größe 42 Straße', { x: 72, y: 520, size: 12, font: regular });
  fs.writeFileSync(out, Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })));
}
const fixtureName = '__diag_ls.pdf';
const fixturePath = path.join(ROOT, fixtureName);
await buildFixture(fixturePath);
console.log('fixture bytes', fs.statSync(fixturePath).size);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });
const errs = [];
page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(700);

await page.evaluate(() => {
  window.__d = {
    spans: () => [...document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span')],
    // Canvas pixels of one span's box + an ink/gap profile of that band.
    // `which` picks the Smart PDF canvas or the independent reference canvas.
    band: (name, which) => {
      const s = window.__d.spans().find((x) => (x.textContent || '').includes(name));
      if (!s) return { err: 'no span ' + name };
      const wrap = s.closest('.smart-pdf-viewer-page');
      const c = wrap ? wrap.querySelector('canvas') : null;
      if (!c || !c.width) return { err: 'no canvas' };
      const kx = c.width / c.clientWidth, ky = c.height / c.clientHeight;
      const pad = s._smartPdfInk || { t: 1, l: 1, r: 1, b: 1 };
      const x = Math.max(0, Math.floor((s.offsetLeft - pad.l) * kx));
      const y = Math.max(0, Math.floor((s.offsetTop - pad.t) * ky));
      const w = Math.max(1, Math.ceil((s.offsetWidth + pad.l + pad.r) * kx));
      const h = Math.max(1, Math.ceil((s.offsetHeight + pad.t + pad.b) * ky));
      const src = which === 'ref' ? window.__refCanvas : c;
      if (!src) return { err: 'no ref canvas' };
      const W = Math.min(w, src.width - x), H = Math.min(h, src.height - y);
      if (W < 1 || H < 1) return { err: 'bad box', box: [x, y, w, h] };
      const d = src.getContext('2d').getImageData(x, y, W, H).data;
      const colInk = new Array(W).fill(0);
      for (let px = 0; px < W; px++) {
        for (let py = 0; py < H; py++) {
          const i = (py * W + px) * 4;
          if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 150) colInk[px]++;
        }
      }
      const runs = [];
      let inRun = false, start = 0, gapMax = 0, gapAt = -1, curGap = 0;
      for (let px = 0; px < W; px++) {
        if (colInk[px] > 0) {
          if (!inRun) { inRun = true; start = px; }
          if (curGap > gapMax) { gapMax = curGap; gapAt = px - curGap; }
          curGap = 0;
        } else {
          if (inRun) { runs.push([start, px - 1]); inRun = false; }
          curGap++;
        }
      }
      if (inRun) runs.push([start, W - 1]);
      return {
        w: W, h: H, inkCols: colInk.reduce((a, b) => a + (b > 0 ? 1 : 0), 0),
        runs: runs.length, first: runs.length ? runs[0][0] : -1,
        last: runs.length ? runs[runs.length - 1][1] : -1,
        gapMax, gapAt, colInk
      };
    },
    buildRef: async (url) => {
      const pdfjs = window.pdfjsLib;
      const buf = await (await fetch(url)).arrayBuffer();
      const doc = await pdfjs.getDocument({
        data: buf, cMapUrl: '/__pdfdiag/vendor/cmaps/', cMapPacked: true,
        standardFontDataUrl: '/__pdfdiag/vendor/standard_fonts/',
        useSystemFonts: false, disableFontFace: false
      }).promise;
      const pg = await doc.getPage(1);
      const base1 = pg.getViewport({ scale: 1 });
      const smCanvas = document.querySelector('#smartPdfViewerPages .smart-pdf-viewer-page canvas');
      const scale = smCanvas.width / base1.width;
      const vp = pg.getViewport({ scale: scale });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(vp.width));
      c.height = Math.max(1, Math.floor(vp.height));
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      window.__refCanvas = c;
      window.__refDoc = doc;
      return { scale, refW: c.width, refH: c.height, smartW: smCanvas.width, smartH: smCanvas.height };
    }
  };
});

await page.evaluate(() => {
  window.__d.pageDiff = () => {
    const a = document.querySelector('#smartPdfViewerPages .smart-pdf-viewer-page canvas');
    const b = window.__refCanvas;
    if (!a || !b) return { err: 'missing' };
    const W = Math.min(a.width, b.width), H = Math.min(a.height, b.height);
    const da = a.getContext('2d').getImageData(0, 0, W, H).data;
    const db = b.getContext('2d').getImageData(0, 0, W, H).data;
    let diff = 0, big = 0, sum = 0, maxd = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
      if (d > 2) diff++; if (d > 40) big++; sum += d; if (d > maxd) maxd = d;
    }
    return { W, H, px: W * H, diff, big, mean: +(sum / (W * H)).toFixed(4), maxd };
  };
  window.__d.layerInk = () => window.__d.spans().map((s) => {
    const cs = getComputedStyle(s);
    const lay = s.parentElement ? getComputedStyle(s.parentElement) : null;
    return {
      t: (s.textContent || '').slice(0, 22), color: cs.color, bg: cs.backgroundColor,
      op: cs.opacity, vis: cs.visibility, disp: cs.display, shadow: cs.textShadow,
      filter: cs.filter, blend: cs.mixBlendMode,
      layOp: lay ? lay.opacity : '', layDisp: lay ? lay.display : '', layVis: lay ? lay.visibility : '',
      tf: cs.transform, sp: cs.letterSpacing + '/' + cs.wordSpacing
    };
  });
  window.__d.hideLayers = (on) => {
    document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer')
      .forEach((l) => { l.style.display = on ? 'none' : ''; });
    return document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer').length;
  };
  window.__d.diffPng = (b64a, b64b) => new Promise((res) => {
    const load = (b64) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; });
    Promise.all([load(b64a), load(b64b)]).then(([ia, ib]) => {
      const c = document.createElement('canvas');
      c.width = ia.width; c.height = ia.height;
      const g = c.getContext('2d');
      g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
      let diff = 0, big = 0, maxd = 0, sum = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
        if (d > 2) diff++; if (d > 40) big++; sum += d; if (d > maxd) maxd = d;
      }
      res({ w: c.width, h: c.height, px: c.width * c.height, diff, big, maxd, mean: +(sum / (c.width * c.height)).toFixed(4) });
    });
  });
});

// ---- upload through the production path -----------------------------------
await page.evaluate(() => {
  const b = document.querySelector('.feature-nav-btn[data-action="open-smart-pdf"]');
  if (b) b.click();
});
await sleep(450);
const fileInput = await page.$('#smartPdfFileInput');
await fileInput.uploadFile(fixturePath);
let ready = false;
{
  const s0 = Date.now();
  while (Date.now() - s0 < 30000) {
    ready = await page.evaluate(() => {
      const v = document.getElementById('smartPdfViewerArea');
      return !!v && !v.hidden &&
        document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span').length >= 8;
    });
    if (ready) break;
    await sleep(200);
  }
}
await sleep(900);
console.log('uploaded+rendered:', ready);

// ---- (B) does the editable layer change the visible pixels? ----------------
const shotA = await page.screenshot({ encoding: 'base64' });
await page.evaluate(() => window.__d.hideLayers(true));
await sleep(250);
const shotB = await page.screenshot({ encoding: 'base64' });
console.log('VISUAL layer-vs-no-layer screenshot diff =',
  JSON.stringify(await page.evaluate((a, b) => window.__d.diffPng(a, b), shotA, shotB)));
await page.evaluate(() => window.__d.hideLayers(false));

// ---- (A) Smart PDF canvas vs independent pdf.js render --------------------
console.log('REF:', JSON.stringify(await page.evaluate((u) => window.__d.buildRef(u), '/' + fixtureName)));
console.log('CANVAS-vs-REFERENCE page diff =', JSON.stringify(await page.evaluate(() => window.__d.pageDiff())));

const NAMES = ['Quarterly Report', 'The quick brown fox', 'Total invoice', 'مرحبا بالعالم',
  'کوردیی', 'Привет мир', 'Report تقرير', 'Größe 42'];
for (const n of NAMES) {
  const smart = await page.evaluate((x) => window.__d.band(x, 'smart'), n);
  const refb = await page.evaluate((x) => window.__d.band(x, 'ref'), n);
  const pick = (o) => o && o.err ? o : o && {
    w: o.w, inkCols: o.inkCols, runs: o.runs, first: o.first, last: o.last, gapMax: o.gapMax, gapAt: o.gapAt
  };
  console.log('BAND ' + n + '\n  smart=' + JSON.stringify(pick(smart)) + '\n  ref=' + JSON.stringify(pick(refb)));
}

console.log('STYLE SAMPLE (first 6 spans):');
for (const s of await page.evaluate(() => window.__d.layerInk().slice(0, 6))) console.log('  ' + JSON.stringify(s));

const artDir = path.join(ROOT, 'tests', 'artifacts');
if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });
await page.screenshot({ path: path.join(artDir, '__diag_ls_viewer.png') });
const clip = await page.evaluate(() => {
  const w = document.querySelector('#smartPdfViewerPages .smart-pdf-viewer-page');
  const r = w.getBoundingClientRect();
  const sc = document.getElementById('smartPdfViewerScroll').getBoundingClientRect();
  const top = Math.max(r.top, sc.top);
  return {
    x: Math.max(0, r.left), y: Math.max(0, top),
    width: Math.min(r.width, sc.width), height: Math.min(560, sc.bottom - top)
  };
});
await page.screenshot({ path: path.join(artDir, '__diag_ls_words.png'), clip });
console.log('screenshots written to tests/artifacts');
console.log('JS ERRORS:', JSON.stringify(errs.slice(0, 8)));
const rect = await page.evaluate(() => {
  const w = document.querySelector('#smartPdfViewerPages .smart-pdf-viewer-page');
  const c = w.querySelector('canvas');
  return { cssW: c.clientWidth, cssH: c.clientHeight, w: c.width, h: c.height };
});
console.log('CANVAS geometry', JSON.stringify(rect));
await browser.close();
server.close();
process.exit(0);


