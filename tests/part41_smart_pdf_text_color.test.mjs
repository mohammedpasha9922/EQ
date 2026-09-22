// PART 41 — SMART DOCUMENTS: PDF Text Color (part of PART 5e Text Color scope).
// Proves the "Text Color" toolbar action writes the color as REAL PDF content
// stream operators (`r g b rg` around the selected run) — NOT an overlay, not a
// canvas draw, not an image — and that text stays selectable/searchable with
// re-import/re-edit producing no duplicates and no rasterization.
// Run:  node tests/part41_smart_pdf_text_color.test.mjs
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
const PORT = 8359;
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
setTimeout(() => process.exit(124), 420000);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
let pakoLib = null;
try { pakoLib = require2(path.join(ROOT, '__pdfdiag/vendor/pako.min.js')); } catch (e) { pakoLib = null; }

async function buildFixture(pathOut) {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const p1 = doc.addPage([595.28, 841.89]);
  p1.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 700, size: 12, font });
  p1.drawText('Second line of PDF text lives here now', { x: 72, y: 680, size: 12, font });
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText('The fox is brown and quick', { x: 72, y: 700, size: 12, font });
  fs.writeFileSync(pathOut, Buffer.from(await doc.save({ useObjectStreams: false, updateMetadata: false })));
}

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return { page, errs };
}
async function openDrawer(page) { await page.evaluate(() => document.getElementById('drawerToggle').click()); await sleep(250); }
async function clickSmartDocs(page) { await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click()); await sleep(400); }
async function pickFile(page, filePath) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 9000 }),
    page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click())
  ]);
  if (filePath) await chooser.accept([filePath]); else await chooser.cancel();
}
async function waitFor(page, fn, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(120);
  }
  return false;
}
async function importAndLoad(page, filePath) {
  await openDrawer(page); await clickSmartDocs(page);
  await pickFile(page, filePath);
  const ok = await waitFor(page, () =>
    window.__smartImport.getState().editorVisible === true &&
    document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length > 0);
  if (!ok) throw new Error('PDF editor did not load');
  await sleep(400);
}
// Make a REAL browser selection over `word` inside the page's text layer.
async function selectWord(page, pageNo, word) {
  return await page.evaluate(([pg, w]) => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'))
      .filter((s) => parseInt(s.dataset.page, 10) === pg);
    const sp = spans.find((s) => (s.textContent || '').indexOf(w) !== -1);
    if (!sp) return null;
    const node = [...sp.childNodes].find((nd) => nd.nodeType === 3 && nd.textContent.indexOf(w) !== -1) || sp.firstChild;
    const start = node.textContent.indexOf(w);
    const r = document.createRange();
    r.setStart(node, start); r.setEnd(node, start + w.length);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return { spanText: sp.textContent };
  }, [pageNo, word]);
}
// Select a word substring then replace it by typing (existing typing path).
async function replaceWordInPage(page, pageNo, oldWord, newWord) {
  const found = await page.evaluate(([pg, oldW]) => {
    const spans = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'))
      .filter((s) => parseInt(s.dataset.page, 10) === pg);
    const sp = spans.find((s) => (s.textContent || '').indexOf(oldW) !== -1);
    if (!sp) return null;
    const node = [...sp.childNodes].find((nd) => nd.nodeType === 3 && nd.textContent.indexOf(oldW) !== -1) || sp.firstChild;
    const start = node.textContent.indexOf(oldW);
    window.__selSpan = sp;
    window.__baseline = sp.textContent;
    const r = document.createRange();
    r.setStart(node, start); r.setEnd(node, start + oldW.length);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return true;
  }, [pageNo, oldWord]);
  if (!found) throw new Error('word not found on page ' + pageNo);
  await page.keyboard.press(newWord[0]);
  await sleep(120);
  if (newWord.length > 1) { await page.keyboard.type(newWord.slice(1)); await sleep(120); }
  await page.evaluate(() => { const sp = window.__selSpan; if (sp && sp.isContentEditable) sp.blur(); });
  await sleep(160);
  return await page.evaluate(() => ({
    baseline: window.__baseline || '', text: window.__selSpan ? window.__selSpan.textContent : ''
  }));
}
async function editedB64(page) {
  return await page.evaluate(async () => {
    const b = await window.__smartImport.editedBlob();
    const u = new Uint8Array(await b.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  });
}
// Load authored PDF bytes (b64) into the page and return getTextContent + meta.
async function inspectPdf(page, bytesB64) {
  return await page.evaluate(async (b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const pdfjs = window.pdfjsLib;
    const doc = await pdfjs.getDocument({ data: u8 }).promise;
    const out = { pages: doc.numPages, pageInfo: [], texts: [] };
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const vp = pg.getViewport({ scale: 1 });
      out.pageInfo.push({ w: Math.round(vp.width), h: Math.round(vp.height) });
      const tc = await pg.getTextContent();
      out.texts.push((tc.items || []).map((it) => it.str || '').join(' '));
    }
    await doc.destroy();
    return out;
  }, bytesB64);
}
// NODE-side: inflate a page's content stream (same pdf-lib + pako as the app).
async function streamOfPage(pdfBytes, pageIdx) {
  const doc = await pdfLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const c = doc.getPage(pageIdx).node.Contents();
  const parts = [];
  if (c && c.size) { for (let i = 0; i < c.size(); i++) parts.push(c.get(i)); } else parts.push(c);
  let raw = Buffer.alloc(0);
  for (const it of parts) {
    const ctx = doc.context.lookup(it);
    const b = ctx.getContents ? ctx.getContents() : ctx.contents;
    raw = Buffer.concat([raw, Buffer.from(b)]);
  }
  return pakoLib ? Buffer.from(pakoLib.inflate(raw)).toString('latin1') : raw.toString('latin1');
}

const fixturePath = path.join(ROOT, '__part41.pdf');
const round1Path = path.join(ROOT, '__part41_saved_round1.pdf');
await buildFixture(fixturePath);
console.log('fixture bytes', fs.statSync(fixturePath).size);

// ============ T) Toolbar: button + swatches exist ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  const ui = await page.evaluate(() => ({
    btn: !!document.getElementById('smartPdfTextColorBtn'),
    menu: !!document.getElementById('smartPdfColorMenu'),
    swatches: document.querySelectorAll('#smartPdfColorMenu .smart-pdf-color-swatch').length,
    colors: Array.from(document.querySelectorAll('#smartPdfColorMenu .smart-pdf-color-swatch')).map((s) => s.getAttribute('data-color')),
    menuHidden: document.getElementById('smartPdfColorMenu').hasAttribute('hidden')
  }));
  check('T1 Text Color button exists in the EXISTING PDF editor toolbar', ui.btn);
  check('T2 color menu exists, starts hidden', ui.menu && ui.menuHidden);
  check('T3 eight color swatches (Black Red Green Blue Orange Purple Yellow White)',
    ui.swatches === 8 && ['#000000', '#ff0000', '#008000', '#0000ff', '#ffa500', '#800080', '#ffff00', '#ffffff'].every((c) => ui.colors.includes(c)),
    JSON.stringify(ui.colors));
  check('T4 no JS errors (toolbar load)', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ============ A) Round 1: color "brown" RED, Save, verify REAL PDF color ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await importAndLoad(page, fixturePath);
  // No selection -> must NOT color anything, must show a toast instead.
  const noSel = await page.evaluate(() => window.__smartImport.textColor('#ff0000'));
  const toastShown = await page.evaluate(() => {
    const t = document.getElementById('toast');
    return !!t && ((t.textContent || '').length > 0 || t.classList.contains('show'));
  });
  check('A1 no selection -> color NOT applied (no random page coloring)', noSel === false, String(noSel));
  check('A2 no selection -> small toast asks to select text first', toastShown);

  const selInfo = await selectWord(page, 0, 'brown');
  check('A3 word "brown" selected in the text layer', !!selInfo && selInfo.spanText.indexOf('brown') !== -1, JSON.stringify(selInfo));
  const applied = await page.evaluate(() => window.__smartImport.textColor('#ff0000'));
  check('A4 color applied to the selection', applied === true);
  const preview = await page.evaluate(() => {
    const sp = Array.from(document.querySelectorAll('#smartPdfEditor .smart-pdf-text'))
      .find((s) => (s.textContent || '').indexOf('brown') !== -1);
    const cs = sp && sp.querySelector('.smart-pdf-colored');
    return {
      isEdited: !!(sp && sp.classList.contains('is-edited')),
      colored: cs ? cs.textContent : null,
      color: cs ? getComputedStyle(cs).color : null,
      stored: window.__smartImport.colors()
    };
  });
  check('A5 live preview paints exactly the selected word (same span, no new layer)',
    preview.isEdited && preview.colored === 'brown' && preview.color === 'rgb(255, 0, 0)', JSON.stringify(preview));
  check('A6 color range stored per text item (char offsets)',
    !!(preview.stored && preview.stored['0'] && preview.stored['0']['0'] &&
      preview.stored['0']['0'].some((r) => r.color === '#ff0000')), JSON.stringify(preview.stored));

  const b64a = await editedB64(page);
  const bytesA = Buffer.from(b64a, 'base64');
  check('A7 saved output is a real PDF (%PDF- magic)', bytesA.slice(0, 5).toString() === '%PDF-', 'bytes=' + bytesA.length);
  const insp = await inspectPdf(page, b64a);
  check('A8 text still REAL & selectable (pdf.js text contains "brown")', insp.texts[0].indexOf('brown') !== -1, insp.texts[0].slice(0, 70));
  check('A9 no duplicate text on the edited page (brown appears once)',
    (insp.texts[0].match(/brown/g) || []).length === 1, 'count=' + (insp.texts[0].match(/brown/g) || []).length);
  check('A10 page COUNT preserved (2 pages)', insp.pages === 2, 'pages=' + insp.pages);
  check('A11 page SIZE preserved (A4 both pages)', insp.pageInfo.every((p) => p.w === 595 && p.h === 842));
  check('A12 no JS errors (round 1)', errs.length === 0, errs.join(' | '));

  if (pakoLib) {
    const stream = await streamOfPage(bytesA, 0);
    console.log('STREAM>>>', stream.slice(0, 1200));
    const brownHex = Buffer.from('brown', 'latin1').toString('hex'); // hex-string operands
    const redIdx = stream.search(/1\s+0\s+0\s+rg/);
    const brownIdx = stream.indexOf('(brown)') !== -1 ? stream.indexOf('(brown)') : stream.indexOf(brownHex);
    check('A13 REAL content-stream color: `1 0 0 rg` emitted BEFORE the colored run',
      redIdx !== -1 && brownIdx !== -1 && redIdx < brownIdx, 'redIdx=' + redIdx + ' brownIdx=' + brownIdx);
    check('A14 original fill restored after the colored segment (no color leak)',
      /1\s+0\s+0\s+rg[\s\S]{0,160}?(Tj|TJ)[\s\S]{0,60}?(0 0 0 rg|0 g)/.test(stream.slice(redIdx >= 0 ? redIdx : 0)));
  } else {
    check('A13 REAL content-stream color (pako available in Node)', false, 'pako require failed');
  }
  fs.writeFileSync(round1Path, bytesA);
  await page.close();
}

// ============ B) Round 2: re-import, re-edit SAME word -> QUARK in BLUE ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await importAndLoad(page, round1Path);
  const insp0 = await inspectPdf(page, fs.readFileSync(round1Path).toString('base64'));
  check('B1 re-import: text still real & selectable (brown present)', insp0.texts[0].indexOf('brown') !== -1, insp0.texts[0].slice(0, 70));
  check('B2 re-import: page count still 2', insp0.pages === 2);
  // Edit the SAME word again (brown -> QUARK, existing typing path), then BLUE.
  const edited = await replaceWordInPage(page, 0, 'brown', 'QUARK');
  check('B3 same word re-edited in UI (no duplicate)', edited.text.indexOf('QUARK') !== -1, JSON.stringify({ t: edited.text.slice(0, 60) }));
  const sel = await selectWord(page, 0, 'QUARK');
  check('B4 QUARK selectable after re-edit', !!sel);
  const applied = await page.evaluate(() => window.__smartImport.textColor('#0000ff'));
  check('B5 blue applied to QUARK', applied === true);
  const colorsStored = await page.evaluate(() => window.__smartImport.colors());
  check('B6 stale red ranges cleared after text change; blue range stored',
    !!(colorsStored && colorsStored['0'] && colorsStored['0']['0'] &&
      colorsStored['0']['0'].length > 0 && colorsStored['0']['0'].every((r) => r.color === '#0000ff')), JSON.stringify(colorsStored));
  const b64b = await editedB64(page);
  const bytesB = Buffer.from(b64b, 'base64');
  const insp = await inspectPdf(page, b64b);
  check('B7 saved round 2 text: "The quick QUARK fox" as REAL text',
    insp.texts[0].indexOf('QUARK') !== -1 && insp.texts[0].indexOf('brown') === -1, insp.texts[0].slice(0, 70));
  check('B8 no duplicate text (QUARK once)', (insp.texts.join(' ').match(/QUARK/g) || []).length === 1);
  check('B9 not rasterized: untouched page still has REAL text items', insp.texts[1].trim().length > 0, insp.texts[1].slice(0, 50));
  check('B10 page size still preserved', insp.pageInfo.every((p) => p.w === 595 && p.h === 842));
  if (pakoLib) {
    const stream = await streamOfPage(bytesB, 0);
    const quarkHex = Buffer.from('QUARK', 'latin1').toString('hex');
    const blueIdx = stream.search(/0\s+0\s+1\s+rg/);
    const quarkIdx = stream.indexOf('(QUARK)') !== -1 ? stream.indexOf('(QUARK)') : stream.indexOf(quarkHex);
    check('B11 REAL blue color op `0 0 1 rg` before (QUARK)', blueIdx !== -1 && quarkIdx !== -1 && blueIdx < quarkIdx,
      'blueIdx=' + blueIdx + ' quarkIdx=' + quarkIdx);
    const brownHex = Buffer.from('brown', 'latin1').toString('hex');
    check('B12 no leftover "brown" in content stream',
      stream.indexOf('(brown)') === -1 && stream.indexOf(brownHex) === -1);
    check('B13 no image XObjects added by Text Color (no rasterization)', !/\/Subtype\s*\/Image/.test(stream));
  }
  check('B14 no JS errors (round 2)', errs.length === 0, errs.join(' | '));
  await page.close();
}

// ---- Summary ----
const failed = results.filter((r) => !r.ok).length;
console.log(`SUMMARY: ${results.length - failed}/${results.length} checks passed`);
browser.close().catch(() => {});
server.close(() => {});
try { fs.unlinkSync(fixturePath); } catch (e) {}
try { fs.unlinkSync(round1Path); } catch (e) {}
process.exit(failed ? 1 : 0);