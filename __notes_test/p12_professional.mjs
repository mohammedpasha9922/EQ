// PART 12 — Professional PDF from Notes. Real-browser behavioral harness.
// Page B (stub): html2pdf stub capturing src.outerHTML — verifies the generated
//   PDF DOM at the rasterize boundary, especially that tables stay REAL structured
//   <table><tr><td> with rows/cols/merges/borders/colors (never flattened image/divs).
// Page A (real): genuine html2pdf + pdf.js preview — verifies a real rendered PDF page.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const COMPANY_KEY = 'eq-history-company-name';
const LANG_KEY = 'eq-language';
const PORT = 8372;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
function check(name, ok, detail = '') {
  const line = `${ok ? 'PASS' : (detail === 'NV' ? 'NOTVER' : 'FAIL')}  ${name}${detail && detail !== 'NV' ? '  -> ' + detail : ''}`;
  LOG.push(line); console.log(line);
  if (ok) pass++; else if (detail === 'NV') notVerified++; else fail++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': mimeOf(f) + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

const page = await browser.newPage();
const realErrs = [];
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) realErrs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else realErrs.push('console: ' + m.text()); } });

const spage = await browser.newPage();
const stubErrs = [];
spage.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) stubErrs.push('pageerror: ' + e.message); else preexisting++; });
spage.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else stubErrs.push('console: ' + m.text()); } });
await spage.evaluateOnNewDocument(() => {
  window.__capturedHtml = '';
  window.html2pdf = function () {
    let src = null;
    const chain = {
      set() { return chain; }, from(el) { src = el; return chain; }, toPdf() { return chain; }, save() { return chain; }, output() {
        if (src) { try { window.__capturedHtml = src.outerHTML || ''; } catch (e) {} }
        return Promise.resolve(new Blob(['%PDF-1.5 stub-bytes'], { type: 'application/pdf' }));
      }
    };
    return chain;
  };
});
console.log('=== PART 12 — Professional PDF from Notes (table-first) ===');
const pixelData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

try {
const now = Date.now();
const mk = (text, fmt, extra) => Object.assign({ text, formatting: fmt || [] }, extra || {});
const notes = [
  { id: 'n-2x2', title: 'Two By Two', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 1000, updatedAt: now - 1000,
    bodyBlocks: [
      { type: 'text', body: 'A 2x2 table.', formatting: [] },
      { type: 'table', header: true, colWidths: [120, 180],
        rows: [
          [mk('Col A'), mk('Col B')],
          [mk('Alpha'), mk('Beta')],
          [mk('Gamma'), mk('Delta')]
        ] }
    ] },
  { id: 'n-3x3', title: 'Three By Three', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 2000, updatedAt: now - 2000,
    bodyBlocks: [
      { type: 'table', header: true,
        rows: [
          [mk('H1'), mk('H2'), mk('H3')],
          [mk('a'), mk('b'), mk('c')],
          [mk('d'), mk('e'), mk('f')],
          [mk('g'), mk('h'), mk('i')]
        ] }
    ] },
  { id: 'n-4x5', title: 'Four By Five', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 3000, updatedAt: now - 3000,
    bodyBlocks: [
      { type: 'table', header: true,
        rows: [
          [mk('C1'), mk('C2'), mk('C3'), mk('C4'), mk('C5')],
          [mk('r1c1'), mk('r1c2'), mk('r1c3'), mk('r1c4'), mk('r1c5')],
          [mk('r2c1'), mk('r2c2'), mk('r2c3'), mk('r2c4'), mk('r2c5')],
          [mk('r3c1'), mk('r3c2'), mk('r3c3'), mk('r3c4'), mk('r3c5')],
          [mk('r4c1'), mk('r4c2'), mk('r4c3'), mk('r4c4'), mk('r4c5')]
        ] }
    ] },
  { id: 'n-custom', title: 'Custom Table', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 4000, updatedAt: now - 4000,
    bodyBlocks: [
      { type: 'table', header: true, borderStyle: 'inside', colWidths: [100, 160, 90],
        rows: [
          [mk('Name', [], { alignH: 'center', backgroundColor: '#e2e8f0' }), mk('Value', [], { alignH: 'center' }), mk('Note', [], { alignH: 'center' })],
          [mk('Alpha'), mk('42', [], { alignH: 'right' }), mk('short')],
          [mk('Beta'), mk('17', [], { alignH: 'right' }), mk('text')]
        ] }
    ] },
  { id: 'n-merge', title: 'Merged Cells', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 5000, updatedAt: now - 5000,
    bodyBlocks: [
      { type: 'table', header: true,
        rows: [
          [mk('Header Merged', [], { colSpan: 3 })],
          [mk('Left'), mk('Middle'), mk('Right')],
          [mk('R2a'), mk('R2b'), mk('R2c')]
        ] }
    ] },
  { id: 'n-long', title: 'Long Table', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 6000, updatedAt: now - 6000,
    bodyBlocks: [
      { type: 'table', header: true,
        rows: Array.from({ length: 40 }, (_, r) => [
          mk('Row' + r + 'A'), mk('Row' + r + 'B'), mk('The quick brown fox jumps over the lazy dog. ' + 'Padding. '.repeat(6))
        ]) }
    ] },
  { id: 'n-multi', title: 'Multiple Tables', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 7000, updatedAt: now - 7000,
    bodyBlocks: [
      { type: 'text', body: 'Table one:', formatting: [] },
      { type: 'table', header: true, rows: [[mk('1'), mk('2')], [mk('a'), mk('b')]] },
      { type: 'divider' },
      { type: 'text', body: 'Table two:', formatting: [] },
      { type: 'table', header: false, rows: [[mk('x'), mk('y')], [mk('p'), mk('q')]] }
    ] },
{ id: 'n-imgtbl', title: 'Image And Table', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 8000, updatedAt: now - 8000,
    bodyBlocks: [
      { type: 'image', src: pixelData, alt: 'pix', width: 150, align: 'center' },
      { type: 'table', header: true, rows: [[mk('A'), mk('B')], [mk('1'), mk('2')]] },
      { type: 'image', src: pixelData, alt: 'pix2', width: 90, align: 'left' }
    ] },
  { id: 'n-chktbl', title: 'Checklist And Table', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 9000, updatedAt: now - 9000,
    bodyBlocks: [
      { type: 'checklist', items: [{ text: 'do this', checked: true }, { text: 'do that', checked: false }] },
      { type: 'table', header: true, rows: [[mk('Task'), mk('Done')], [mk('a'), mk('y')], [mk('b'), mk('n')]] }
    ] },
  { id: 'n-headtbl', title: 'Heading And Table', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 10000, updatedAt: now - 10000,
    bodyBlocks: [
      { type: 'text', body: 'Heading One', formatting: [{ start: 0, end: 11, heading: 1 }] },
      { type: 'text', body: 'Heading Two', formatting: [{ start: 0, end: 11, heading: 2 }] },
      { type: 'text', body: 'Heading Three', formatting: [{ start: 0, end: 13, heading: 3 }] },
      { type: 'table', header: true, rows: [[mk('C'), mk('D')], [mk('e'), mk('f')]] }
    ] },
  { id: 'n-rtl', title: 'RTL Arabic Table', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 11000, updatedAt: now - 11000,
    bodyBlocks: [
      { type: 'text', body: 'جدول عربي', formatting: [] },
      { type: 'table', header: true, rows: [[mk('الاسم'), mk('القيمة')], [mk('ألفا'), mk('42')], [mk('بيتا'), mk('17')]] }
    ] },
  { id: 'n-para', title: 'Long Paragraphs', body: '', bodyFormatting: [], folderId: 'personal', createdAt: now - 12000, updatedAt: now - 12000,
    bodyBlocks: [
      { type: 'text', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(8), formatting: [] },
      { type: 'table', header: true, rows: [[mk('a'), mk('b')], [mk('c'), mk('d')]] },
      { type: 'text', body: 'Sed do eiusmod tempor incididunt. '.repeat(8), formatting: [] }
    ] }
];
const seed = async (pg) => {
  await pg.evaluate((k, n) => localStorage.setItem(k, JSON.stringify(n)), STORAGE_KEY, notes);
  await pg.evaluate((f) => localStorage.setItem(f, JSON.stringify([{ id: 'personal', name: 'Personal' }])), FOLDERS_KEY);
  await pg.evaluate((c) => localStorage.removeItem(c), COMPANY_KEY);
  await pg.evaluate((l) => localStorage.setItem(l, 'en'), LANG_KEY);
};
async function gotoApp(pg) { await pg.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(500); }
async function openNotes(pg) {
  await pg.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
  await pg.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await pg.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(300);
}
async function openNote(pg, title) {
  await openNotes(pg);
  await pg.evaluate((t) => { const items = Array.from(document.querySelectorAll('#notesList .note-item')); const it = items.find((i) => i.textContent.includes(t)); if (it) it.click(); }, title);
  await pg.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(400);
}
async function openExportDialog(pg) {
  await pg.evaluate(() => { const b = document.getElementById('exportNotePdfBtn'); if (b) b.click(); });
  await pg.waitForSelector('#noteExportPdfModal.show', { visible: true, timeout: 6000 });
  await sleep(300);
}
async function closeEditor(pg) { await pg.evaluate(() => { const b = document.getElementById('closeFullScreenNote'); if (b) b.click(); }); await sleep(300); }
async function waitForCanvas(pg) {
  for (let i = 0; i < 150; i++) { await sleep(250); const ok = await pg.evaluate(() => { const c = document.querySelector('#notePdfPreviewModal canvas'); return !!(c && c.width >= 500); }); if (ok) return true; }
  return false;
}
console.log('--- Page B: PDF DOM (stub capture) — tables must stay REAL ---');
await spage.setViewport({ width: 1366, height: 900 });
await gotoApp(spage); await seed(spage); await spage.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(400);
// Snapshot of the stored note BEFORE any export (used by the data-integrity check).
// Captured AFTER seed+reload so it reflects the app's load-normalized form; both
// sides undergo the same canonicalization so only export-induced mutations are
// detected (not app load/normalization differences).
const storedBeforeRaw = await spage.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
const canon = (v) => (Array.isArray(v) ? v.map(canon) : (v && typeof v === 'object' ? Object.keys(v).sort().reduce((o, k2) => { o[k2] = canon(v[k2]); return o; }, {}) : v));
const storedBeforeBlocks = canon(storedBeforeRaw);

async function runCreate(pg, title, style) {
  await openNote(pg, title);
  await openExportDialog(pg);
  await pg.evaluate((s) => { const st = document.getElementById('noteExportStyle'); if (st && s) st.value = s; }, style);
  await sleep(200);
  await pg.evaluate(() => { window.__capturedHtml = ''; });
  await pg.evaluate(() => { const b = document.getElementById('noteExportCreateBtn'); if (b) b.click(); });
  for (let i = 0; i < 40; i++) { await sleep(150); const has = await pg.evaluate(() => (window.__capturedHtml || '').length > 10); if (has) break; }
  const h = await pg.evaluate(() => window.__capturedHtml || '');
  await closeEditor(pg);
  return h;
}

function tableMeta(h) {
  const tables = [];
  const re = /<table[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = re.exec(h))) tables.push(m[1]);
  return tables.map((t) => ({
    ths: (t.match(/<th[\s>]/g) || []).length,
    tds: (t.match(/<td[\s>]/g) || []).length,
    trs: (t.match(/<tr[\s>]/g) || []).length,
    thead: /<thead/.test(t),
    cols: (t.match(/<col\b/g) || []).length,
    colspans: (t.match(/colspan=/g) || []).length,
    rowspans: (t.match(/rowspan=/g) || []).length,
    bg: (t.match(/background-color:/g) || []).length,
    align: (t.match(/text-align:/g) || []).length,
    rtl: (t.match(/dir="rtl"/g) || []).length,
    textLen: t.replace(/<[^>]+>/g, '').trim().length
  }));
}
async function exportAndMeta(title, style) {
  const h = await runCreate(spage, title, style);
  return { h, meta: tableMeta(h) };
}

const t22 = await exportAndMeta('Two By Two', 'engineering');
check('2x2: PDF has REAL <table>', /<table class="eq-pdf-note-table/.test(t22.h), '');
check('2x2: rows (header+2 body = 3 <tr>)', t22.meta.length && t22.meta[0].trs === 3, 'trs=' + (t22.meta[0] && t22.meta[0].trs));
check('2x2: columns (2 <col>)', t22.meta.length && t22.meta[0].cols === 2, 'cols=' + (t22.meta[0] && t22.meta[0].cols));
check('2x2: header is real <thead>', t22.meta.length && t22.meta[0].thead, 'thead=' + (t22.meta[0] && t22.meta[0].thead));
check('2x2: cell text present', t22.meta.length && t22.meta[0].textLen > 0, 'textLen=' + (t22.meta[0] && t22.meta[0].textLen));

const t33 = await exportAndMeta('Three By Three', 'academic');
check('3x3: rows (1 header + 3 body = 4)', t33.meta.length && t33.meta[0].trs === 4, 'trs=' + (t33.meta[0] && t33.meta[0].trs));
check('3x3: columns (3)', t33.meta.length && t33.meta[0].cols === 3, 'cols=' + (t33.meta[0] && t33.meta[0].cols));
check('3x3: academic style class on report', /note-style-academic/.test(t33.h), '');

const t45 = await exportAndMeta('Four By Five', 'simple');
check('4x5: rows (1 header + 4 body = 5)', t45.meta.length && t45.meta[0].trs === 5, 'trs=' + (t45.meta[0] && t45.meta[0].trs));
check('4x5: columns (5)', t45.meta.length && t45.meta[0].cols === 5, 'cols=' + (t45.meta[0] && t45.meta[0].cols));
check('4x5: cells total = 25', t45.meta.length && (t45.meta[0].ths + t45.meta[0].tds) === 25, 'cells=' + (t45.meta[0] && (t45.meta[0].ths + t45.meta[0].tds)));
const tm = await exportAndMeta('Merged Cells', 'modern');
check('Merge: colspan emitted in PDF', tm.meta.length && tm.meta[0].colspans >= 1, 'colspans=' + (tm.meta[0] && tm.meta[0].colspans));
check('Merge: header colspan=3', /colspan="3"/.test(tm.h), '');
check('Merge: rows preserved (3)', tm.meta.length && tm.meta[0].trs === 3, 'trs=' + (tm.meta[0] && tm.meta[0].trs));

const tl = await exportAndMeta('Long Table', 'engineering');
check('Long table: header <thead> (repeats on pages)', tl.meta.length && tl.meta[0].thead, 'thead=' + (tl.meta[0] && tl.meta[0].thead));
check('Long table: all 40 rows in PDF DOM (1 header + 39 body)', tl.meta.length && tl.meta[0].trs === 40, 'trs=' + (tl.meta[0] && tl.meta[0].trs));
check('Long table: long text present', tl.meta.length && tl.meta[0].textLen > 300, 'textLen=' + (tl.meta[0] && tl.meta[0].textLen));

const tmulti = await exportAndMeta('Multiple Tables', 'simple');
check('Multiple tables: exactly 2 <table> in PDF', (tmulti.h.match(/<table class="eq-pdf-note-table"/g) || []).length === 2, 'count=' + (tmulti.h.match(/<table class="eq-pdf-note-table"/g) || []).length);
check('Multiple tables: divider preserved between', tmulti.h.includes('eq-pdf-divider'), '');

const tit = await exportAndMeta('Image And Table', 'simple');
check('Image+table: image preserved', tit.h.includes('eq-pdf-image') && tit.h.includes('data:image/png'), '');
check('Image+table: table preserved (real <table>)', tit.h.includes('<table class="eq-pdf-note-table"'), '');
check('Image+table: image width 150px', /width:\s*150px/.test(tit.h), '');
check('Image+table: 2nd image 90px', /width:\s*90px/.test(tit.h), '');

const tct = await exportAndMeta('Checklist And Table', 'academic');
check('Checklist+table: checklist preserved', tct.h.includes('eq-pdf-check-item'), '');
check('Checklist+table: table preserved', tct.h.includes('<table class="eq-pdf-note-table"'), '');

const tth = await exportAndMeta('Heading And Table', 'academic');
check('Heading+table: body H1 preserved (header brand <h1> + body <h1>)', (tth.h.match(/<h1>/g) || []).length >= 2, 'h1count=' + (tth.h.match(/<h1>/g) || []).length);
check('Heading+table: body H2 preserved', /<h2>/.test(tth.h), '');
check('Heading+table: body H3 preserved', /<h3>/.test(tth.h), '');
check('Heading+table: table preserved', tth.h.includes('<table class="eq-pdf-note-table"'), '');

const trtl = await exportAndMeta('RTL Arabic Table', 'simple');
check('RTL: Arabic cell dir=rtl', trtl.meta.length && trtl.meta[0].rtl >= 1, 'rtl=' + (trtl.meta[0] && trtl.meta[0].rtl));
check('RTL: Arabic text present', trtl.meta.length && trtl.meta[0].textLen > 0, 'textLen=' + (trtl.meta[0] && trtl.meta[0].textLen));

const tpara = await exportAndMeta('Long Paragraphs', 'simple');
check('Long paragraphs: text before+after preserved', (tpara.h.match(/Lorem ipsum/g) || []).length >= 2, 'count=' + (tpara.h.match(/Lorem ipsum/g) || []).length);
check('Long paragraphs: table preserved between', tpara.h.includes('<table class="eq-pdf-note-table"'), '');

check('Style engineering applied to PDF', /note-style-engineering/.test((await exportAndMeta('Two By Two', 'engineering')).h), '');
check('Style business applied to PDF', /note-style-business/.test((await exportAndMeta('Two By Two', 'business')).h), '');
check('Style modern applied to PDF', /note-style-modern/.test((await exportAndMeta('Two By Two', 'modern')).h), '');
check('Style academic applied to PDF', /note-style-academic/.test((await exportAndMeta('Two By Two', 'academic')).h), '');
check('Style simple applied to PDF', /note-style-simple/.test((await exportAndMeta('Two By Two', 'simple')).h), '');

const stubStore = await spage.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
const cur2x2 = stubStore.find((n) => n.id === 'n-2x2');
// Semantic comparison (key-order-insensitive): stored BEFORE any export vs stored AFTER
// all exports — isolates export-induced mutation from app load/normalization.
const beforeBlocks = canon(storedBeforeBlocks.find((n) => n.id === 'n-2x2').bodyBlocks);
const afterBlocks = canon(cur2x2.bodyBlocks);
check('Data integrity: table bodyBlocks unchanged (read-only export)', JSON.stringify(beforeBlocks) === JSON.stringify(afterBlocks), 'eq=' + (JSON.stringify(beforeBlocks) === JSON.stringify(afterBlocks)));
check('Data integrity: title unchanged', !!cur2x2 && cur2x2.title === 'Two By Two', 'title=' + (cur2x2 && cur2x2.title));

console.log('--- Page A: real html2pdf + pdf.js preview ---');
console.log('--- Page A: real html2pdf + pdf.js preview ---');
await page.setViewport({ width: 1366, height: 900 });
await gotoApp(page); await seed(page); await page.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(400);
async function previewCanvas(title) {
  await openNote(page, title);
  await openExportDialog(page);
  await page.evaluate(() => { const b = document.getElementById('noteExportPreviewBtn'); if (b) b.click(); });
  const ok = await waitForCanvas(page);
  const dims = await page.evaluate(() => { const c = document.querySelector('#notePdfPreviewModal canvas'); return c ? c.width + 'x' + c.height : 'none'; });
  return { ok, dims };
}
for (const t of ['Two By Two', 'Three By Three', 'Four By Five', 'Custom Table', 'Merged Cells', 'Long Table', 'Image And Table', 'Checklist And Table', 'Heading And Table', 'RTL Arabic Table']) {
  const r = await previewCanvas(t);
  check('Real preview rendered canvas: ' + t, r.ok, 'dims=' + r.dims);
  await page.evaluate(() => { const c = document.getElementById('notePdfPreviewClose'); if (c) c.click(); });
  await sleep(300);
  await closeEditor(page);
}

console.log('--- Responsive: export flow stays usable ---');
for (const w of [1366, 768, 430, 390]) {
  await page.setViewport({ width: w, height: 900 }); await sleep(150);
  await openNote(page, 'Two By Two');
  await openExportDialog(page);
  const ov = await page.evaluate(() => {
    const m = document.getElementById('noteExportPdfModal');
    const r = m ? m.getBoundingClientRect() : null;
    const docW = document.documentElement.clientWidth;
    return { inside: !!r && r.left >= -1 && r.right <= docW + 1, docW: Math.round(docW) };
  });
  check('Responsive ' + w + ': export dialog inside viewport', ov.inside, JSON.stringify(ov));
  await page.evaluate(() => { const c = document.getElementById('noteExportPdfClose'); if (c) c.click(); });
  await sleep(200);
  await closeEditor(page);
}
await page.setViewport({ width: 1366, height: 900 });

await page.evaluate((l) => localStorage.setItem(l, 'ar'), LANG_KEY);
await page.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(400);
check('RTL: Arabic sets dir=rtl', await page.evaluate(() => document.documentElement.getAttribute('dir')) === 'rtl', '');
await openNote(page, 'RTL Arabic Table');
await openExportDialog(page);
const rtl = await page.evaluate(() => {
  const m = document.getElementById('noteExportPdfModal');
  return { d: m ? m.getAttribute('dir') : null, vis: !!m && m.classList.contains('show') };
});
check('RTL: export dialog dir=rtl + visible', rtl.vis && rtl.d === 'rtl', JSON.stringify(rtl));
await page.evaluate(() => { const c = document.getElementById('noteExportPdfClose'); if (c) c.click(); });
await sleep(200);
await closeEditor(page);
await page.evaluate((l) => localStorage.setItem(l, 'en'), LANG_KEY);

check('Console: no new errors from PART 12 (real page)', realErrs.length === 0, JSON.stringify(realErrs.slice(0, 4)));
check('Console: no new errors from PART 12 (stub page)', stubErrs.length === 0, JSON.stringify(stubErrs.slice(0, 4)));
} catch (topErr) {
  check('Runtime completed without top-level error', false, String((topErr && topErr.message) || topErr));
}

try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
const res = { pass, fail, not_verified: notVerified, preexisting, total: pass + fail + notVerified };
console.log('RESULTS_JSON=' + JSON.stringify(res));
LOG.push('RESULTS_JSON=' + JSON.stringify(res));
try { fs.writeFileSync(path.join(HERE, 'p12_results.txt'), LOG.join('\n') + '\n', 'utf8'); } catch (e) {}
process.exit(fail > 0 ? 1 : 0);
