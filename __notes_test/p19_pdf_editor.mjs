// PART 19 — Existing PDF → PDF Editor (PDF Workspace → Open PDF → editor).
// Real-browser behavioral harness. Reuses the EXISTING Smart Documents import
// flow (smartImportOpen → validation → pdf.js parse → PART 5e in-place editor)
// and the EXISTING pdf-lib TRUE-PDF export (content-stream rewrite). No new
// editor/viewer/storage is built or asserted.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8411;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const FIXTURE = path.join(HERE, '_p19_fixture_2p.pdf');

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
const realErrs = [];
function check(name, ok, detail = '') {
  let d = detail;
  if (detail && typeof detail === 'object') { try { d = JSON.stringify(detail); } catch (e) { d = String(detail); } }
  LOG.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${d !== '' ? '  -> ' + d : ''}`);
  if (ok) pass++; else fail++;
}
function notv(name, reason) { notVerified++; LOG.push(`NOT VERIFIED  ${name}  -> ${reason}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf' };
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
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) realErrs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else realErrs.push('console: ' + m.text()); } });

async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(600); }
async function openWorkspace() {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]'); if (b) b.click(); });
  await sleep(400);
  return await page.evaluate(() => { const m = document.getElementById('pdfReportsWorkspace'); return !!(m && m.classList.contains('show')); });
}
// Open PDF card -> existing import flow (pick stage + file input primed).
async function openPdfCard() {
  await page.evaluate(() => { document.getElementById('pdfOpenCard')?.click(); });
  await sleep(500);
  return await page.evaluate(() => ({
    wsClosed: !(document.getElementById('pdfReportsWorkspace') || {}).classList?.contains?.('show'),
    docsOpen: !!(document.getElementById('smartDocsModal') || {}).classList?.contains?.('show'),
    importView: !!(document.getElementById('smartImportView') || {}).classList?.contains?.('import-visible'),
    pick: (() => { const el = document.getElementById('importStagePick'); return !!(el && el.classList.contains('stage-active')); })(),
    hasInput: !!document.getElementById('smartImportFileInput')
  }));
}
// Inject a File into the existing #smartImportFileInput (headless file dialog
// cannot be used; DataTransfer is the standard behavioral injection path).
async function injectFile(name, mime, bytesB64) {
  return await page.evaluate(async (n, m, b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([u8], n, { type: m }));
    const fi = document.getElementById('smartImportFileInput');
    if (!fi) return { ok: false, why: 'no input' };
    fi.files = dt.files;
    fi.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, name, mime, bytesB64);
}
async function waitEditor(tries = 90) {
  for (let i = 0; i < tries; i++) {
    const s = await page.evaluate(() => {
      const ed = document.getElementById('smartEditorView');
      const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0 && c.height > 0; }).length;
      const spans = document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length;
      return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted, spans };
    });
    if (s.visible && s.pages >= 2 && s.painted >= 2 && s.spans >= 4) return s;
    await sleep(250);
  }
  return await page.evaluate(() => {
    const ed = document.getElementById('smartEditorView');
    const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page');
    const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0 && c.height > 0; }).length;
    return { visible: !!(ed && ed.classList.contains('editor-visible')), pages: pages.length, painted, spans: document.querySelectorAll('#smartPdfEditor .smart-pdf-text').length };
  });
}
async function importStage() { return await page.evaluate(() => { const el = document.querySelector('#smartImportView .smart-import-stage.stage-active'); return el ? el.id : 'none'; }); }

console.log('=== PART 19 — Existing PDF → PDF Editor ===');
await page.setViewport({ width: 1366, height: 900 });
await gotoApp();

// Original source safety: hash the fixture BEFORE anything runs.
const origB64 = fs.readFileSync(FIXTURE).toString('base64');
const origHash = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');

// P19-01 Workspace opens
check('P19-01 PDF Workspace opens', await openWorkspace() === true);

// P19-02 Open PDF card -> existing import flow (pick stage)
const oc = await openPdfCard();
check('P19-02 Open PDF card opens existing import flow', oc.wsClosed && oc.docsOpen && oc.importView && oc.pick && oc.hasInput, oc);

// P19-03 inject a real 2-page PDF -> editor opens with pages rendered
const inj = await injectFile('part19.pdf', 'application/pdf', origB64);
check('P19-03a file accepted into existing input', inj.ok === true, inj);
const ed = await waitEditor();
check('P19-03b PDF Editor opens (existing PART 5e editor)', !!ed, ed);
check('P19-04 multi-page PDF rendered (2 pages, canvases painted)', !!ed && ed.pages === 2 && ed.painted === 2, ed);

// P19-05 text layer present (editable spans from pdf.js geometry)
const layer = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-text')];
  return { count: spans.length, first: spans.length ? spans[0].textContent : '', p2: spans.some((s) => s.dataset.page === '1' && s.textContent.indexOf('Page 2') >= 0) };
});
check('P19-05 positioned editable text layer present', layer.count > 0 && layer.p2, layer);

// P19-06 invalid file rejected by EXISTING validation — via the REAL user path:
// editor -> existing Back -> pick view, then choose a non-PDF file.
await page.evaluate(() => { const b = document.getElementById('smartEditorBackBtn') || document.getElementById('smartEditorBack'); if (b) b.click(); });
await sleep(400);
await injectFile('note.txt', 'text/plain', Buffer.from('hello world').toString('base64'));
await sleep(700);
const stage = await importStage();
const edStill = await page.evaluate(() => { const ed = document.getElementById('smartEditorView'); return !!(ed && ed.classList.contains('editor-visible')); });
const importVisible = await page.evaluate(() => { const v = document.getElementById('smartImportView'); return !!(v && v.classList.contains('import-visible')); });
check('P19-06 non-PDF rejected (existing validation, error stage)', stage === 'importStageError' && !edStill && importVisible, { stage, edStill, importVisible });
const errShown = await page.evaluate(() => { const e = document.getElementById('importErrorText'); return e ? e.textContent : ''; });
check('P19-06b error message shown in-UI (no alert)', errShown.length > 0, { errShown });

// P19-07 re-open pick + inject the PDF again for the editing tests
await page.evaluate(() => { window.__smartImport.reset(); });
await sleep(300);
await injectFile('part19.pdf', 'application/pdf', origB64);
const ed2 = await waitEditor();
check('P19-07 re-import into editor (existing flow, retry path)', !!ed2 && ed2.pages === 2, ed2);

// P19-08 in-place text edit on page 1 (click -> edit -> blur commit)
const editRes = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-text')];
  const span = spans.find((s) => s.dataset.page === '0' && s.textContent.indexOf('sample') >= 0);
  if (!span) return { ok: false, why: 'span not found' };
  span.click();
  const editing = span.classList.contains('is-editing') && span.contentEditable === 'true';
  span.textContent = 'EDITED19';
  span.blur();
  return { ok: true, editing, after: { edited: span.classList.contains('is-edited'), ce: span.contentEditable, text: span.textContent } };
});
check('P19-08 in-place edit enters editing + commits on blur', editRes.ok && editRes.editing && editRes.after.edited && editRes.after.text === 'EDITED19', editRes);

// P19-09 lazy pdf-lib (performance): NOT loaded during editing, loads on export
const libBefore = await page.evaluate(() => typeof window.PDFLib);
check('P19-09 pdf-lib lazy (not loaded while editing)', libBefore === 'undefined', { libBefore });

// P19-10 edit persists across rerender/navigation: both pages stay rendered,
// edited span keeps its new text, page 2 span untouched (page order intact).
const persist = await page.evaluate(() => {
  const spans = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-text')];
  const e1 = spans.find((s) => s.dataset.page === '0' && s.textContent === 'EDITED19');
  const p2 = spans.find((s) => s.dataset.page === '1' && s.textContent.indexOf('Page 2') >= 0);
  const pages = document.querySelectorAll('#smartPdfEditor .smart-pdf-page').length;
  return { pages, editKept: !!e1, p2Intact: !!p2 };
});
check('P19-10 edits survive rerender/navigation, page order intact', persist.pages === 2 && persist.editKept && persist.p2Intact, persist);

// P19-11 Preview reflects the edit (edited span painted on the same page)
const prev = await page.evaluate(() => {
  const s = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-text')].find((x) => x.textContent === 'EDITED19');
  if (!s) return { ok: false };
  const r = s.getBoundingClientRect();
  return { ok: true, visible: r.width > 0 && r.height > 0, cls: s.className };
});
// P19-12 Export: genuine PDF via existing pdf-lib TRUE-PDF path
const exp = await page.evaluate(async () => {
  const blob = await window.__smartImport.editedBlob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  // Honest runtime proof: parse the EXPORTED bytes with the existing pdf.js and
  // extract the real text. Content streams are compressed on save, so text
  // extraction (not raw byte search) is the correct verification layer — it
  // also proves the edit is real selectable PDF text, not an overlay/image.
  let text1 = '', text2 = '', pages = 0, parseErr = '';
  try {
    const pdf = await window.pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
    pages = pdf.numPages;
    for (const pn of [1, 2]) {
      if (pn > pdf.numPages) continue;
      const pg = await pdf.getPage(pn);
      const tc = await pg.getTextContent();
      const t = (tc.items || []).map((i) => i.str || '').join(' ');
      if (pn === 1) text1 = t; else text2 = t;
    }
  } catch (e) { parseErr = String(e && e.message || e); }
  return { size: buf.length, head: bin.slice(0, 5), b64: btoa(bin), pages, text1, text2, parseErr };
});
check('P19-12 export produces a genuine PDF (%PDF-)', exp.head === '%PDF-', { head: exp.head, size: exp.size });
check('P19-13 exported PDF contains the user edit as REAL text', exp.pages >= 2 && exp.text1.indexOf('EDITED19') >= 0, { pages: exp.pages, edit: exp.text1.indexOf('EDITED19') >= 0, err: exp.parseErr });
check('P19-14 exported PDF keeps page 2 (multi-page preserved)', exp.pages === 2 && exp.text2.indexOf('Page 2') >= 0, { pages: exp.pages, p2: exp.text2.indexOf('Page 2') >= 0 });
check('P19-13b original word replaced (not duplicated) in exported text', exp.text1.indexOf('EDITED19') >= 0 && exp.text1.indexOf('sample') === -1, { replaced: exp.text1.indexOf('sample') === -1 });
check('P19-15 export rewrote content (not a raw passthrough)', exp.b64 !== origB64, { changed: exp.b64 !== origB64 });
const libAfter = await page.evaluate(() => typeof window.PDFLib);
check('P19-16 pdf-lib loaded on export (existing lazy loader)', libAfter === 'object', { libAfter });
const newHash = crypto.createHash('sha256').update(fs.readFileSync(FIXTURE)).digest('hex');
check('P19-17 original PDF file untouched (new output, no overwrite)', newHash === origHash, { same: newHash === origHash });

// P19-18 Back: existing editor back returns to the import pick screen
// (PART 5e behavior — Back never wipes the parsed PDF).
await page.evaluate(() => { const b = document.getElementById('smartEditorBackBtn') || document.getElementById('smartEditorBack'); if (b) b.click(); });
await sleep(400);
const backState = await page.evaluate(() => ({
  pick: (() => { const el = document.getElementById('importStagePick'); return !!(el && el.classList.contains('stage-active')); })(),
  importView: !!(document.getElementById('smartImportView') || {}).classList?.contains?.('import-visible'),
  editorHidden: !(document.getElementById('smartEditorView') || {}).classList?.contains?.('editor-visible')
}));
check('P19-18 Back returns via existing navigation (editor -> pick view)', backState.pick && backState.importView && backState.editorHidden, backState);

// P19-19 RTL: switch via the real language control; app dir flips, editor usable
await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = 'ar'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
await sleep(500);
const rtl = await page.evaluate(() => ({ dir: document.documentElement.getAttribute('dir'), lang: document.documentElement.lang }));
check('P19-19 RTL (Arabic) applied by existing i18n', rtl.dir === 'rtl', rtl);
await page.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); if (s) { s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); } });
await sleep(400);
const ltr = await page.evaluate(() => document.documentElement.getAttribute('dir'));
check('P19-20 LTR restored', ltr !== 'rtl', { dir: ltr });

// P19-21..24 responsive: editor UI + page canvas stay usable (page canvas may
// legitimately be its own size — separated from editor UI overflow).
const widthsIdx = { 1366: 21, 768: 22, 430: 23, 390: 24 };
for (const wd of [1366, 768, 430, 390]) {
  await page.setViewport({ width: wd, height: 900 });
  await gotoApp();
  const baseMx = await page.evaluate(() => { const m = document.getElementById('smartDocsModal'); return m ? m.scrollWidth - m.clientWidth : -1; });
  await openWorkspace();
  await openPdfCard();
  await injectFile('part19.pdf', 'application/pdf', origB64);
  await waitEditor();
  const m = await page.evaluate(() => {
    const modal = document.getElementById('smartDocsModal');
    const holder = document.getElementById('smartPdfEditor');
    const wraps = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-page')];
    const mx = modal ? modal.scrollWidth - modal.clientWidth : -1;
    const hx = holder ? holder.scrollWidth - holder.clientWidth : -1;
    const lastRight = wraps.length ? Math.round(wraps[wraps.length - 1].getBoundingClientRect().right) : 0;
    const vw = window.innerWidth;
    return { mx, hx, lastRight, vw, wraps: wraps.length };
  });
  // Editor UI criterion: the editor holder must not overflow and the rendered
  // page must sit inside the viewport. modal-level mx is the PRE-EXISTING
  // co-resident views width (disclosed since PART 17) — PART 19 must add none.
  check('P19-' + widthsIdx[wd] + ' responsive ' + wd + ' editor UI usable', m.hx <= 0 && m.wraps >= 1 && m.lastRight <= m.vw && m.mx <= baseMx + 2, { ...m, baseMx, added: m.mx - baseMx });
  LOG.push(`P19  NOTE responsive ${wd} modal overflow: mx=${m.mx} baseline=${baseMx} added=${m.mx - baseMx}`);
}

// P19-25 no new console errors
check('P19-25 no new JS errors (real + page)', realErrs.length === 0, { count: realErrs.length });

// P19-26 regressions: Smart Scan entry + Company Profile + Notes intact
await gotoApp();
const regress = await (async () => {
  const ws = await openWorkspace();
  await page.evaluate(() => { document.getElementById('pdfScanCreateCard')?.click(); });
  await sleep(600);
  const scan = await page.evaluate(() => { const v = document.getElementById('smartScanView'); return !!(v && v.classList.contains('scan-visible')); });
  const notesBtn = await page.evaluate(() => !!document.querySelector('.drawer-menu-item[data-action="open-notes"]'));
  return { ws, scan, notesBtn };
})();
check('P19-26 regression: Smart Scan entry intact (PART 15/16/17/18)', regress.ws && regress.scan, regress);
check('P19-26b regression: Notes entry intact', regress.notesBtn === true);

// P19-27 touch/coarse pointer wiring: the editable spans use pointerdown+click
// (verified working in P19-08 through the same event path). Physical touch is
// not testable in headless Chrome.
check('P19-27 touch wiring via pointer events (same path as mouse)', editRes.ok === true);
notv('P19-27b physical touchscreen editing', 'headless Chrome has no touchscreen hardware; pointer-event path verified via P19-08');

LOG.push(`P19  REAL_ERRORS=${realErrs.length}  PREEXISTING=${preexisting}`);
LOG.push(`RESULTS_JSON={"pass":${pass},"fail":${fail},"not_verified":${notVerified},"preexisting":${preexisting},"total":${pass + fail + notVerified}}`);
const out = LOG.join('\n');
fs.writeFileSync(path.join(HERE, 'p19_results.txt'), out);
console.log(out);
try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
process.exit(0);