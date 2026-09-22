// PART 40 — SMART DOCUMENTS: TRUE PDF content editing (part of PART 5e).
// Proves Save now modifies the REAL PDF content streams (pdf-lib + pako), so
// the output is a genuine PDF whose edited text is selectable/searchable via
// pdf.js getTextContent — NOT a flattened image and NOT an HTML overlay.
// Also proves: multi-page isolation, re-import/re-edit, unchanged page
// count/size, and preserved untouched pages.
// Run:  node tests/part40_smart_pdf_true_editing.test.mjs
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
const PORT = 8351;
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

// Build a REAL 2-page PDF fixture with pdf-lib (genuine selectable text).
const pdfLib = require2(path.join(ROOT, '__pdfdiag/vendor/pdf-lib.min.js'));
async function buildFixture(pathOut) {
  const doc = await pdfLib.PDFDocument.create();
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  const p1 = doc.addPage([595.28, 841.89]);
  p1.drawText('Quarterly Business Report', { x: 72, y: 770, size: 20, font });
  p1.drawText('The quick brown fox jumps over the lazy dog', { x: 72, y: 700, size: 12, font });
  p1.drawText('Second line of PDF text lives here now', { x: 72, y: 680, size: 12, font });
  const p2 = doc.addPage([595.28, 841.89]);
  p2.drawText('Appendix Notes', { x: 72, y: 770, size: 18, font });
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
// Select a word substring inside the correct page's text span, then replace by typing.
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
async function editedB64(page) {
  return await page.evaluate(async () => {
    const b = await window.__smartImport.editedBlob();
    const u = new Uint8Array(await b.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  });
}
const fixturePath = path.join(ROOT, '__part40.pdf');
const savedDir = path.join(ROOT, '__part40_saved');
await fs.promises.mkdir(savedDir, { recursive: true });
await buildFixture(fixturePath);
console.log('fixture bytes', fs.statSync(fixturePath).size);
// ============ A) TRUE edit on page 1: brown -> QUARK ============
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await importAndLoad(page, fixturePath);
  const edited = await replaceWordInPage(page, 0, 'brown', 'QUARK');
  check('A1 span edited in UI (line rewritten with new word)',
    edited.text.indexOf('QUARK') !== -1 && edited.text.indexOf('brown') === -1,
    JSON.stringify({ t: edited.text.slice(0, 60), base: edited.baseline.slice(0, 40) }));
  const b64a = await editedB64(page);
  const bytesA = Buffer.from(b64a, 'base64');
  check('A2 saved output is a real PDF (%PDF- magic)', bytesA.slice(0, 5).toString() === '%PDF-', 'bytes=' + bytesA.length);

  const insp = await inspectPdf(page, b64a);
  check('A3 page COUNT preserved (2 pages)', insp.pages === 2, 'pages=' + insp.pages);
  check('A4 page SIZE preserved (595x842 A4 on both pages)',
    insp.pageInfo.every((p) => p.w === 595 && p.h === 842), JSON.stringify(insp.pageInfo));
  const p0 = insp.texts[0];
  check('A5 NEW text present as REAL pdf.js text on page 0', p0.indexOf('QUARK') !== -1, p0.slice(0, 70));
  check('A6 OLD text REMOVED from content stream (no "brown" on edited page)',
    p0.indexOf('brown') === -1, p0.slice(0, 70));
  check('A7 untouched page 1 still intact (still has "brown")',
    insp.texts[1].indexOf('brown') !== -1, insp.texts[1].slice(0, 50));
  check('A8 no duplicate text (QUARK appears once)', (p0.match(/QUARK/g) || []).length === 1);
  check('A9 not flattened: page returns REAL text items (>0)', insp.texts.every((t) => t.trim().length > 0));
  check('A10 no JS errors', errs.length === 0, errs.join(' | '));
  fs.writeFileSync(path.join(savedDir, 'round1.pdf'), bytesA);

  // ============ B) RE-IMPORT the saved PDF and re-edit the SAME line ============
  const savedPath = path.join(savedDir, 'round1.pdf');
  await page.evaluate(() => { if (window.__smartImport) window.__smartImport.reset(); });
  await sleep(300);
  await importAndLoad(page, savedPath);
  const edited2 = await replaceWordInPage(page, 0, 'QUARK', 'leaps');
  check('B1 second edit applied in UI', edited2.text.indexOf('leap') !== -1, JSON.stringify({ t: edited2.text.slice(0, 60) }));
  const b64B = await editedB64(page);
  const insp2 = await inspectPdf(page, b64B);
  check('B2 re-open page count still 2', insp2.pages === 2, 'pages=' + insp2.pages);
  check('B3 no OVERLAY piles: edited line has new word, no leftover old words',
    insp2.texts[0].indexOf('QUARK') === -1 && insp2.texts[0].indexOf('brown') === -1 &&
      insp2.texts[0].indexOf('leap') !== -1, insp2.texts[0].slice(0, 80));
  check('B4 untouched page 1 still intact after round 2', insp2.texts[1].indexOf('brown') !== -1);
  check('B5 page size still preserved', insp2.pageInfo.every((p2) => p2.w === 595 && p2.h === 842));
  check('B6 no JS errors (re-edit)', errs.length === 0, errs.join(' | '));
}
// ---- Summary ----
const failed = results.filter((r) => !r.ok).length;
console.log(`SUMMARY: ${results.length - failed}/${results.length} checks passed`);
browser.close().catch(() => {});
server.close(() => {});
try { fs.unlinkSync(fixturePath); } catch (e) {}
try { fs.rmSync(savedDir, { recursive: true, force: true }); } catch (e) {}
try { fs.unlinkSync('__part40_saved/round1.pdf'); } catch (e) {}
process.exit(failed ? 1 : 0);