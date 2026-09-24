// TEMP DIAGNOSTIC 4: PDF with a NON-embedded font (very common in the wild).
// Goal: measure whether the Smart PDF pdf.js options (useSystemFonts:false +
// standardFontDataUrl) make a real PDF render with the PDF's own metrics or
// with a substituted font (=> uneven intra-run / inter-run letter spacing).
// The fixture is built with an embedded Arial whose FontFile is then REMOVED,
// keeping /BaseFont + /Widths (exactly like a PDF that references Arial
// without embedding it), and every word of a line is its own show-text run
// positioned with the PDF's own advance widths (as Word/Chrome print-to-PDF do).
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
const PORT = 8403;
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

let fontkitMod = null;
try { fontkitMod = require2('@pdf-lib/fontkit'); } catch (e) { fontkitMod = null; }
const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
const fixtureName = '__diag_noembed.pdf';
const fixturePath = path.join(ROOT, fixtureName);
{
  const doc = await pdfLib.PDFDocument.create();
  if (typeof doc.registerFontkit === 'function') doc.registerFontkit(fontkitMod);
  const font = await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/arial.ttf'));
  const p = doc.addPage([595.28, 841.89]);
  // One line, one show-text run PER WORD, each positioned with the PDF's own
  // advance widths (this is what real-world generators emit).
  const words = ['The', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'];
  const size = 14;
  let x = 72;
  const y = 700;
  for (const w of words) {
    p.drawText(w, { x, y, size, font });
    x += font.widthOfTextAtSize(w + ' ', size);
  }
  p.drawText('Total invoice 1500 USD', { x: 72, y: 650, size: 12, font });
  p.drawText('Quarterly Report', { x: 72, y: 600, size: 20, font });
  // STRIP the embedded font program: the PDF now references Arial without
  // embedding it (no FontFile2) — the common real-world case.
  let stripped = 0;
  const { PDFName, PDFDict } = pdfLib;
  let descriptors = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const keys = obj.keys().map((k) => (k && k.asString ? k.asString() : String(k)));
    if (keys.indexOf('/Type') >= 0) {
      const t = obj.get(PDFName.of('Type'));
      if (t && t.asString && t.asString() === '/FontDescriptor') descriptors++;
    }
    if (keys.some((k) => k.indexOf('FontFile') === 0)) console.log('   dict keys:', JSON.stringify(keys.filter((k) => k.indexOf('FontFile') === 0)));
    for (const k of ['FontFile2', 'FontFile3', 'FontFile']) {
      const key = PDFName.of(k);
      if (obj.has(key)) { obj.delete(key); stripped++; }
    }
  }
  console.log('   descriptors found:', descriptors);
  fs.writeFileSync(fixturePath, Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })));
  console.log('fixture bytes', fs.statSync(fixturePath).size, 'fontProgramsRemoved=', stripped);
}

async function renderWith(page, url, opts) {
  return page.evaluate(async (u, o) => {
    const pdfjs = window.pdfjsLib;
    const buf = await (await fetch(u)).arrayBuffer();
    const params = { data: buf };
    if (o.smart) {
      params.cMapUrl = '/__pdfdiag/vendor/cmaps/';
      params.cMapPacked = true;
      params.standardFontDataUrl = '/__pdfdiag/vendor/standard_fonts/';
      params.useSystemFonts = false;
      params.disableFontFace = false;
    }
    const doc = await pdfjs.getDocument(params).promise;
    const pg = await doc.getPage(1);
    const scale = o.scale || 1.5;
    const vp = pg.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.floor(vp.width));
    c.height = Math.max(1, Math.floor(vp.height));
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    const tc = await pg.getTextContent();
    window.__cans = window.__cans || {};
    window.__cans[o.key] = c;
    return { key: o.key, w: c.width, h: c.height, styles: tc.styles,
      items: tc.items.map((it) => ({ s: it.str, w: it.width, f: it.fontName })).slice(0, 6) };
  }, url, opts);
}

function bandStats(page, key, yFromTop, yToTop) {
  return page.evaluate((k, y0, y1) => {
    const c = window.__cans[k];
    const y = Math.max(0, Math.floor(y0)), h = Math.min(c.height - y, Math.ceil(y1 - y0));
    const d = c.getContext('2d').getImageData(0, y, c.width, h).data;
    const colInk = new Array(c.width).fill(0);
    for (let px = 0; px < c.width; px++) {
      for (let py = 0; py < h; py++) {
        const i = (py * c.width + px) * 4;
        if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 150) colInk[px]++;
      }
    }
    const runs = [];
    let inRun = false, start = 0;
    for (let px = 0; px < c.width; px++) {
      if (colInk[px] > 0) { if (!inRun) { inRun = true; start = px; } }
      else if (inRun) { runs.push([start, px - 1]); inRun = false; }
    }
    if (inRun) runs.push([start, c.width - 1]);
    const gaps = [];
    for (let i = 1; i < runs.length; i++) gaps.push(runs[i][0] - runs[i - 1][1] - 1);
    const first = runs.length ? runs[0][0] : -1, last = runs.length ? runs[runs.length - 1][1] : -1;
    return { key: k, runs: runs.length, first, last, inkSpan: last - first + 1, gaps };
  }, key, yFromTop, yToTop);
}

async function ensurePdfJs(page) {
  await page.evaluate(async () => {
    if (window.pdfjsLib) return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/__pdfdiag/vendor/pdf.min.js';
      s.onload = res; s.onerror = () => rej(new Error('no pdfjs'));
      document.head.appendChild(s);
    });
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    }
  });
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000 });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String((e && e.message) || e)));
page.on('console', (m) => { const t = m.text(); if (/font|Font|Failed|failed|remeasure|Invalid/.test(t)) logs.push(m.type() + ': ' + t.slice(0, 220)); });
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(600);
await ensurePdfJs(page);

const smart = await renderWith(page, '/' + fixtureName, { smart: true, key: 'smart', scale: 1.5 });
const dflt = await renderWith(page, '/' + fixtureName, { smart: false, key: 'dflt', scale: 1.5 });
console.log('SMART styles:', JSON.stringify(smart.styles));
console.log('SMART items:', JSON.stringify(smart.items.slice(0, 4)));
console.log('DEFAULT styles:', JSON.stringify(dflt.styles));
console.log('DEFAULT items:', JSON.stringify(dflt.items.slice(0, 4)));

const lineY0 = (841.89 - 700 - 16) * 1.5, lineY1 = (841.89 - 700 + 6) * 1.5;
for (const k of ['smart', 'dflt']) console.log('BAND ' + k + ' -> ' + JSON.stringify(await bandStats(page, k, lineY0, lineY1)));
const l2Y0 = (841.89 - 650 - 15) * 1.5, l2Y1 = (841.89 - 650 + 6) * 1.5;
for (const k of ['smart', 'dflt']) console.log('BAND2 ' + k + ' -> ' + JSON.stringify(await bandStats(page, k, l2Y0, l2Y1)));
const l3Y0 = (841.89 - 600 - 22) * 1.5, l3Y1 = (841.89 - 600 + 8) * 1.5;
for (const k of ['smart', 'dflt']) console.log('BAND3 ' + k + ' -> ' + JSON.stringify(await bandStats(page, k, l3Y0, l3Y1)));

const artDir = path.join(ROOT, 'tests', 'artifacts');
if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });
for (const k of ['smart', 'dflt']) {
  const b64 = await page.evaluate((kk) => window.__cans[kk].toDataURL('image/png'), k);
  fs.writeFileSync(path.join(artDir, '__diag_noembed_' + k + '.png'), Buffer.from(b64.split(',')[1], 'base64'));
}
console.log('LOGS:');
for (const l of logs.slice(0, 20)) console.log('  ' + l);
await browser.close();
server.close();
process.exit(0);
