// TEMP DIAGNOSTIC 2: standard (NON-embedded) font PDF in Smart PDF.
// Reproduces the repo's own Smart-PDF fixture style (pdf-lib StandardFonts.*)
// and measures whether the Smart PDF canvas renders it with the PDF's own
// metrics (natural letter spacing) or with a substituted/wrong font.
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
const PORT = 8401;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf',
  '.ttf': 'font/ttf', '.pfb': 'application/octet-stream', '.bcmap': 'application/octet-stream' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  try {
    const d = fs.readFileSync(path.join(ROOT, u));
    res.writeHead(200, { 'Content-Type': mimeOf(u) + '; charset=utf-8' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 300000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
const fixtureName = '__diag_std.pdf';
const fixturePath = path.join(ROOT, fixtureName);
{
  const doc = await pdfLib.PDFDocument.create();
  const helv = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const times = await doc.embedFont(pdfLib.StandardFonts.TimesRoman);
  const p = doc.addPage([595.28, 841.89]);
  p.drawText('Quarterly Report 2026', { x: 72, y: 770, size: 24, font: helv });
  p.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 730, size: 11, font: helv });
  p.drawText('Total invoice 1500 USD', { x: 72, y: 700, size: 12, font: helv });
  p.drawText('Serif sample line for metrics', { x: 72, y: 660, size: 12, font: times });
  fs.writeFileSync(fixturePath, Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })));
}
console.log('fixture bytes', fs.statSync(fixturePath).size);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String((e && e.message) || e)));
page.on('console', (m) => {
  const t = m.text();
  if (/font|Font|cmap|CMap|worker|Failed|failed|error|Error/.test(t)) logs.push(m.type() + ': ' + t.slice(0, 240));
});
page.on('response', (r) => { if (r.status() >= 400) logs.push('HTTP ' + r.status() + ' ' + r.url()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(700);

await page.evaluate(() => {
  window.__d = {
    spans: () => [...document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span')],
    fonts: () => { try { return [...document.fonts].map((f) => f.family + '|' + f.status); } catch (e) { return ['err']; } },
    // ink-column profile of one span's box on the Smart PDF canvas
    band: (name) => {
      const s = window.__d.spans().find((x) => (x.textContent || '').includes(name));
      if (!s) return { err: 'no span ' + name };
      const c = s.closest('.smart-pdf-viewer-page').querySelector('canvas');
      const kx = c.width / c.clientWidth, ky = c.height / c.clientHeight;
      const pad = s._smartPdfInk || { t: 1, l: 1, r: 1, b: 1 };
      const x = Math.max(0, Math.floor((s.offsetLeft - pad.l) * kx));
      const y = Math.max(0, Math.floor((s.offsetTop - pad.t) * ky));
      const W = Math.max(1, Math.min(Math.ceil((s.offsetWidth + pad.l + pad.r) * kx), c.width - x));
      const H = Math.max(1, Math.min(Math.ceil((s.offsetHeight + pad.t + pad.b) * ky), c.height - y));
      const d = c.getContext('2d').getImageData(x, y, W, H).data;
      const colInk = new Array(W).fill(0);
      for (let px = 0; px < W; px++) {
        for (let py = 0; py < H; py++) {
          const i = (py * W + px) * 4;
          if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 150) colInk[px]++;
        }
      }
      const runs = [];
      let inRun = false, start = 0, gapMax = 0, curGap = 0;
      for (let px = 0; px < W; px++) {
        if (colInk[px] > 0) {
          if (!inRun) { inRun = true; start = px; }
          if (curGap > gapMax) gapMax = curGap;
          curGap = 0;
        } else { if (inRun) { runs.push([start, px - 1]); inRun = false; } curGap++; }
      }
      if (inRun) runs.push([start, W - 1]);
      // gaps INSIDE the first word (stop at a real word space ~0.45em)
      const em = (parseFloat(s.style.fontSize) || 12) * kx;
      const inner = [];
      for (let i = 1; i < runs.length; i++) {
        const g = runs[i][0] - runs[i - 1][1] - 1;
        if (g > em * 0.45) break;
        inner.push(g);
      }
      return {
        w: W, runs: runs.length, runW: runs.map((r) => r[1] - r[0] + 1).slice(0, 24),
        innerGaps: inner, maxInnerGap: inner.length ? Math.max(...inner) : 0,
        em: +em.toFixed(1), ratio: (inner.length && em) ? +(Math.max(...inner) / em).toFixed(3) : 0
      };
    },
    buildRefDefault: async (url) => {
      const pdfjs = window.pdfjsLib;
      const buf = await (await fetch(url)).arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const pg = await doc.getPage(1);
      const base1 = pg.getViewport({ scale: 1 });
      const sm = document.querySelector('#smartPdfViewerPages .smart-pdf-viewer-page canvas');
      const scale = sm.width / base1.width;
      const vp = pg.getViewport({ scale: scale });
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.floor(vp.width));
      c.height = Math.max(1, Math.floor(vp.height));
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      window.__refCanvas = c;
      return { scale, w: c.width, h: c.height };
    },
    diffSmartRef: () => {
      const a = document.querySelector('#smartPdfViewerPages .smart-pdf-viewer-page canvas');
      const b = window.__refCanvas;
      const W = Math.min(a.width, b.width), H = Math.min(a.height, b.height);
      const da = a.getContext('2d').getImageData(0, 0, W, H).data;
      const db = b.getContext('2d').getImageData(0, 0, W, H).data;
      let diff = 0, big = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
        if (d > 2) diff++; if (d > 40) big++;
      }
      return { px: W * H, diff, big, pctDiff: +(100 * diff / (W * H)).toFixed(2) };
    },
    spanStyle: () => window.__d.spans().slice(0, 4).map((s) => {
      const cs = getComputedStyle(s);
      return { t: (s.textContent || '').slice(0, 20), color: cs.color, ff: cs.fontFamily, fs: cs.fontSize, tf: cs.transform };
    })
  };
});

// upload through the production path
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
        document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span').length >= 3;
    });
    if (ready) break;
    await sleep(200);
  }
}
await sleep(900);
console.log('uploaded+rendered:', ready);
console.log('FONTS:', JSON.stringify(await page.evaluate(() => window.__d.fonts())));
console.log('SPANS:', JSON.stringify(await page.evaluate(() => window.__d.spanStyle()), null, 1));
for (const n of ['Quarterly Report', 'The quick brown fox', 'Total invoice', 'Serif sample']) {
  console.log('BAND ' + n + ' -> ' + JSON.stringify(await page.evaluate((x) => window.__d.band(x), n)));
}
console.log('REF(defaults):', JSON.stringify(await page.evaluate((u) => window.__d.buildRefDefault(u), '/' + fixtureName)));
console.log('smart-vs-pdfjs-defaults diff:', JSON.stringify(await page.evaluate(() => window.__d.diffSmartRef())));
const artDir = path.join(ROOT, 'tests', 'artifacts');
if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });
await page.screenshot({ path: path.join(artDir, '__diag_std_viewer.png') });
const clip = await page.evaluate(() => {
  const w = document.querySelector('#smartPdfViewerPages .smart-pdf-viewer-page');
  const r = w.getBoundingClientRect();
  const sc = document.getElementById('smartPdfViewerScroll').getBoundingClientRect();
  const top = Math.max(r.top, sc.top);
  return { x: Math.max(0, r.left), y: Math.max(0, top), width: Math.min(r.width, sc.width), height: Math.min(420, sc.bottom - top) };
});
await page.screenshot({ path: path.join(artDir, '__diag_std_words.png'), clip });
console.log('LOGS:');
for (const l of logs.slice(0, 25)) console.log('  ' + l);
await browser.close();
server.close();
process.exit(0);
