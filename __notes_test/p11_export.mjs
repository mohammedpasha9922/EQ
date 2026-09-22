// PART 11 â€” Note â†’ PDF Export. Real-browser behavioral harness.
// Page A = REAL html2pdf/pdf.js pipeline (proves a genuine preview canvas).
// Page B = html2pdf stub capturing the PDF report HTML (asserts Style/Title/
// Date/Company reach the PDF and all note content survives).
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
const PORT = 8261;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
function check(name, ok, detail = '') {
  const line = `${ok ? 'PASS' : (detail === 'NV' ? 'NOTVER' : 'FAIL')}  ${name}${detail && detail !== 'NV' ? '  -> ' + detail : ''}`;
  LOG.push(line);
  console.log(line);
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

// ---------- Page A: REAL pdf pipeline ----------
const page = await browser.newPage();
const realErrs = [];
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) realErrs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else realErrs.push('console: ' + m.text()); } });

// ---------- Page B: stubbed html2pdf (captures report HTML) ----------
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

console.log('=== PART 11 â€” Note â†’ PDF Export ===');
try {
  const pixelData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const baseNow = Date.now();
  const notes = [
    { id: 'n-full', title: 'Project Report', body: '', bodyFormatting: [], folderId: 'personal', createdAt: baseNow - 1000, updatedAt: baseNow - 1000,
      bodyBlocks: [
        { type: 'text', body: 'Intro paragraph with formatting', formatting: [{ t: 'h1' }, { color: '#b45309' }] },
        { type: 'checklist', items: [{ text: 'todo one', checked: true }, { text: 'todo two', checked: false }] },
        { type: 'divider' },
        { type: 'table', header: true, rows: [[{ text: 'A', formatting: [] }, { text: '', formatting: [] }]] },
        { type: 'image', src: pixelData, alt: 'pix', width: 120, align: 'center' }
      ] },
    { id: 'n-min', title: 'Minimal Note', body: '', bodyFormatting: [], folderId: 'personal', createdAt: baseNow - 2000, updatedAt: baseNow - 2000 }
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
  async function closePreview(pg) { await pg.evaluate(() => { const c = document.getElementById('notePdfPreviewClose'); if (c) c.click(); }); await sleep(300); }
  async function waitForCanvas(pg) {
    for (let i = 0; i < 120; i++) { await sleep(250); const ok = await pg.evaluate(() => { const c = document.querySelector('#notePdfPreviewModal canvas'); return !!(c && c.width >= 500); }); if (ok) return true; }
    return false;
  }
// ===================== PAGE A â€” real pipeline =====================
  await page.setViewport({ width: 1366, height: 900 });
  await gotoApp(page);
  await seed(page);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  await openNote(page, 'Project Report');
  await openExportDialog(page);
  const dlg = await page.evaluate(() => {
    const st = document.getElementById('noteExportStyle');
    const ti = document.getElementById('noteExportTitle');
    const da = document.getElementById('noteExportDate');
    const co = document.getElementById('noteExportCompany');
    const m = document.getElementById('noteExportPdfModal');
    return { shown: !!m && m.classList.contains('show'), optsCount: st ? st.options.length : 0,
      values: st ? Array.from(st.options).map((o) => o.value) : [], titleDefault: ti ? ti.value : null,
      dateChecked: da ? da.checked : null, companyChecked: co ? co.checked : null,
      hasPreview: !!document.getElementById('noteExportPreviewBtn'), hasCreate: !!document.getElementById('noteExportCreateBtn') };
  });
  check('Export PDF dialog opens from editor', dlg.shown, JSON.stringify(dlg));
  check('Style selector has the 5 PART08 styles', dlg.optsCount === 5, 'opts=' + dlg.optsCount);
  check('Style selector offers Simple/Academic/Business/Engineering/Modern', ['simple','academic','business','engineering','modern'].every((v) => dlg.values.includes(v)), JSON.stringify(dlg.values));
  check('Title default = note title', dlg.titleDefault === 'Project Report', 'title=' + dlg.titleDefault);
  check('Date checkbox defaults checked', dlg.dateChecked === true, 'date=' + dlg.dateChecked);
  check('Company Profile defaults unchecked', dlg.companyChecked === false, 'company=' + dlg.companyChecked);
  check('Preview + Create PDF buttons present', dlg.hasPreview && dlg.hasCreate, 'preview=' + dlg.hasPreview + ' create=' + dlg.hasCreate);

  const noteBefore = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  const fullBefore = noteBefore.find((n) => n.id === 'n-full');
  await page.evaluate(() => {
    const st = document.getElementById('noteExportStyle'); if (st) st.value = 'engineering';
    const ti = document.getElementById('noteExportTitle'); if (ti) ti.value = 'Final Engineering Report';
  });
  await sleep(150);
  await page.evaluate(() => { const b = document.getElementById('noteExportPreviewBtn'); if (b) b.click(); });
  const pvReal = await waitForCanvas(page);
  const canvasDims = await page.evaluate(() => { const c = document.querySelector('#notePdfPreviewModal canvas'); return c ? c.width + 'x' + c.height : 'none'; });
  check('Preview: real PDF preview renders a canvas (html2pdf + pdf.js)', pvReal, 'canvas=' + canvasDims);
  check('Preview: preview modal shows', await page.evaluate(() => { const m = document.getElementById('notePdfPreviewModal'); return !!m && m.classList.contains('show'); }), '');
  await closePreview(page);
  const noteAfter = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  const fullAfter = noteAfter.find((n) => n.id === 'n-full');
  check('Note integrity: export does not change note title', !!fullAfter && fullAfter.title === fullBefore.title, 'title=' + (fullAfter && fullAfter.title));
  check('Note integrity: export does not change bodyBlocks', !!fullAfter && JSON.stringify(fullAfter.bodyBlocks) === JSON.stringify(fullBefore.bodyBlocks), 'blocksEq=' + (!!fullAfter && JSON.stringify(fullAfter.bodyBlocks) === JSON.stringify(fullBefore.bodyBlocks)));
// Minimal note (title only) exports fine with the real pipeline.
  await closeEditor(page);
  await openNote(page, 'Minimal Note');
  await openExportDialog(page);
  const minDlg = await page.evaluate(() => ({ shown: !!document.getElementById('noteExportPdfModal') && document.getElementById('noteExportPdfModal').classList.contains('show'), titleDefault: document.getElementById('noteExportTitle').value }));
  check('Minimal note: export dialog opens with title default', minDlg.shown && minDlg.titleDefault === 'Minimal Note', JSON.stringify(minDlg));
  await page.evaluate(() => { const b = document.getElementById('noteExportPreviewBtn'); if (b) b.click(); });
  const minCanvas = await waitForCanvas(page);
  check('Minimal note: preview renders canvas', minCanvas, 'canvas=' + (await page.evaluate(() => { const c = document.querySelector('#notePdfPreviewModal canvas'); return c ? c.width + 'x' + c.height : 'none'; })));
  await closePreview(page);
  await closeEditor(page);

  // ---------- Responsive: dialog stays in viewport, no overflow ----------
  for (const w of [1366, 768, 430, 390]) {
    await page.setViewport({ width: w, height: 900 }); await sleep(150);
    await openNote(page, 'Project Report');
    const baseOv = await page.evaluate(() => ({ hasHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    await openExportDialog(page);
    const ov = await page.evaluate(() => {
      const m = document.getElementById('noteExportPdfModal');
      const r = m.getBoundingClientRect();
      const docW = document.documentElement.clientWidth;
      return { inside: r.left >= -1 && r.right <= docW + 1, docW: Math.round(docW), hasHScroll: document.documentElement.scrollWidth > docW, openSW: document.documentElement.scrollWidth };
    });
    check('Responsive ' + w + ': export dialog inside viewport', ov.inside, JSON.stringify(ov));
    check('Responsive ' + w + ': dialog adds no horizontal overflow (base=' + baseOv.hasHScroll + ' with=' + ov.hasHScroll + ')', ov.hasHScroll === baseOv.hasHScroll, 'baseSW=' + baseOv.sw + ' openSW=' + ov.openSW);
    await page.evaluate(() => { const c = document.getElementById('noteExportPdfClose'); if (c) c.click(); });
    await sleep(200);
    await closeEditor(page);
  }
  await page.setViewport({ width: 1366, height: 900 }); await sleep(200);

  // ---------- RTL (Arabic) ----------
  await page.evaluate((l) => localStorage.setItem(l, 'ar'), LANG_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  check('RTL: Arabic sets dir=rtl', await page.evaluate(() => document.documentElement.getAttribute('dir')) === 'rtl', '');
  await openNote(page, 'Project Report');
  await openExportDialog(page);
  const rtl = await page.evaluate(() => {
    const m = document.getElementById('noteExportPdfModal');
    const h3 = document.getElementById('noteExportPdfTitle');
    const r = m.getBoundingClientRect();
    const docW = document.documentElement.clientWidth;
    return { modalDir: m ? m.getAttribute('dir') : null, titleText: h3 ? h3.textContent : null, visible: !!m && m.classList.contains('show'), inside: r.left >= -1 && r.right <= docW + 1, hasHScroll: document.documentElement.scrollWidth > docW };
  });
  check('RTL: export dialog visible + rtl direction + translated title', rtl.visible && rtl.modalDir === 'rtl' && !!rtl.titleText, JSON.stringify(rtl));
  check('RTL: no horizontal overflow in export dialog', rtl.inside && !rtl.hasHScroll, '');
  await page.evaluate(() => { const c = document.getElementById('noteExportPdfClose'); if (c) c.click(); });
  await sleep(200);
  await closeEditor(page);
  await page.evaluate((l) => localStorage.setItem(l, 'en'), LANG_KEY);
// ---------- Accessibility ----------
  await openNote(page, 'Project Report');
  await openExportDialog(page);
  const a11y = await page.evaluate(() => {
    const style = document.getElementById('noteExportStyle');
    const title = document.getElementById('noteExportTitle');
    const close = document.getElementById('noteExportPdfClose');
    const prev = document.getElementById('noteExportPreviewBtn');
    const create = document.getElementById('noteExportCreateBtn');
    return {
      styleLabel: !!(style && (style.getAttribute('aria-label') || '').trim()),
      titlePlaceholder: !!(title && (title.getAttribute('placeholder') || '').trim()),
      closeLabel: !!(close && (close.getAttribute('aria-label') || '').trim()),
      prevBtnName: !!(prev && (prev.textContent.trim() || prev.getAttribute('aria-label'))),
      createBtnName: !!(create && (create.textContent.trim() || create.getAttribute('aria-label')))
    };
  });
  check('Accessibility: style select has aria-label', a11y.styleLabel, String(a11y.styleLabel));
  check('Accessibility: title input has placeholder', a11y.titlePlaceholder, String(a11y.titlePlaceholder));
  check('Accessibility: close button has aria-label', a11y.closeLabel, String(a11y.closeLabel));
  check('Accessibility: Preview + Create have names', a11y.prevBtnName && a11y.createBtnName, JSON.stringify({ p: a11y.prevBtnName, c: a11y.createBtnName }));
  await page.evaluate(() => { const c = document.getElementById('noteExportPdfClose'); if (c) c.click(); });
  await sleep(200);
  await closeEditor(page);

  // ===================== PAGE B â€” stubbed pipeline (captures PDF HTML) =====================
  await spage.setViewport({ width: 1366, height: 900 });
  await gotoApp(spage);
  await seed(spage);
  await spage.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  async function runCreate(pg, style, title, dateOn, companyOn) {
    await openNote(pg, 'Project Report');
    await openExportDialog(pg);
    await pg.evaluate(({ style, title, dateOn, companyOn }) => {
      const st = document.getElementById('noteExportStyle'); if (st && style) st.value = style;
      const ti = document.getElementById('noteExportTitle'); if (ti) ti.value = title || '';
      const da = document.getElementById('noteExportDate'); if (da) da.checked = !!dateOn;
      const co = document.getElementById('noteExportCompany'); if (co) co.checked = !!companyOn;
    }, { style, title, dateOn, companyOn });
    await sleep(200);
    await pg.evaluate(() => { window.__capturedHtml = ''; });
    await pg.evaluate(() => { const b = document.getElementById('noteExportCreateBtn'); if (b) b.click(); });
    for (let i = 0; i < 30; i++) { await sleep(150); const has = await pg.evaluate(() => (window.__capturedHtml || '').length > 10); if (has) break; }
    return pg.evaluate(() => window.__capturedHtml || '');
  }
// Case A: Style Simple, Title default, Date ON, Company OFF
  let h = await runCreate(spage, 'simple', '', true, false);
  check('A: PDF report HTML not empty', h.length > 10, 'len=' + h.length);
  check('A: Style simple applied (.note-style-simple)', h.includes('note-style-simple'), '');
  check('A: default Title (Project Report) present', h.includes('Project Report'), '');
  check('A: Date present (meta block)', (h.match(/class="meta"/g) || []).length > 0, 'metaCount=' + (h.match(/class="meta"/g) || []).length);
  check('A: Company absent', !h.includes('eq-pdf-company'), '');

  // Case B: Style Engineering, Title custom, Date ON, Company ON (seed a company name)
  await spage.evaluate((c, v) => localStorage.setItem(c, v), COMPANY_KEY, 'Acme Engineering Co.');
  h = await runCreate(spage, 'engineering', 'Final Engineering Report', true, true);
  check('B: Style engineering applied', h.includes('note-style-engineering'), '');
  check('B: custom Title present', h.includes('Final Engineering Report'), '');
  check('B: company line present', h.includes('Acme Engineering Co.') && h.includes('eq-pdf-company'), '');
  check('B: table preserved (eq-pdf-note-table)', h.includes('eq-pdf-note-table'), '');

  // Case C: Style Academic, Title custom, Date OFF, Company OFF
  h = await runCreate(spage, 'academic', 'Academic Title', false, false);
  check('C: Style academic applied', h.includes('note-style-academic'), '');
  check('C: custom Title present', h.includes('Academic Title'), '');
  check('C: Date absent (no meta block)', (h.match(/class="meta"/g) || []).length === 0, 'metaCount=' + (h.match(/class="meta"/g) || []).length);
  check('C: company absent', !h.includes('eq-pdf-company'), '');

  // Case D: Style Modern, Title empty (falls back to note title), Date OFF, Company OFF
  h = await runCreate(spage, 'modern', '', false, false);
  check('D: Style modern applied', h.includes('note-style-modern'), '');
  check('D: empty title falls back to note title', h.includes('Project Report'), '');

  // Case E: Style Business, Title default, Date ON, Company OFF
// Missing Company Profile fallback: company ON but no saved name â†’ no line, export proceeds
  await spage.evaluate((c) => localStorage.removeItem(c), COMPANY_KEY);
  h = await runCreate(spage, 'engineering', '', true, true);
  check('Missing company profile: export still succeeds (HTML produced)', h.length > 10, 'len=' + h.length);
  check('Missing company profile: no company line (no block)', !h.includes('eq-pdf-company'), '');

  // Content integrity in the exported PDF (full note: checklist/divider/image/table/heading)
  h = await runCreate(spage, 'engineering', 'Integrity Check', true, false);
  check('PDF: checklist preserved (eq-pdf-check-item)', h.includes('eq-pdf-check-item'), '');
  check('PDF: divider preserved (eq-pdf-divider)', h.includes('eq-pdf-divider'), '');
  check('PDF: image preserved (eq-pdf-image + data URL)', h.includes('eq-pdf-image') && h.includes('data:image/png'), '');
  check('PDF: table preserved (eq-pdf-note-table)', h.includes('eq-pdf-note-table'), '');
  check('PDF: heading preserved (h1 from formatting)', /<h1>/i.test(h), '');
  check('PDF: custom export title used in report', h.includes('Integrity Check'), '');

  // Note integrity on the stubbed page: exports never leak into the stored note.
  const stubStore = await spage.evaluate((k) => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);
  const stubFull = stubStore.find((n) => n.id === 'n-full');
  check('Export options do not leak into stored note (Page B)', !!stubFull && stubFull.title === 'Project Report' && !stubFull.exportOpts && stubFull.styleId === undefined, 'title=' + (stubFull && stubFull.title));

  // Console: no new errors on either page.
  check('Console: no new errors from PART 11 (real page)', realErrs.length === 0, JSON.stringify(realErrs.slice(0, 4)));
  check('Console: no new errors from PART 11 (stub page)', stubErrs.length === 0, JSON.stringify(stubErrs.slice(0, 4)));
} catch (topErr) {
  check('Runtime completed without top-level error', false, String((topErr && topErr.message) || topErr));
}

try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
console.log('RESULTS_JSON=' + JSON.stringify({ pass: pass, fail: fail, not_verified: notVerified, preexisting: preexisting, total: pass + fail + notVerified }));
LOG.push('RESULTS_JSON=' + JSON.stringify({ pass: pass, fail: fail, not_verified: notVerified, preexisting: preexisting, total: pass + fail + notVerified }));
try { fs.writeFileSync(path.join(HERE, 'p11_results.txt'), LOG.join('\n') + '\n', 'utf8'); } catch (e) {}
process.exit(fail > 0 ? 1 : 0);
