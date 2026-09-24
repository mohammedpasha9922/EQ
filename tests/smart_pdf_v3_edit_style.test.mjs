// PART: SMART PDF (v3 inline editor) — TARGETED STYLE-MATCHING VALIDATION.
// Verifies ONLY the one feature: when the user edits existing PDF text, the
// edited run automatically matches the original PDF text appearance
// (actual PDF font family + weight/style + size + color + direction +
// scale/spacing + baseline position), with no white patch, no ghost, no
// edit marker, pinch-to-zoom CSS intact and zero JS errors.
// Run:  node tests/smart_pdf_v3_edit_style.test.mjs
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
const PORT = 8362;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain',
  '.wasm': 'application/wasm', '.pdf': 'application/pdf'
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

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GENERIC = new Set(['sans-serif', 'serif', 'monospace']);

// This test's fixture needs REAL embedded font programs (Arial / Arial-Bold +
// Arabic), which pdf-lib can only embed with a fontkit instance. Test-only
// dependency — install with:  npm install @pdf-lib/fontkit --no-save
let fontkitMod = null;
try { fontkitMod = require2('@pdf-lib/fontkit'); } catch (e) { fontkitMod = null; }
if (!fontkitMod) {
  console.error('FATAL: @pdf-lib/fontkit is not installed.');
  console.error('Install it (test-only) and re-run:  npm install @pdf-lib/fontkit --no-save');
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

// ---------------------------------------------------------------------------
// Fixture: a normal 1-page PDF with KNOWN font/size/color/direction runs —
// embedded Arial / Arial-Bold programs so real PDF fonts exist to match.
// ---------------------------------------------------------------------------
const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
const { rgb } = pdfLib;
async function buildFixture(pathOut) {
  const doc = await pdfLib.PDFDocument.create();
  if (typeof doc.registerFontkit === 'function') doc.registerFontkit(fontkitMod);
  const regular = await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/arial.ttf'));
  const bold = await doc.embedFont(fs.readFileSync('C:/Windows/Fonts/arialbd.ttf'));
  const p = doc.addPage([595.28, 841.89]);
  p.drawText('Quarterly Report', { x: 72, y: 770, size: 24, font: bold });
  p.drawText('Total invoice 1500 USD', { x: 72, y: 730, size: 12, font: regular });
  p.drawText('Limited offer ends today', { x: 72, y: 700, size: 14, font: regular, color: rgb(200 / 255, 30 / 255, 30 / 255) });
  p.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 670, size: 11, font: regular });
  p.drawText('tiny footnote line', { x: 72, y: 645, size: 8, font: regular });
  p.drawText('مرحبا بالعالم', { x: 380, y: 610, size: 16, font: regular });
  // MULTILINGUAL FIXTURE RUNS (same embedded Arial program — Arial already
  // carries Latin, Cyrillic, Arabic, Arabic-script Kurdish, Arabic-Indic
  // digits and harakat, so every script below is a REAL PDF run whose style
  // must be inherited by an edit). Everything sits well below the original
  // runs, so no existing check can be affected.
  p.drawText('Le café coûte cinq euros', { x: 72, y: 570, size: 12, font: regular });
  p.drawText('Größe 42 Straße', { x: 72, y: 545, size: 12, font: regular });
  p.drawText('El niño pequeño', { x: 72, y: 520, size: 12, font: regular });
  p.drawText('Türkçe ğüşiöç İstanbul', { x: 72, y: 495, size: 12, font: regular });
  p.drawText('Привет мир 123', { x: 72, y: 470, size: 12, font: regular });
  p.drawText('کوردیی ناوەندی', { x: 72, y: 445, size: 13, font: regular });
  p.drawText('مَرْحَبَة قَدِيمَة', { x: 72, y: 420, size: 13, font: regular });
  p.drawText('١٢٣٤٥', { x: 72, y: 395, size: 12, font: regular });
  p.drawText('Report تقرير 2026', { x: 72, y: 370, size: 12, font: regular });
  // Isolated line (large gaps above AND below) with harakat + deep descenders:
  // proves the Arabic clearing box removes every one of this run's ink.
  p.drawText('جُحَا مِن جِحَاج', { x: 72, y: 285, size: 14, font: regular });

  fs.writeFileSync(pathOut, Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })));
}
const fixturePath = path.join(ROOT, '__smv3_style.pdf');
await buildFixture(fixturePath);
console.log('fixture bytes', fs.statSync(fixturePath).size);

// ---------------------------------------------------------------------------
// Page + in-page helpers (test-only; production code untouched).
// ---------------------------------------------------------------------------
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errs = [];
page.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(700);

await page.evaluate(() => {
  window.__t = {
    spans: () => [...document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span')],
    find: (needle) => window.__t.spans().find((s) => (s.textContent || '').includes(needle)),
    findAr: () => window.__t.spans().find((s) =>
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s.textContent || '')),
    snap: (s) => {
      const cs = getComputedStyle(s);
      const r = s.getBoundingClientRect();
      return {
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        fontStyle: cs.fontStyle, color: cs.color, background: cs.backgroundColor,
        dir: s.getAttribute('dir'), transform: cs.transform, transformOrigin: cs.transformOrigin,
        left: r.left, top: r.top, width: r.width, text: s.textContent,
        editing: s.classList.contains('smart-pdf-text-editing'),
        edited: s.classList.contains('smart-pdf-text-edited'),
        contentEditable: s.getAttribute('contenteditable')
      };
    },
    selectSub: (s, sub) => {
      const node = s.firstChild;
      if (!node || node.nodeType !== 3) return false;
      const idx = node.data.indexOf(sub);
      if (idx < 0) return false;
      const r = document.createRange();
      r.setStart(node, idx); r.setEnd(node, idx + sub.length);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      return true;
    },
    selectAll: (s) => {
      const node = s.firstChild;
      if (!node || node.nodeType !== 3) return false;
      const r = document.createRange();
      r.setStart(node, 0); r.setEnd(node, node.data.length);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      return true;
    },
    rangeW: (s, sub) => {
      const node = s.firstChild;
      if (!node || node.nodeType !== 3) return -1;
      const idx = node.data.indexOf(sub);
      if (idx < 0) return -1;
      const r = document.createRange();
      r.setStart(node, idx); r.setEnd(node, idx + sub.length);
      return r.getBoundingClientRect().width;
    },
    primaryFam: (s) => (getComputedStyle(s).fontFamily || '').split(',')[0].trim().replace(/^"|"$/g, ''),
    famRegistered: (s) => {
      const fam = window.__t.primaryFam(s);
      try { return [...document.fonts].some((f) => f.family === fam && f.status === 'loaded'); }
      catch (e) { return false; }
    },
    // Weight/style the registered @font-face itself declares — exactly what
    // the browser will apply for this family (a mismatch with the span's
    // requested weight would mean synthetic bold/slant instead of the PDF's
    // own glyph program).
    faceWeight: (fam) => {
      try {
        const f = [...document.fonts].find((x) => x.family === fam);
        return f ? String(f.weight || '') : '';
      } catch (e) { return ''; }
    },
    // Ink coverage of `text` drawn with one registered PDF font — used to
    // prove the edited run renders with the PDF's real (bold) glyph program.
    faceInk: (fam, text, px) => {
      try {
        const c = document.createElement('canvas');
        const size = px || 64;
        c.width = 60 + size * Math.max(1, text.length) * 0.9;
        c.height = size * 2;
        const g = c.getContext('2d');
        g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#fff';
        g.font = 'normal normal ' + size + 'px "' + fam + '"';
        g.textBaseline = 'middle';
        g.fillText(text, 10, c.height / 2);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let ink = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 128) ink++;
        return ink;
      } catch (e) { return -1; }
    },
    // Canvas probe under one span: proves the original glyphs were cleared
    // from the canvas (no ghost) and only the page background remains
    // (no white patch / discoloration / marker rectangle).
    probe: (s) => {
      try {
        const wrap = s.closest('.smart-pdf-viewer-page');
        const c = wrap ? wrap.querySelector('canvas') : null;
        if (!c || !c.width) return { err: 'no canvas' };
        const kx = c.width / c.clientWidth, ky = c.height / c.clientHeight;
        const ink = s._smartPdfInk || { t: 1, l: 1, r: 1, b: 1 };
        let x = Math.floor((s.offsetLeft - ink.l) * kx);
        let y = Math.floor((s.offsetTop - ink.t) * ky);
        let w = Math.ceil((s.offsetWidth + ink.l + ink.r) * kx);
        let h = Math.ceil((s.offsetHeight + ink.t + ink.b) * ky);
        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > c.width) w = c.width - x;
        if (y + h > c.height) h = c.height - y;
        if (w < 2 || h < 2) return { err: 'box' };
        const d = c.getContext('2d').getImageData(x, y, w, h).data;
        let dark = 0, cMin = 255, cMax = 0;
        const total = w * h;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          if (lum < 140) dark++;
        }
        const corners = [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]];
        for (const cr of corners) {
          const o = (cr[1] * w + cr[0]) * 4;
          const lum = 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2];
          if (lum < cMin) cMin = lum;
          if (lum > cMax) cMax = lum;
        }
        return { dark, total, cMin, cMax, err: null };
      } catch (e) { return { err: String((e && e.message) || e) }; }
    },
    // MULTILINGUAL probes (test-only): a run of a specific script, its full
    // family stack + lang hint, and the canvas pixels just outside the run's
    // ink box (leftover glyph ink = ghost after an edit).
    findKu: () => window.__t.spans().find((s) =>
      /[\u0695\u06b5\u06c6\u06ce\u06d5]/.test(s.textContent || '')),
    findByRe: (re) => window.__t.spans().find((s) => re.test(s.textContent || '')),
    langOf: (s) => (s ? s.getAttribute('lang') : null),
    stackOf: (s) => (s ? (getComputedStyle(s).fontFamily || '') : ''),
    inkAround: (s) => {
      try {
        const wrap = s.closest('.smart-pdf-viewer-page');
        const c = wrap ? wrap.querySelector('canvas') : null;
        if (!c || !c.width) return { err: 'no canvas' };
        const kx = c.width / c.clientWidth, ky = c.height / c.clientHeight;
        const pad = s._smartPdfInk || { t: 1, l: 1, r: 1, b: 1 };
        const x = Math.max(0, Math.floor((s.offsetLeft - pad.l) * kx));
        const y = Math.max(0, Math.floor((s.offsetTop - pad.t) * ky));
        const w = Math.max(1, Math.ceil((s.offsetWidth + pad.l + pad.r) * kx));
        const h = Math.max(1, Math.ceil((s.offsetHeight + pad.t + pad.b) * ky));
        const dark = (ix, iy, iw, ih) => {
          if (iw < 1 || ih < 1) return 0;
          if (ix < 0 || iy < 0 || ix + iw > c.width || iy + ih > c.height) return -1;
          const d = c.getContext('2d').getImageData(ix, iy, iw, ih).data;
          let n = 0;
          for (let i = 0; i < d.length; i += 4) {
            if (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 140) n++;
          }
          return n;
        };
        const band = Math.max(2, Math.round(h * 0.4));
        return {
          box: dark(x, y, w, h),
          above: dark(x, y - band, w, band),
          below: dark(x, y + h, w, band),
          left: dark(x - band, y, band, h),
          right: dark(x + w, y, band, h),
          err: null
        };
      } catch (e) { return { err: String((e && e.message) || e) }; }
    },
    layerOk: () => {
      const kids = [...document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer')];
      const all = kids.flatMap((l) => [...l.children]);
      return {
        layers: kids.length,
        count: all.length,
        allSpans: all.every((el) => el.tagName === 'SPAN'),
        editingLeft: document.querySelectorAll('.smart-pdf-text-editing').length,
        editableLeft: document.querySelectorAll('.smart-pdf-text-layer [contenteditable]').length
      };
    }
  };
});

// Open Smart PDF + upload the fixture (existing production upload path).
await page.evaluate(() => {
  const b = document.querySelector('.feature-nav-btn[data-action="open-smart-pdf"]');
  if (b) b.click();
});
await sleep(450);
const input = await page.$('#smartPdfFileInput');
await input.uploadFile(fixturePath);
let ready = false;
{
  const s0 = Date.now();
  while (Date.now() - s0 < 30000) {
    ready = await page.evaluate(() => {
      const v = document.getElementById('smartPdfViewerArea');
      return !!v && !v.hidden &&
        document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span').length >= 6;
    });
    if (ready) break;
    await sleep(150);
  }
}
check('T1. normal PDF uploaded and rendered with its text layer', ready);
await sleep(500);

// ---------------------------------------------------------------------------
// Baseline snapshots (pre-edit).
// ---------------------------------------------------------------------------
let base = await page.evaluate(() => {
  const boldS = window.__t.find('Quarterly Report');
  const numS = window.__t.find('1500');
  const redS = window.__t.find('Limited offer');
  const longS = window.__t.find('quick brown');
  const tinyS = window.__t.find('tiny footnote');
  const arS = window.__t.findAr();
  const sizes = [boldS, redS, numS, longS, tinyS].map((s) => s ? parseFloat(getComputedStyle(s).fontSize) : 0);
  const t = document.getElementById('smartPdfViewerScroll');
  const cs = t ? getComputedStyle(t) : null;
  return {
    spans: window.__t.spans().length,
    bold: boldS ? window.__t.snap(boldS) : null,
    num: numS ? window.__t.snap(numS) : null,
    red: redS ? window.__t.snap(redS) : null,
    long: longS ? window.__t.snap(longS) : null,
    tiny: tinyS ? window.__t.snap(tinyS) : null,
    ar: arS ? window.__t.snap(arS) : null,
    sizesOrdered: sizes.every((v, i) => i === 0 || v <= sizes[i - 1]),
    sizesAllPositive: sizes.every((v) => v > 0),
    famRegistered: {
      bold: boldS ? window.__t.famRegistered(boldS) : false,
      num: numS ? window.__t.famRegistered(numS) : false,
      ar: arS ? window.__t.famRegistered(arS) : false
    },
    primaryOk: [boldS, numS, redS, arS].every((s) => {
      const f = s ? window.__t.primaryFam(s) : '';
      return !!f && f !== 'sans-serif' && f !== 'serif' && f !== 'monospace';
    }),
    touchAction: cs ? cs.touchAction : ''
  };
});
console.log('BASE', JSON.stringify({
  spans: base.spans, boldFam: base.bold && base.bold.fontFamily, numFam: base.num && base.num.fontFamily,
  arDir: base.ar && base.ar.dir, arText: base.ar && base.ar.text, fam: base.famRegistered
}));
const allTexts = await page.evaluate(() => window.__t.spans().map((s) => ({
  t: s.textContent, dir: s.getAttribute('dir'), lang: s.getAttribute('lang'),
  size: getComputedStyle(s).fontSize, top: Math.round(s.getBoundingClientRect().top)
})));
console.log('SPANS-INVENTORY', JSON.stringify(allTexts));

check('T2a. spans reference the PDF\'s own registered font (not a generic browser font)',
  base.primaryOk && base.famRegistered.bold && base.famRegistered.num && base.famRegistered.ar,
  JSON.stringify({ primaryOk: base.primaryOk, fam: base.famRegistered }));
check('T2b. known font sizes present and ordered (24>=14>=12>=11>=8px)',
  base.sizesOrdered && base.sizesAllPositive,
  JSON.stringify({
    bold: base.bold && base.bold.fontSize, red: base.red && base.red.fontSize,
    num: base.num && base.num.fontSize, long: base.long && base.long.fontSize,
    tiny: base.tiny && base.tiny.fontSize
  }));
check('T2c. English spans LTR + Arabic span found with RTL direction data',
  !!(base.ar) && base.num.dir === 'ltr' && base.ar.dir === 'rtl',
  JSON.stringify({ numDir: base.num && base.num.dir, arDir: base.ar && base.ar.dir }));
// Bold runs: pdf.js registers the PDF's own bold program as its own face
// (embedded fonts declare no CSS weight — the face IS the weight, exactly as
// the canvas paints it), so the edited span must use that face and must NOT
// request a weight the face does not declare (which would trigger synthetic
// bold instead of the PDF's real bold glyphs).
const boldFace = await page.evaluate(async () => {
  const boldS = window.__t.find('Quarterly Report');
  const regS = window.__t.find('quick brown');
  const boldFam = boldS ? window.__t.primaryFam(boldS) : '';
  const regFam = regS ? window.__t.primaryFam(regS) : '';
  try {
    await Promise.all([...document.fonts]
      .filter((f) => f.family === boldFam || f.family === regFam)
      .map((f) => f.load().catch(() => {})));
  } catch (e) { /* measured below */ }
  const text = 'otalerup'; // letters present in both runs/faces
  return {
    boldFam, regFam,
    boldInk: window.__t.faceInk(boldFam, text),
    regInk: window.__t.faceInk(regFam, text),
    faceWeight: window.__t.faceWeight(boldFam),
    spanWeight: boldS ? getComputedStyle(boldS).fontWeight : ''
  };
});
const normW = (w) => (w === 'normal' ? '400' : String(w));
check('T2d. bold run keeps the PDF bold face (heavier glyphs) and its span weight matches that face (no synthetic bold)',
  !!boldFace.boldFam && boldFace.boldFam !== boldFace.regFam &&
  boldFace.boldInk > boldFace.regInk * 1.1 &&
  normW(boldFace.spanWeight) === normW(boldFace.faceWeight),
  JSON.stringify(boldFace));

// ---------------------------------------------------------------------------
// Editing helpers driving the REAL interaction (click → caret → type → blur).
// ---------------------------------------------------------------------------
async function clickSpan(needle) {
  const box = await page.evaluate((n) => {
    const s = n === '@ar' ? window.__t.findAr() : window.__t.find(n);
    if (!s) return null;
    s.scrollIntoView({ block: 'center' });
    const r = s.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, needle);
  if (!box) return false;
  await page.mouse.click(box.x, box.y);
  await sleep(120);
  return page.evaluate(() => document.querySelectorAll('.smart-pdf-text-editing').length === 1);
}
async function selectAndType(needle, sub, replacement, selectAllMode) {
  const okSel = await page.evaluate((n, sub2, all) => {
    const s = n === '@ar' ? window.__t.findAr() : window.__t.find(n);
    if (!s || !s.classList.contains('smart-pdf-text-editing')) return false;
    return all ? window.__t.selectAll(s) : window.__t.selectSub(s, sub2);
  }, needle, sub || '', !!selectAllMode);
  if (!okSel) return false;
  await page.keyboard.type(replacement);
  await sleep(80);
  return true;
}
async function commit() {
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await sleep(150);
  return page.evaluate(() => document.querySelectorAll('.smart-pdf-text-editing').length === 0);
}
function styleUnchanged(a, b) {
  return a && b &&
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.dir === b.dir &&
    a.transform === b.transform;
}

// ---------------------------------------------------------------------------
// T2e — the same face/weight fidelity must hold for the EDITED bold run (the
// style lives on the span the user actually types into).
// ---------------------------------------------------------------------------
{
  const before = await page.evaluate(() => window.__t.snap(window.__t.find('Quarterly Report')));
  const clicked = await clickSpan('Quarterly Report');
  const typed = await selectAndType('Quarterly Report', 'Report', 'REPORT');
  await commit();
  const after = await page.evaluate(async () => {
    const s = window.__t.find('Quarterly REPORT');
    if (!s) return null;
    const fam = window.__t.primaryFam(s);
    const regFam = window.__t.primaryFam(window.__t.find('quick brown'));
    try {
      await Promise.all([...document.fonts]
        .filter((f) => f.family === fam || f.family === regFam)
        .map((f) => f.load().catch(() => {})));
    } catch (e) { /* measured below */ }
    return {
      fam, regFam,
      ink: window.__t.faceInk(fam, 'otalerup'),
      regInk: window.__t.faceInk(regFam, 'otalerup'),
      weight: getComputedStyle(s).fontWeight,
      faceWeight: window.__t.faceWeight(fam),
      snap: window.__t.snap(s)
    };
  });
  check('T2e. edited bold run keeps the PDF bold face + declared weight (style/size/baseline unchanged)',
    clicked && typed && !!after && after.snap.edited && styleUnchanged(before, after.snap) &&
      after.fam !== after.regFam && after.ink > after.regInk * 1.1 &&
      normW(after.weight) === normW(after.faceWeight),
    JSON.stringify({ clicked, typed, after: after && {
      fam: after.fam, regFam: after.regFam, weight: after.weight, faceWeight: after.faceWeight,
      ink: after.ink, regInk: after.regInk, size: after.snap.fontSize
    } }));
}

// ---------------------------------------------------------------------------
// T3 — edit ONE CHARACTER-ish word swap on the long English run; during AND
// after the edit the replacement must match the original style/position.
// ---------------------------------------------------------------------------
{
  const before = await page.evaluate(() => window.__t.snap(window.__t.find('quick brown')));
  const clicked = await clickSpan('quick brown');
  const during = await page.evaluate(() => window.__t.snap(window.__t.find('quick brown')));
  check('T3a. click places the caret and starts the in-place edit (transparent bg, no toolbar)',
    clicked && during.editing && during.contentEditable !== null && during.background === 'rgba(0, 0, 0, 0)',
    JSON.stringify({ clicked, editing: during.editing, bg: during.background, ce: during.contentEditable }));
  check('T3b. during edit: font family/size/weight/style/direction/scale + baseline identical to original',
    styleUnchanged(before, during) && Math.abs(before.left - during.left) < 0.6 &&
      Math.abs(before.top - during.top) < 0.6,
    JSON.stringify({ fam: during.fontFamily, size: during.fontSize, w: during.fontWeight, dir: during.dir }));
  const typed = await selectAndType('quick brown', 'brown', 'BROWN');
  await commit();
  const after = await page.evaluate(() => window.__t.snap(window.__t.find('quick BROWN')));
  check('T3c. edit committed; replacement keeps the exact original style (longer text run)',
    typed && !!after && !after.editing && after.edited && styleUnchanged(before, after) &&
      after.text.includes('BROWN') && !after.text.includes('brown'),
    JSON.stringify({ text: after && after.text.slice(0, 50), fam: after && after.fontFamily, size: after && after.fontSize }));
}

// ---------------------------------------------------------------------------
// T5 — edit a WORD on the number line (invoice → paid);
// T6 — edit the NUMBER 1500 → 2500 with visual width/style/position proof.
// ---------------------------------------------------------------------------
{
  const preWord = await page.evaluate(() => window.__t.snap(window.__t.find('1500')));
  const clicked = await clickSpan('1500');
  const typed = await selectAndType('1500', 'invoice', 'paid');
  await commit();
  const postWord = await page.evaluate(() => window.__t.snap(window.__t.find('1500')));
  check('T5. word edit works and the edited run keeps the original PDF style',
    clicked && typed && !!postWord && postWord.edited && postWord.text.includes('Total paid 1500 USD') &&
      styleUnchanged(preWord, postWord),
    JSON.stringify({ text: postWord && postWord.text, fam: postWord && postWord.fontFamily }));

  // NUMBER edit — headline scenario: 1500 → 2500.
  const w1500 = await page.evaluate(() => window.__t.rangeW(window.__t.find('1500'), '1500'));
  const preNum = await page.evaluate(() => window.__t.snap(window.__t.find('1500')));
  const preRect = await page.evaluate(() => {
    const r = window.__t.find('1500').getBoundingClientRect();
    return { left: r.left, top: r.top };
  });
  const clicked2 = await clickSpan('1500');
  const typed2 = await selectAndType('1500', '1500', '2500');
  await commit();
  const postNum = await page.evaluate(() => window.__t.snap(window.__t.find('2500')));
  const w2500 = await page.evaluate(() => window.__t.rangeW(window.__t.find('2500'), '2500'));
  const postRect = await page.evaluate(() => {
    const r = window.__t.find('2500').getBoundingClientRect();
    return { left: r.left, top: r.top };
  });
  check('T6a. 1500 → 2500 committed with the original font/size/weight/direction/scale',
    clicked2 && typed2 && !!postNum && postNum.text.includes('Total paid 2500 USD') &&
      styleUnchanged(preNum, postNum),
    JSON.stringify({ fam: postNum && postNum.fontFamily, size: postNum && postNum.fontSize, dir: postNum && postNum.dir }));
  check('T6b. 2500 has the same apparent width as 1500 (same font+size+scale, tabular digits)',
    w1500 > 0 && w2500 > 0 && Math.abs(w1500 - w2500) <= 1.0,
    `1500=${w1500.toFixed(2)}px 2500=${w2500.toFixed(2)}px`);
  check('T6c. baseline/position unchanged (top/left stable across the edit)',
    Math.abs(preRect.left - postRect.left) < 0.6 && Math.abs(preRect.top - postRect.top) < 0.6,
    JSON.stringify({ pre: preRect, post: postRect }));
}

// ---------------------------------------------------------------------------
// T10 — COLORED text + different-size text edits.
// ---------------------------------------------------------------------------
{
  const pre = await page.evaluate(() => window.__t.snap(window.__t.find('Limited offer')));
  const clicked = await clickSpan('Limited offer');
  const during = await page.evaluate(() => window.__t.snap(window.__t.find('Limited offer')));
  check('T10a. during edit the text shows the ORIGINAL color (rgb(200,30,30), not black)',
    clicked && during.editing && during.color === 'rgb(200, 30, 30)' && during.background === 'rgba(0, 0, 0, 0)',
    JSON.stringify({ color: during.color, bg: during.background }));
  const typed = await selectAndType('Limited offer', 'offer', 'deals');
  await commit();
  const after = await page.evaluate(() => window.__t.snap(window.__t.find('Limited deals')));
  check('T10b. committed colored run keeps original color + font/size/weight/direction',
    typed && !!after && after.edited && after.color === 'rgb(200, 30, 30)' && styleUnchanged(pre, after),
    JSON.stringify({ color: after && after.color, fam: after && after.fontFamily }));
  // Different SIZE run (8px footnote): edit must preserve its size.
  const preT = await page.evaluate(() => window.__t.snap(window.__t.find('tiny footnote')));
  const cT = await clickSpan('tiny footnote');
  const duringT = await page.evaluate(() => window.__t.snap(window.__t.find('tiny footnote')));
  const tT = await selectAndType('tiny footnote', 'footnote', 'footnote');
  await commit();
  const afterT = await page.evaluate(() => window.__t.snap(window.__t.find('tiny footnote')));
  check('T10c. a different font size (8px) is preserved through the edit',
    cT && tT && parseFloat(duringT.fontSize) === parseFloat(preT.fontSize) &&
      parseFloat(afterT.fontSize) === parseFloat(preT.fontSize) &&
      styleUnchanged(preT, duringT) && styleUnchanged(preT, afterT) && !afterT.edited,
    JSON.stringify({ pre: preT.fontSize, during: duringT.fontSize, post: afterT.fontSize }));
}

// ---------------------------------------------------------------------------
// T8 — ARABIC: RTL direction + embedded font preserved while editing.
// ---------------------------------------------------------------------------
{
  const pre = await page.evaluate(() => {
    const s = window.__t.findAr();
    return s ? window.__t.snap(s) : null;
  });
  const clicked = await clickSpan('@ar');
  const during = await page.evaluate(() => {
    const s = window.__t.findAr();
    return s ? window.__t.snap(s) : null;
  });
  check('T8a. Arabic run opens for editing as RTL with the PDF font and original size',
    clicked && !!during && during.editing && during.dir === 'rtl' &&
      during.fontFamily === pre.fontFamily && during.fontSize === pre.fontSize &&
      during.fontWeight === pre.fontWeight,
    JSON.stringify({ dir: during && during.dir, fam: during && during.fontFamily, size: during && during.fontSize }));
  const typed = await selectAndType('@ar', '', 'مرحبا', true);
  await commit();
  const after = await page.evaluate(() => {
    const s = window.__t.findAr();
    return s ? window.__t.snap(s) : null;
  });
  check('T8b. Arabic replacement committed; still RTL with the same font/size/weight/scale',
    typed && !!after && after.edited && after.dir === 'rtl' && after.text.indexOf('مرحبا') === 0 &&
      styleUnchanged(pre, after),
    JSON.stringify({ text: after && after.text, dir: after && after.dir }));
}

// ---------------------------------------------------------------------------
// T9 — edited English run still LTR with its registered PDF font.
// ---------------------------------------------------------------------------
{
  const s = await page.evaluate(() => {
    const el = window.__t.find('2500');
    if (!el) return null;
    return { dir: el.getAttribute('dir'), famOk: window.__t.famRegistered(el), fam: window.__t.primaryFam(el) };
  });
  check('T9. edited English number run: LTR + registered PDF font still referenced',
    !!s && s.dir === 'ltr' && s.famOk && !GENERIC.has(s.fam), JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// T11/T12/T13 — rollback path, no white patch, no ghost/duplicate, no marker.
// ---------------------------------------------------------------------------
{
  // Rollback on the tiny line: End → BackSpace → retype → blur = UNCHANGED.
  const preT = await page.evaluate(() => window.__t.snap(window.__t.find('tiny footnote')));
  await clickSpan('tiny footnote');
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  const midText = await page.evaluate(() => {
    const s = window.__t.find('tiny footnote');
    return s ? s.textContent : '';
  });
  await page.keyboard.type('e');
  await commit();
  const postT = await page.evaluate(() => window.__t.snap(window.__t.find('tiny footnote')));
  check('T13a. keyboard editing (End/Backspace/type) works; unchanged commit rolls back cleanly',
    midText === 'tiny footnote lin' && !!postT && !postT.edited && !postT.editing &&
      postT.contentEditable === null && postT.color === 'rgba(0, 0, 0, 0)' &&
      styleUnchanged(preT, postT),
    JSON.stringify({ mid: midText, postColor: postT && postT.color, edited: postT && postT.edited }));

  // Edited spans: canvas under the box holds NO original glyphs (no ghost)
  // and only uniform page background (no white patch / marker rectangle).
  const probes = await page.evaluate(() => {
    const out = {};
    for (const pr of [['long', 'BROWN'], ['num', '2500'], ['red', 'Limited deals']]) {
      const s = window.__t.find(pr[1]);
      if (s) out[pr[0]] = window.__t.probe(s);
    }
    out.dupLong = window.__t.spans().filter((s) => (s.textContent || '').includes('BROWN')).length;
    out.dupNum = window.__t.spans().filter((s) => (s.textContent || '').includes('2500')).length;
    return out;
  });
  const clean = ['long', 'num', 'red'].every((k) => probes[k] && !probes[k].err);
  check('T12. no ghost/duplicate: canvas glyphs cleared under edited runs; new text appears exactly once',
    clean && probes.long.dark / probes.long.total < 0.02 &&
      probes.num.dark / probes.num.total < 0.02 && probes.red.dark / probes.red.total < 0.02 &&
      probes.dupLong === 1 && probes.dupNum === 1,
    JSON.stringify(probes));
  check('T11. no white patch/marker: edited box interior is uniform page background',
    clean && probes.long.cMin >= 240 && (probes.long.cMax - probes.long.cMin) <= 12,
    JSON.stringify({ cMin: probes.long.cMin, cMax: probes.long.cMax }));

  // Rollback spot must have its original glyphs back (pixel restore works).
  const restored = await page.evaluate(() => {
    const s = window.__t.find('tiny footnote');
    return s ? window.__t.probe(s) : { err: 'missing' };
  });
  check('T13b. rollback restored the original painted pixels (glyph ink present again)',
    !restored.err && restored.dark > 20, JSON.stringify({ dark: restored.dark, total: restored.total }));

  // No edit marker remains anywhere in the text layer.
  const layer = await page.evaluate(() => window.__t.layerOk());
  check('T13c. no edit marker: layer still holds exactly the original span set; nothing editing/editable left',
    layer.allSpans && layer.count === base.spans && layer.editingLeft === 0 && layer.editableLeft === 0,
    JSON.stringify(Object.assign({}, layer, { base: base.spans })));

  // Any transform on a span is a pure horizontal scaleX — no skew/rotation.
  const tf = await page.evaluate(() => {
    const bad = [];
    let scaled = 0;
    for (const s of window.__t.spans()) {
      const t = getComputedStyle(s).transform;
      if (!t || t === 'none') continue;
      if (/^matrix\([0-9.]+, 0, 0, 1, 0, 0\)$/.test(t)) { scaled++; continue; }
      bad.push(t);
    }
    return { bad, scaled };
  });
  check('T6d. scale/transform is absent or a pure horizontal scaleX (no skew/rotation introduced)',
    tf.bad.length === 0, JSON.stringify(tf));
}

// ---------------------------------------------------------------------------
// T14 — pinch-to-zoom / scrolling untouched (CSS verified read-only + the
// scroll container still works — production CSS was NOT modified).
// ---------------------------------------------------------------------------
{
  const zoom = await page.evaluate(async () => {
    const sc = document.getElementById('smartPdfViewerScroll');
    const cs = sc ? getComputedStyle(sc) : null;
    if (sc) sc.scrollTop = 40;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = sc ? sc.scrollTop : -1;
    if (sc) sc.scrollTop = 0;
    return {
      touchAction: cs ? cs.touchAction : '',
      overflowY: cs ? cs.overflowY : '',
      scrolled: after >= 40
    };
  });
  const ta = zoom.touchAction || '';
  check('T14. pinch-to-zoom + vertical scrolling intact (touch-action pan-y pinch-zoom; scroll works)',
    ta.indexOf('pan-y') !== -1 && ta.indexOf('pinch-zoom') !== -1 && zoom.overflowY === 'auto' && zoom.scrolled,
    JSON.stringify(zoom));
}
// ---------------------------------------------------------------------------
// MULTILINGUAL STYLE MATCHING — the same single feature, every script.
// Each case edits a REAL PDF run of its language: the replacement must inherit
// the exact face/size/weight/direction/baseline, clear the original glyphs (no
// ghost/patch/duplicate/marker) and — for Arabic/Kurdish — carry an explicit
// script-appropriate family list (never a Latin-only generic). Latin/Cyrillic
// runs must keep the EXACT stack they had before (English/Latin unchanged).
// A run is located by position (data-mlt tag) so reordered RTL text cannot
// break the lookup.
// ---------------------------------------------------------------------------
const ARABIC_STACK = ['"Arial"', '"Tahoma"', '"Segoe UI"', '"Noto Naskh Arabic"', '"Traditional Arabic"'];
const ML_CASES = [
  { id: 'fr', re: 'café', out: 'cafétéria', script: 'latin' },
  { id: 'de', re: 'Größe', out: 'Größer', script: 'latin' },
  { id: 'es', re: 'niño', out: 'niño grande', script: 'latin' },
  { id: 'tr', re: 'Türkçe', out: 'Türkçem', script: 'latin' },
  { id: 'ru', re: 'Привет', out: 'Салам', script: 'cyrillic' },
  { id: 'ku', re: 'کوردیی', out: 'کتێبخانە', script: 'arabic', lang: 'ckb' },
  { id: 'ar', re: 'مَرْحَبَة', out: 'مَرْحَبَة كَبِيرَة', script: 'arabic', lang: 'ar' },
  // Arabic-Indic digits come back from pdf.js LTR-reversed (٥٤٣٢١) — match them
  // by digit-class instead of literal order so the lookup cannot depend on
  // bidi reordering.
  { id: 'arNum', re: '[١٢٣٤٥٩٨٧]+', out: '٩٨٧', script: 'arabic', lang: 'ar' },
  { id: 'mixed', re: 'Report.*[\\u0600-\\u06FF]|ريرقت', out: 'Report 2026 ريرقت ريرقت', script: 'arabic' }
];

async function prepTag(reSrc, tag) {
  return await page.evaluate((r, t) => {
    const s = window.__t.findByRe(new RegExp(r));
    if (!s) return false;
    s.setAttribute('data-mlt', t);
    s.scrollIntoView({ block: 'center' });
    return true;
  }, reSrc, tag);
}
async function snapTag(tag) {
  return await page.evaluate((t) => {
    const s = document.querySelector('#smartPdfViewerPages .smart-pdf-text-layer > span[data-mlt="' + t + '"]');
    if (!s) return null;
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    return {
      text: s.textContent, dir: s.getAttribute('dir'), lang: s.getAttribute('lang'),
      family: cs.fontFamily, size: cs.fontSize, weight: cs.fontWeight, style: cs.fontStyle,
      color: cs.color, transform: cs.transform, left: r.left, top: r.top, width: r.width,
      editing: s.classList.contains('smart-pdf-text-editing'),
      edited: s.classList.contains('smart-pdf-text-edited'),
      // Canvas trace of the run under its OWN stack: a non-empty trace proves
      // the script really renders (Arabic/Kurdish included, not blank/tofu).
      trace: (() => {
        try {
          const size = 40;
          const c = document.createElement('canvas');
          c.width = 40 + size * Math.max(4, (s.textContent || 'x').length) * 1.3; c.height = size * 3;
          const g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          g.fillStyle = '#000';
          g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
          g.fillText(s.textContent || '', 12, c.height / 2);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let ink = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i] < 128) ink++;
          return ink;
        } catch (e) { return -1; }
      })()
    };
  }, tag);
}
async function editTag(tag, replacement) {
  const box = await page.evaluate((t) => {
    const s = document.querySelector('#smartPdfViewerPages .smart-pdf-text-layer > span[data-mlt="' + t + '"]');
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, tag);
  if (!box) return { err: 'span missing' };
  const pre = await snapTag(tag);
  await page.mouse.click(box.x, box.y);
  await sleep(140);
  const during = await snapTag(tag);
  const sel = await page.evaluate((t) => {
    const s = document.querySelector('#smartPdfViewerPages .smart-pdf-text-layer > span[data-mlt="' + t + '"]');
    return s ? window.__t.selectAll(s) : false;
  }, tag);
  await page.keyboard.type(replacement);
  await sleep(120);
  await commit();
  const post = await page.evaluate((t) => {
    const s = document.querySelector('#smartPdfViewerPages .smart-pdf-text-layer > span[data-mlt="' + t + '"]');
    if (!s) return null;
    const out = window.__t.snap(s);
    out.probe = window.__t.probe(s);
    return out;
  }, tag);
  const postFull = await snapTag(tag);
  const dup = await page.evaluate((r) =>
    window.__t.spans().filter((s) => (s.textContent || '').indexOf(r) !== -1).length, replacement);
  return { pre, during, sel, post, postFull, dup };
}


// ---------------------------------------------------------------------------
// T15 — zero JavaScript errors across the whole session.

// Wait until the full multilingual text layer exists before editing it.
{
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const n = await page.evaluate(() =>
      document.querySelectorAll('#smartPdfViewerPages .smart-pdf-text-layer > span').length);
    if (n >= 15) break;
    await sleep(150);
  }
}

for (const c of ML_CASES) {
  const tag = 'ml-' + c.id;
  const prepped = await prepTag(c.re, tag);
  if (!prepped) { check(`M-${c.id}. fixture run present`, false, c.re); continue; }
  const r = await editTag(tag, c.out);
  if (r.err || !r.pre || !r.post || !r.postFull) {
    check(`M-${c.id}. run edited in place`, false, JSON.stringify(r.err || r)); continue;
  }
  const isLatin = c.script === 'latin' || c.script === 'cyrillic';
  const faceFirst = r.pre.family.split(',')[0].trim().replace(/^"|"$/g, '');
  check(`M-${c.id}.a replacement keeps the original run's text/style (edited, right text, PDF face first)`,
    r.during && r.during.editing && r.postFull.text === c.out && r.postFull.edited &&
      faceFirst && faceFirst !== 'sans-serif' && faceFirst !== 'serif' && faceFirst !== 'monospace' &&
      r.postFull.family.split(',')[0].trim().replace(/^"|"$/g, '') === faceFirst &&
      r.dup === 1,
    JSON.stringify({ text: r.postFull.text, dup: r.dup, stack: r.postFull.family }));

  if (isLatin) {
    // The accepted Latin/Cyrillic behaviour: the stack must be byte-identical
    // to the pre-edit stack (no extra family, no lang hint added).
    check(`M-${c.id}.b Latin/Cyrillic stack unchanged byte-for-byte (no regression, no lang hint)`,
      r.postFull.family === r.pre.family && !r.postFull.lang && !r.during.lang,
      JSON.stringify({ pre: r.pre.family, post: r.postFull.family, lang: r.postFull.lang }));
  } else {
    const stack = r.postFull.family;
    // Computed font-family drops the quotes generic-safe names do not need.
    const norm = (s) => String(s).split(',').map((x) => x.trim().replace(/^"|"$/g, '').toLowerCase());
    const fams = norm(stack);
    const preFams = norm(r.pre.family);
    const hasAll = ARABIC_STACK.every((f) => fams.indexOf(f.replace(/^"|"$/g, '').toLowerCase()) !== -1);
    const genericAt = fams.indexOf('sans-serif');
    const arialAt = fams.indexOf('arial');
    const beforeGeneric = arialAt !== -1 && (genericAt === -1 || arialAt < genericAt);
    const langOk = c.lang ? r.postFull.lang === c.lang : !!r.postFull.lang;
    check(`M-${c.id}.b script-appropriate families + lang hint (no Latin-only fallback for Arabic/Kurdish)`,
      hasAll && beforeGeneric && langOk && !!faceFirst.startsWith('g_') &&
        fams[0] === preFams[0],
      JSON.stringify({ stack: stack, lang: r.postFull.lang, faceFirst: faceFirst }));
  }

  check(`M-${c.id}.c size/weight/style/direction/baseline/position preserved across the edit`,
    r.during.fontSize === r.pre.fontSize && r.during.fontWeight === r.pre.fontWeight &&
      r.during.fontStyle === r.pre.fontStyle && r.during.dir === r.pre.dir &&
      r.postFull.size === r.pre.size && r.postFull.weight === r.pre.weight &&
      r.postFull.dir === r.pre.dir && r.postFull.transform === r.pre.transform &&
      Math.abs(r.postFull.left - r.pre.left) < 0.51 && Math.abs(r.postFull.top - r.pre.top) < 0.51,
    JSON.stringify({ pre: { size: r.pre.size, dir: r.pre.dir, top: r.pre.top, tf: r.pre.transform },
      post: { size: r.postFull.size, dir: r.postFull.dir, top: r.postFull.top, tf: r.postFull.transform } }));

  check(`M-${c.id}.d original colour kept (opaque, same as the palette read from the canvas)`,
    r.during.color !== 'rgba(0, 0, 0, 0)' && r.postFull.color === r.during.color,
    JSON.stringify({ during: r.during.color, post: r.postFull.color }));

  check(`M-${c.id}.e no ghost / no white patch / no marker (glyphs cleared, uniform page background)`,
    !!r.post.probe && r.post.probe.err === null && r.post.probe.dark === 0 &&
      r.post.probe.cMin >= 240 && (r.post.probe.cMax - r.post.probe.cMin) <= 12,
    JSON.stringify(r.post.probe));

  check(`M-${c.id}.f replacement really renders in its script (canvas trace of the run > 0)`,
    r.postFull.trace > 0, JSON.stringify({ trace: r.postFull.trace }));
}

// M-switch — mixed-language text: an LTR Latin run replaced by Arabic (and the
// direction of the original run preserved) must switch to Arabic-capable
// families without touching size/baseline.
{
  const tag = 'ml-switch';
  const ok = await prepTag('Größe', tag);
  const before = ok ? await snapTag(tag) : null;
  const typed = ok ? await editTag(tag, 'Größe تقرير') : { err: 'no run' };
  check('M-switch. Arabic typed into a Latin run gains Arabic-capable families + lang, keeps size/baseline/LTR',
    ok && typed.postFull && before &&
      typed.postFull.text === 'Größe تقرير' && typed.postFull.family.replace(/["']/g, '').split(',').map((x) => x.trim()).indexOf('Arial') !== -1 &&
      typed.postFull.lang === 'ar' && typed.postFull.dir === before.dir &&
      typed.postFull.size === before.size &&
      Math.abs(typed.postFull.top - before.top) < 0.51 && typed.dup === 1 &&
      !!typed.post.probe && typed.post.probe.dark === 0,
    JSON.stringify({ before: before && before.family, after: typed.postFull && typed.postFull.family,
      lang: typed.postFull && typed.postFull.lang, dir: typed.postFull && typed.postFull.dir }));
}

// M-iso — Arabic with harakat on an isolated line: the clearing box must
// remove ALL of that run's ink (marks above the baseline and deep descenders
// included), which is the classic Arabic ghost/overhang risk.
{
  const tag = 'ml-iso';
  const ok = await prepTag('جُحَا', tag);
  const before = ok ? await page.evaluate(() => {
    const s = document.querySelector('#smartPdfViewerPages .smart-pdf-text-layer > span[data-mlt="ml-iso"]');
    return s ? window.__t.inkAround(s) : null;
  }) : null;
  const typed = ok ? await editTag(tag, 'جُحَا كَبِير') : { err: 'no run' };
  const after = await page.evaluate(() => {
    const s = document.querySelector('#smartPdfViewerPages .smart-pdf-text-layer > span[data-mlt="ml-iso"]');
    return s ? window.__t.inkAround(s) : null;
  });
  check('M-iso. isolated Arabic run with harakat: no overhang ink left around the cleared box (no ghost)',
    ok && before && after && after.err === null && after.box === 0 &&
      after.above === 0 && after.below === 0 && after.left === 0 && after.right === 0,
    JSON.stringify({ before: before, after: after }));
}

// ---------------------------------------------------------------------------
check('T15. zero JavaScript errors', errs.length === 0, errs.join(' | '));

// ---- Summary ----
const failed = results.filter((r) => !r.ok).length;
console.log(`SUMMARY: ${results.length - failed}/${results.length} checks passed`);
browser.close().catch(() => {});
server.close(() => {});
try { fs.unlinkSync(fixturePath); } catch (e) {}
process.exit(failed ? 1 : 0);





