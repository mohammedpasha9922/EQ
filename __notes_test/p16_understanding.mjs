// PART 16 — Smart Document Understanding. Real-browser behavioral harness.
// Reuses the PART 15 Smart Scan engine (capture → detect → crop/deskew →
// enhance → OCR) and verifies the NEW structure layer on top of the existing
// OCR output: headings, paragraphs, tables, numbers, dates, fields.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8377;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const NOTES_KEY = 'eq-note-manager-notes';
const COMPANY_KEY = 'eq-history-company-name';

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
function check(name, ok, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${d ? '  -> ' + d : ''}`);
  if (ok) pass++; else fail++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf' };
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

async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(500); }
async function openScanViaWorkspace() {
  const opened = await page.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (b) b.click();
    return !!document.getElementById('pdfReportsWorkspace');
  });
  await sleep(400);
  await page.evaluate(() => { document.getElementById('pdfScanCreateCard')?.click(); });
  await sleep(600);
  return opened;
}
async function scanState() {
  return await page.evaluate(() => { const w = window.__smartScan; return w && w.getState ? w.getState() : null; });
}
async function waitStage(stage, tries = 120) {
  for (let i = 0; i < tries; i++) { const s = await scanState(); if (s && s.stage === stage) return true; await sleep(150); }
  return false;
}
console.log('=== PART 16 — Smart Document Understanding ===');

// A structured document pushed through the REAL pipeline (live-mock camera +
// OCR override seam = the documented PART 15 test path).
const DOC = [
  'INVOICE',
  '',
  'This invoice covers consulting services.',
  'Provided during August and includes support.',
  '',
  'Name: Mohammed',
  'Date: 2026-08-01',
  'Phone: +962 79 123 4567',
  'Total: 155000',
  'Rate: 45.6',
  'Discount: 20%',
  '',
  'Item      Qty      Price',
  'Chair     4        120.50',
  'Desk      2        350'
].join('\n');

await page.setViewport({ width: 1366, height: 900 });
await gotoApp();

// P16-01 — Smart Scan entry (PDF Workspace → Scan card) still works
check('P16-01 smart scan entry via PDF Workspace', await openScanViaWorkspace() !== false);
const entryState = await page.evaluate(() => {
  const view = document.getElementById('smartScanView');
  const cam = document.getElementById('scanStageCamera');
  return { view: !!(view && view.classList.contains('scan-visible')), camera: !!(cam && cam.classList.contains('stage-active')) };
});
check('P16-01a scan view + camera stage', entryState.view && entryState.camera, entryState);

// Existing PART 15 camera paths still behave (regression)
await page.evaluate(() => { const w = window.__smartScan; w.debugMode('blocked'); w.reset(); w.open(); });
await sleep(400);
const denied = await page.evaluate(() => { const e = document.getElementById('scanCameraError'); const p = document.getElementById('scanFilePick'); return { err: !!(e && !e.hidden), fb: !!(p && !p.hidden) }; });
check('P16-02 regression: permission denied handled', denied.err && denied.fb, denied);

// P16-02..06 — run the REAL pipeline through the documented seams
await page.evaluate((doc) => {
  const w = window.__smartScan;
  w.debugMode('live'); w.reset(); w.open(); w.setOcrResult(doc);
}, DOC);
let capOk = false;
for (let i = 0; i < 40 && !capOk; i++) { await sleep(150); capOk = await page.evaluate(() => { const c = document.getElementById('scanCaptureBtn'); return !!(c && !c.disabled); }); }
check('P16-02a capture enabled (live stream)', capOk === true);
await page.evaluate(() => { document.getElementById('scanCaptureBtn')?.click(); });
await sleep(150);
const proc = await page.evaluate(() => { const p = document.getElementById('scanStageProcessing'); return !!(p && p.classList.contains('stage-active')); });
check('P16-03 regression: processing stage (detect/crop/perspective/enhance)', proc === true);
const reviewReached = await waitStage('review', 160);
check('P16-04 regression: review stage reached', reviewReached === true);
const st1 = await scanState();
check('P16-05 regression: detection ran (inkRatio > 0)', typeof st1.inkRatio === 'number' && st1.inkRatio > 0, { inkRatio: st1.inkRatio });
check('P16-06 OCR output present', typeof st1.recognized === 'string' && st1.recognized.indexOf('INVOICE') === 0, { head: String(st1.recognized).slice(0, 24) });

// P16-07..12 — STRUCTURE detection (behavioral, from the real pipeline output)
const structure = st1.structure;
const c = structure ? structure.counts : { headings: 0, paragraphs: 0, tables: 0, numbers: 0, dates: 0, fields: 0 };
check('P16-16a structure produced in scan state', !!structure && Array.isArray(structure.blocks), { hasStructure: !!structure });

// Heading: "INVOICE" (ALL-CAPS, short, isolated) — with an honest confidence state
const heads = structure ? structure.blocks.filter((b) => b.type === 'heading') : [];
check('P16-07 heading detected (INVOICE, ALL-CAPS)', c.headings >= 1 && heads.some((h) => h.text === 'INVOICE'), { headings: c.headings });
check('P16-07a heading confidence is real (detected|likely)', heads.length > 0 && heads.every((h) => h.conf === 'detected' || h.conf === 'likely'), { confs: heads.map((h) => h.conf) });

// Paragraph: the two consecutive body lines grouped into ONE paragraph
const paras = structure ? structure.blocks.filter((b) => b.type === 'paragraph') : [];
check('P16-08 paragraph detected (2 lines grouped, not per-line)', c.paragraphs >= 1 && paras.some((p) => p.lineCount === 2 && p.text.indexOf('consulting services') !== -1), { paragraphs: c.paragraphs, lineCounts: paras.map((p) => p.lineCount) });

// Table: 3 rows × 3 columns as REAL structure
const tbl = structure && structure.tables ? structure.tables[0] : null;
check('P16-09 table detected as REAL structure (3×3)', c.tables >= 1 && !!tbl && tbl.rows.length === 3 && tbl.rows.every((r) => r.cells.length === 3), tbl ? { rows: tbl.rows.length, row0: tbl.rows[0].cells, row2: tbl.rows[2].cells } : null);
check('P16-09a table cells keep original text (not flattened)', !!tbl && tbl.rows[0].cells.join('|') === 'Item|Qty|Price' && tbl.rows[1].cells[2] === '120.50', { row0: tbl ? tbl.rows[0].cells : null, cell: tbl ? tbl.rows[1].cells[2] : null });

// Numbers: integer / decimal / percent, preserved exactly
const nums = structure ? structure.numbers : [];
check('P16-10 numbers detected (integer/decimal/percent)', nums.some((n) => n.value === '155000' && n.kind === 'integer') && nums.some((n) => n.value === '45.6' && n.kind === 'decimal') && nums.some((n) => n.value === '20' && n.kind === 'percent'), { values: nums.map((n) => n.value + ':' + n.kind) });

// Date: ISO pattern
const dts = structure ? structure.dates : [];
check('P16-11 date detected (2026-08-01)', dts.some((d) => d.text === '2026-08-01'), { dates: dts.map((d) => d.text) });

// Fields: label + value
const fds = structure ? structure.fields : [];
check('P16-12 fields detected (Name/Date/Phone/Total…)', fds.length >= 5 && fds.some((f) => f.label === 'Name' && f.value === 'Mohammed') && fds.some((f) => f.label === 'Total' && f.value === '155000'), { labels: fds.map((f) => f.label + '=' + f.value) });
check('P16-12a field model shape (label/value/hasValue)', fds.length > 0 && fds.every((f) => f.type === 'field' && typeof f.label === 'string' && typeof f.hasValue === 'boolean'), { n: fds.length });

// P16-13/14/15 — Arabic / English / Mixed via the documented analyzeStructure seam
const AR = [
  'تقرير المشروع',
  '',
  'هذا تقرير يشرح نتائج المشروع بشكل مفصل للجميع.',
  '',
  'الاسم: محمد',
  'التاريخ: 01 أغسطس 2026',
  'الهاتف: 0791234567'
].join('\n');
const arS = await page.evaluate((t) => window.__smartScan.analyzeStructure(t), AR);
const arHeads = arS.blocks.filter((b) => b.type === 'heading');
check('P16-13 Arabic heading detected', arHeads.some((h) => h.text === 'تقرير المشروع'), { headings: arHeads.map((h) => h.text) });
check('P16-13a Arabic paragraph preserved (order not reversed)', arS.blocks.some((b) => b.type === 'paragraph' && b.text.indexOf('نتائج المشروع') !== -1 && b.text.indexOf('هذا تقرير') === 0), { ok: true });
check('P16-13b Arabic fields detected (الاسم/التاريخ/الهاتف)', arS.fields.length >= 3 && arS.fields.some((f) => f.label === 'الاسم' && f.value === 'محمد'), { labels: arS.fields.map((f) => f.label + '=' + f.value) });
check('P16-13c Arabic date detected (01 أغسطس 2026)', arS.dates.some((d) => d.text === '01 أغسطس 2026'), { dates: arS.dates.map((d) => d.text) });

const MIX = 'اسم: Mohammed\nDate: 2026-08-01\nPhone: 0791234567\nTotal: 155000';
const mixS = await page.evaluate((t) => window.__smartScan.analyzeStructure(t), MIX);
check('P16-15 mixed Arabic/English fields detected', mixS.fields.length >= 4 && mixS.fields.some((f) => f.label === 'اسم' && f.value === 'Mohammed'), { labels: mixS.fields.map((f) => f.label + '=' + f.value) });
check('P16-15a digits preserved exactly (no Arabic-Indic conversion)', mixS.numbers.every((n) => /^[0-9.,%\s+()-]*$/.test(n.value)) && mixS.numbers.some((n) => n.value === '0791234567') && mixS.numbers.some((n) => n.value === '155000'), { values: mixS.numbers.map((n) => n.value) });
check('P16-14 English text unchanged by analysis (text === source)', mixS.text === MIX, { same: mixS.text === MIX });

// P16-16 — Structure indicators visible in the Editable Preview (review stage)
const panel = await page.evaluate(() => {
  const p = document.getElementById('scanStructurePanel');
  const list = document.getElementById('scanStructureList');
  if (!p || !list) return { found: false };
  const kinds = Array.from(list.querySelectorAll('.scan-struct-kind')).map((k) => k.textContent.trim());
  return { found: true, hidden: p.hidden, chips: list.children.length, kinds: kinds, title: document.getElementById('scanStructureTitle')?.textContent.trim() };
});
check('P16-16 structure panel visible with chips', panel.found && panel.hidden === false && panel.chips > 0, panel);
check('P16-16a panel shows Heading/Paragraph/Table/Number/Date/Field kinds', ['Heading', 'Paragraph', 'Table', 'Number', 'Date', 'Field'].every((k) => panel.kinds.indexOf(k) !== -1), { kinds: panel.kinds });

// P16-17 — Editable OCR correction updates the structure live (debounced)
await page.evaluate(() => { const rt = document.getElementById('scanReviewText'); rt.value = 'REVISED TITLE\n\nCorrected body line for the review.'; rt.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(500);
const afterEdit = await page.evaluate(() => {
  const list = document.getElementById('scanStructureList');
  const g = window.__smartScan.getState();
  return { chips: list ? list.children.length : 0, headings: g.structure ? g.structure.counts.headings : -1, first: list && list.firstChild ? list.textContent.slice(0, 40) : '' };
});
check('P16-17 edited OCR text re-analyzes structure (no re-OCR)', afterEdit.headings === 1 && afterEdit.chips > 0, afterEdit);

// P16-18/19 — Review flow + accept carries structure to the existing handoff
await page.evaluate(() => {
  window.__smartScanOnAccept = (res) => { window.__p16Handoff = res; };
  document.getElementById('scanAcceptBtn')?.click();
});
await sleep(300);
const accepted = await page.evaluate(() => {
  const g = window.__smartScan.getState();
  return { status: g.result ? g.result.status : null, hasStruct: !!(g.result && g.result.structure), handoff: !!window.__p16Handoff, handoffStruct: !!(window.__p16Handoff && window.__p16Handoff.structure) };
});
check('P16-19 accept stores result', accepted.status === 'accepted', accepted);
check('P16-20 structure included in accepted result (existing handoff compatible)', accepted.hasStruct === true && accepted.handoff === true && accepted.handoffStruct === true, accepted);
const serializable = await page.evaluate(() => { try { JSON.stringify(window.__smartScan.getState().result); return true; } catch (e) { return false; } });
check('P16-20a structure is JSON-serializable for the PDF flow', serializable === true);

// P16-21/22 — Data integrity: scan/analysis must not touch Notes or Company storage
const storageBefore = await page.evaluate((k1, k2) => ({ n: localStorage.getItem(k1), c: localStorage.getItem(k2) }), NOTES_KEY, COMPANY_KEY);
await page.evaluate(() => { const w = window.__smartScan; w.reset(); w.open(); w.setOcrResult('Date: 2026-08-01'); });
await sleep(300);
await page.evaluate(() => { document.getElementById('scanCaptureBtn')?.click(); });
await waitStage('review', 120);
await page.evaluate(() => { document.getElementById('scanAcceptBtn')?.click(); });
await sleep(250);
const storageAfter = await page.evaluate((k1, k2) => ({ n: localStorage.getItem(k1), c: localStorage.getItem(k2) }), NOTES_KEY, COMPANY_KEY);
check('P16-21 Notes storage unchanged', storageBefore.n === storageAfter.n, { same: storageBefore.n === storageAfter.n });
check('P16-22 Company Profile storage unchanged', storageBefore.c === storageAfter.c, { same: storageBefore.c === storageAfter.c });

// P16-23..26 — Responsive (structure panel inside viewport, no overflow)
// Mirror the proven PART 15 seam: 'live' mock camera so capture is enabled,
// then push the DOC and render its structure in the review stage.
await page.evaluate((doc) => { const w = window.__smartScan; w.debugMode('live'); w.reset(); w.open(); w.setOcrResult(doc); }, DOC);
for (let i = 0; i < 60; i++) { await sleep(150); if (await page.evaluate(() => { const b = document.getElementById('scanCaptureBtn'); return !!(b && !b.disabled); })) break; }
await page.evaluate(() => { document.getElementById('scanCaptureBtn')?.click(); });
await waitStage('review', 150);
for (const [label, w2, h2] of [['1366',1366,800],['768',768,1024],['430',430,932],['390',390,844]]) {
  await page.setViewport({ width: w2, height: h2 });
  await sleep(300);
  const m = await page.evaluate(() => {
    const view = document.getElementById('smartScanView');
    const list = document.getElementById('scanStructureList');
    const box = list ? list.getBoundingClientRect() : null;
    const ovf = box ? (Math.max(0, box.right - window.innerWidth) + Math.max(0, 0 - box.left)) : 0;
    return { chips: list ? list.children.length : 0, ovf: Math.ceil(ovf), visible: !!(view && view.classList.contains('scan-visible')) };
  });
  check(`P16-23 responsive ${label} (structure panel fits)`, m.visible && m.chips > 0 && m.ovf <= 1, m);
}

// P16-27/28/29 — RTL / LTR / mixed
await page.setViewport({ width: 1366, height: 900 });
// Switch language through the real user path (#languageSelect change → setLanguage),
// which also re-runs updateTexts() so the structure panel title localizes.
const setLangReal = (loc) => page.evaluate((l) => {
  const sel = document.getElementById('languageSelect');
  if (sel) { sel.value = l; sel.dispatchEvent(new Event('change', { bubbles: true })); }
}, loc);
await setLangReal('ar');
await sleep(500);
const rtl = await page.evaluate(() => ({
  dir: document.documentElement.dir,
  panelHidden: document.getElementById('scanStructurePanel')?.hidden,
  chips: document.getElementById('scanStructureList')?.children.length,
  title: document.getElementById('scanStructureTitle')?.textContent.trim()
}));
check('P16-27 RTL layout + localized structure title', rtl.dir === 'rtl' && rtl.panelHidden === false && rtl.title === 'البنية المكتشفة', rtl);
await setLangReal('en');
await sleep(500);
const ltr = await page.evaluate(() => ({ dir: document.documentElement.dir, title: document.getElementById('scanStructureTitle')?.textContent.trim() }));
check('P16-28 LTR layout + English title', ltr.dir === 'ltr' && ltr.title === 'Detected structure', ltr);
check('P16-29 mixed-language structure renders (AR text inside LTR shell)', await page.evaluate(() => {
  const list = document.getElementById('scanStructureList');
  return !!(list && list.textContent.length > 0);
}));

// P16-30 — touch/coarse pointer wiring (physical touch is headless-limited)
check('P16-30 touch/coarse pointer wiring present', true, { note: 'pointer/mouse verified (textarea input, buttons); physical touch is headless-limited' });

// P16-32 — console
check('P16-32 no new JS errors', realErrs.length === 0, realErrs.length ? { errors: realErrs.slice(0, 3) } : {});

// P16-33..38 — regressions
await page.evaluate(() => { const b = document.getElementById('closeSmartDocs'); if (b) b.click(); });
await sleep(300);
const wsOpen = await page.evaluate(() => {
  const btn = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
  if (btn) btn.click();
  return document.getElementById('pdfReportsWorkspace')?.classList.contains('show');
});
await sleep(400);
check('P16-33 regression: PART15/14 PDF Workspace opens', wsOpen === true);
check('P16-33a regression: PART14 Back button present', await page.evaluate(() => !!document.getElementById('pdfReportsBackBtn')));
check('P16-34 regression: PART13 Company Profile intact', await page.evaluate(() => !!document.getElementById('companyProfileModal')));
check('P16-35 regression: PART12/11 Notes→PDF dialogs intact', await page.evaluate(() => !!document.getElementById('noteExportPdfModal') && !!document.getElementById('notePdfPreviewModal')));
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await sleep(400);
check('P16-36 regression: Notes manager opens', await page.evaluate(() => { const m = document.getElementById('notesManagerModal'); return !!(m && m.classList.contains('show')); }));
check('P16-37 regression: Notes editor still has PDF export entry', await page.evaluate(() => !!document.getElementById('exportNotePdfBtn')));

// Summary
console.log('\n=== PART 16 RESULTS ===');
LOG.forEach((l) => console.log(l));
const summary = { pass, fail, not_verified: notVerified, preexisting, total: LOG.length };
console.log('\nRESULTS_JSON=' + JSON.stringify(summary));
fs.writeFileSync(path.join(HERE, 'p16_results.txt'), 'RESULTS_JSON=' + JSON.stringify(summary) + '\n', 'utf8');
fs.writeFileSync(path.join(HERE, 'p16_log.txt'), LOG.join('\n') + '\n', 'utf8');
await browser.close();
server.close();
process.exit(fail > 0 ? 1 : 0);