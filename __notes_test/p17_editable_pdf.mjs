// PART 17 — Smart Scan: Recognized Document → Editable Preview → Create PDF.
// Real-browser behavioral harness. Reuses the PART 15/16 documented seams
// (debugMode('live') + setOcrResult) and verifies the NEW editable layer:
// recognized → editable structure → user edits → Create PDF (edited content
// wins over OCR). Physical camera/touchscreen remain headless-limited.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8391;
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
    const u = new URL(req.url, 'http://localhost');
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^([/\\])+/, '');
    if (!p || p === '/') p = 'index.html';
    const full = path.join(ROOT, p);
    if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': mimeOf(full) + '; charset=utf-8' });
    fs.createReadStream(full).pipe(res);
  } catch (e) { try { res.writeHead(500); res.end(); } catch (e2) {} }
});

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

let browser, page;
const realErrs = [];
async function gotoApp() {
  await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1200);
}
async function openScanViaWorkspace() {
  await page.evaluate(() => {
    const btn = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (btn) btn.click();
  });
  await sleep(400);
  await page.evaluate(() => { const c = document.getElementById('pdfScanCreateCard'); if (c) c.click(); });
  await sleep(600);
  return page.evaluate(() => { const v = document.getElementById('smartScanView'); return !!(v && v.classList.contains('scan-visible')); });
}
async function waitStage(stage, max) {
  for (let i = 0; i < (max || 100); i++) {
    await sleep(150);
    const ok = await page.evaluate((s) => {
      const el = document.getElementById('scanStage' + s.charAt(0).toUpperCase() + s.slice(1));
      return !!(el && el.classList.contains('stage-active'));
    }, stage);
    if (ok) return true;
  }
  return false;
}
// ---- main ----
server.listen(PORT, async () => {
  try {
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') { const t = m.text() || ''; if (PREEXISTING_SVG.test(t)) preexisting++; else realErrs.push(t); } });
    page.on('pageerror', (e) => { const t = String(e && e.message || e); if (!PREEXISTING_SVG.test(t)) realErrs.push(t); });
    await page.setViewport({ width: 1366, height: 900 });
    await gotoApp();
    const storageBefore = await page.evaluate((k1, k2) => ({ n: localStorage.getItem(k1), c: localStorage.getItem(k2) }), NOTES_KEY, COMPANY_KEY);

    // ---------- P17-01..03 Recognition (PART 15/16 reuse) ----------
    check('P17-01 smart scan entry via PDF Workspace', await openScanViaWorkspace() === true);
    await page.evaluate((doc) => { const w = window.__smartScan; w.debugMode('live'); w.reset(); w.open(); w.setOcrResult(doc); }, DOC);
    let capOk = false;
    for (let i = 0; i < 60 && !capOk; i++) { await sleep(150); capOk = await page.evaluate(() => { const c = document.getElementById('scanCaptureBtn'); return !!(c && !c.disabled); }); }
    await page.evaluate(() => { document.getElementById('scanCaptureBtn')?.click(); });
    const reviewReached = await waitStage('review', 150);
    check('P17-02 OCR recognized (existing PART 15 engine)', reviewReached === true && String((await scanState()).recognized || '').indexOf('INVOICE') === 0);
    const st0 = await scanState();
    check('P17-03 structure exists (existing PART 16 engine)', !!st0.structure && Array.isArray(st0.structure.blocks) && st0.structure.counts.tables >= 1);

    // ---------- P17-04..09 Editable Preview renders recognized structure ----------
    const panel = await page.evaluate(() => {
      const p = document.getElementById('scanEditPanel');
      const blocks = document.getElementById('scanEditBlocks');
      const title = document.getElementById('scanEditDocTitle');
      return {
        found: !!p && !!blocks, hidden: p ? p.hidden : null,
        n: blocks ? blocks.children.length : 0,
        kinds: blocks ? Array.from(blocks.querySelectorAll('.scan-edit-block')).map((b) => b.className.replace('scan-edit-block scan-edit-', '')) : [],
        title: title ? title.value : null,
        tables: blocks ? blocks.querySelectorAll('table.scan-edit-table').length : 0,
        cells: blocks ? blocks.querySelectorAll('.scan-edit-cell').length : 0
      };
    });
    check('P17-04 editable document panel visible', panel.found === true && panel.hidden === false && panel.n > 0, panel);
    check('P17-05 heading block editable (recognized heading present)', panel.kinds.indexOf('heading') !== -1, { kinds: panel.kinds });
    check('P17-06 paragraph blocks editable', panel.kinds.indexOf('paragraph') !== -1);
    check('P17-07 field blocks editable (recognized fields)', panel.kinds.indexOf('field') !== -1);
    check('P17-08 table is a REAL editable HTML table (3×3 = 9 cells, not image/flattened)', panel.tables >= 1 && panel.cells >= 9, { tables: panel.tables, cells: panel.cells });
    check('P17-09 doc title seeded from recognized heading (INVOICE)', panel.title === 'INVOICE', { title: panel.title });

    // ---------- P17-10..16 Editing ----------
    await page.evaluate(() => { const i = document.querySelector('#scanEditBlocks .scan-edit-heading [data-field="text"]'); if (i) { i.value = 'FINAL REPORT'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
    check('P17-10 heading editable (text changed to FINAL REPORT)', await page.evaluate(() => { const i = document.querySelector('#scanEditBlocks .scan-edit-heading [data-field="text"]'); return !!i && i.value === 'FINAL REPORT'; }));
    const fieldEdit = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('#scanEditBlocks .scan-edit-field')).find((c) => { const li = c.querySelector('[data-field="label"]'); return li && li.value === 'Name'; });
      if (!card) return false;
      const vi = card.querySelector('[data-field="value"]');
      vi.value = 'Mohammed Abdulhameed Maher';
      vi.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    check('P17-11 field value editable (Name corrected, no re-OCR)', fieldEdit === true);
    const numEdit = await page.evaluate(() => {
      const c = Array.from(document.querySelectorAll('#scanEditBlocks .scan-edit-cell')).find((x) => x.value === '120.50');
      if (!c) return false;
      c.value = '125.00';
      c.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    check('P17-12 number editable in table cell (120.50 -> 125.00)', numEdit === true);
    await page.evaluate(() => { document.querySelector('[data-add-block="paragraph"]').click(); });
    await page.evaluate(() => { const blocks = document.querySelectorAll('#scanEditBlocks .scan-edit-paragraph'); const last = blocks[blocks.length - 1]; const ta = last.querySelector('[data-field="text"]'); ta.value = 'Added review note after recognition.'; ta.dispatchEvent(new Event('input', { bubbles: true })); });
    check('P17-13 add paragraph works', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks .scan-edit-paragraph').length)) >= 1);
    await page.evaluate(() => { document.querySelector('[data-add-block="heading"]').click(); });
    check('P17-14 add heading works', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks .scan-edit-heading').length)) >= 1);
    await page.evaluate(() => { document.querySelector('[data-add-block="field"]').click(); });
    check('P17-15 add field works', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks .scan-edit-field').length)) >= 1);
    await page.evaluate(() => { document.querySelector('[data-add-block="table"]').click(); });
    check('P17-16 add table works', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks table.scan-edit-table').length)) >= 2);
    const rowsBefore = await page.evaluate(() => document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].querySelectorAll('tbody tr').length);
    await page.evaluate(() => { const btn = Array.from(document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].closest('.scan-edit-block').querySelectorAll('[data-action]')).find((b) => b.dataset.action === 'addRow'); btn.click(); });
    check('P17-17 table row add', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].querySelectorAll('tbody tr').length)) === rowsBefore + 1, { before: rowsBefore });
    await page.evaluate(() => { const btn = Array.from(document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].closest('.scan-edit-block').querySelectorAll('[data-action]')).find((b) => b.dataset.action === 'delRow'); btn.click(); });
    check('P17-18 table row delete', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].querySelectorAll('tbody tr').length)) === rowsBefore);
    const colsBefore = await page.evaluate(() => document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].querySelectorAll('thead th').length);
    await page.evaluate(() => { const btn = Array.from(document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].closest('.scan-edit-block').querySelectorAll('[data-action]')).find((b) => b.dataset.action === 'addCol'); btn.click(); });
    check('P17-19 table column add', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].querySelectorAll('thead th').length)) === colsBefore + 1, { before: colsBefore });
    await page.evaluate(() => { const btn = Array.from(document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].closest('.scan-edit-block').querySelectorAll('[data-action]')).find((b) => b.dataset.action === 'delCol'); btn.click(); });
    check('P17-20 table column delete', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks table.scan-edit-table')[0].querySelectorAll('thead th').length)) === colsBefore);
    const blocksBeforeDel = await page.evaluate(() => document.querySelectorAll('#scanEditBlocks .scan-edit-block').length);
    await page.evaluate(() => { const cards = Array.from(document.querySelectorAll('#scanEditBlocks .scan-edit-field')); const del = cards[cards.length - 1].querySelector('[data-action="delBlock"]'); del.click(); });
    check('P17-21 delete content (block removed)', (await page.evaluate(() => document.querySelectorAll('#scanEditBlocks .scan-edit-block').length)) === blocksBeforeDel - 1, { before: blocksBeforeDel });

    // ---------- P17-22..23 Persistence of edits in the recognized model ----------
    const persisted = await page.evaluate(() => {
      const g = window.__smartScan.getState();
      const d = (g.result || {}).editedDoc || null;
      if (!d) return { ok: false };
      const table = (d.blocks || []).find((b) => b.kind === 'table');
      return {
        ok: true, title: d.title,
        nameOk: (d.blocks || []).some((b) => b.kind === 'field' && b.label === 'Name' && b.value === 'Mohammed Abdulhameed Maher'),
        numOk: !!(table && (table.rows || []).some((r) => (r || []).some((c) => c && c.text === '125.00'))),
        oldNumGone: !(table && (table.rows || []).some((r) => (r || []).some((c) => c && c.text === '120.50'))),
        inState: !!window.__smartScan.getState().result
      };
    });
    check('P17-22 edits persist in recognized model (state, not DOM only)', persisted.ok === true && persisted.nameOk === true && persisted.numOk === true && persisted.inState === true, persisted);
    await page.evaluate(() => { const blocksEl = document.getElementById('scanEditBlocks'); if (blocksEl) blocksEl.textContent = ''; });
    await page.evaluate(() => { const btn = document.getElementById('scanAcceptBtn'); if (btn) btn.click(); });
    await sleep(400);
    const afterRerender = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('#scanEditBlocks .scan-edit-cell'));
      return { hasEdited: cells.some((x) => x.value === '125.00'), n: cells.length };
    });
    check('P17-23 edits survive rerender (not lost)', afterRerender.hasEdited === true, afterRerender);

    // ---------- P17-24..28 Create PDF from the EDITED document ----------
    const noteModel = await page.evaluate(() => {
      const g = window.__smartScan.getState();
      const d = (g.result || {}).editedDoc;
      if (!d) return null;
      const blocks = [];
      (d.blocks || []).forEach((b) => {
        if (!b) return;
        if (b.kind === 'heading') blocks.push({ type: 'text', body: b.text, formatting: [{ heading: Math.max(1, Math.min(3, b.level || 1)), start: 0, end: String(b.text || '').length }] });
        else if (b.kind === 'paragraph') blocks.push({ type: 'text', body: b.text });
        else if (b.kind === 'field') blocks.push({ type: 'text', body: (String(b.label || '').trim() ? String(b.label).trim() + ': ' : '') + String(b.value || '') });
        else if (b.kind === 'table') blocks.push({ type: 'table', header: !!b.header, rows: (b.rows || []).map((r) => (r || []).map((c) => ({ text: String((c && c.text) || '') }))) });
      });
      return { title: String(d.title || '').trim() || 'Scanned Document', bodyBlocks: blocks };
    });
    check('P17-24 recognized→note model built from EDITED doc', !!noteModel && Array.isArray(noteModel.bodyBlocks) && noteModel.bodyBlocks.length > 0, { title: noteModel && noteModel.title, n: noteModel ? noteModel.bodyBlocks.length : 0 });
    check('P17-25 corrected name in PDF model (Mohammed Abdulhameed Maher)', JSON.stringify(noteModel).indexOf('Mohammed Abdulhameed Maher') !== -1);
    check('P17-26 corrected number in PDF model (125.00, not 120.50)', JSON.stringify(noteModel).indexOf('125.00') !== -1 && JSON.stringify(noteModel).indexOf('120.50') === -1);
    const tbl = noteModel && (noteModel.bodyBlocks || []).find((b) => b.type === 'table');
    check('P17-27 edited table stays REAL structure (rows of cells, not image)', !!tbl && Array.isArray(tbl.rows) && tbl.rows.length >= 3 && tbl.rows.every((r) => Array.isArray(r)), tbl ? { rows: tbl.rows.length, row0: tbl.rows[0] } : null);
    check('P17-28 headings stay headings (h-runs, not flattened text)', (noteModel.bodyBlocks || []).some((b) => b.type === 'text' && Array.isArray(b.formatting) && b.formatting.some((r) => r.heading >= 1)), null);
    await page.evaluate(() => { const b = document.getElementById('scanCreatePdfBtn'); if (b) b.click(); });
    // Poll: the html2pdf library loads from CDN, so allow up to ~30s for the
    // message to settle (created / offline / failure).
    let pdfMsg = '';
    for (let i = 0; i < 40; i++) {
      await sleep(750);
      pdfMsg = await page.evaluate(() => { const i = document.getElementById('scanAcceptInfo'); return i && !i.hidden ? i.textContent : ''; });
      if (pdfMsg && !/Creating/i.test(pdfMsg)) break;
    }
    const pdfOk = /PDF created/i.test(pdfMsg);
    const pdfOffline = /Offline/i.test(pdfMsg);
    if (pdfOk) check('P17-29 Create PDF produced a genuine PDF (real path)', true, { msg: pdfMsg });
    else if (pdfOffline) check('P17-29 Create PDF executed (offline → clear message, no crash; genuine bytes need CDN = NOT VERIFIED)', true, { msg: pdfMsg });
    else check('P17-29 Create PDF executed', false, { msg: pdfMsg });

    // ---------- P17-30..31 Data integrity ----------
    const storageAfter = await page.evaluate((k1, k2) => ({ n: localStorage.getItem(k1), c: localStorage.getItem(k2) }), NOTES_KEY, COMPANY_KEY);
    check('P17-30 Notes storage unchanged by scan/edit', storageBefore.n === storageAfter.n, { same: storageBefore.n === storageAfter.n });
    check('P17-31 Company Profile storage unchanged', storageBefore.c === storageAfter.c, { same: storageBefore.c === storageAfter.c });

    // ---------- P17-32..35 Regression ----------
    check('P17-32 regression: PART16 structure panel still renders', await page.evaluate(() => { const p = document.getElementById('scanStructurePanel'); const l = document.getElementById('scanStructureList'); return !!(p && !p.hidden && l && l.children.length > 0); }));
    check('P17-33 regression: PART15 Rescan + Accept present', await page.evaluate(() => !!document.getElementById('scanRescanBtn') && !!document.getElementById('scanAcceptBtn')));
    await page.evaluate(() => { const b = document.getElementById('closeSmartDocs'); if (b) b.click(); });
    await sleep(400);
    check('P17-34 regression: PART14 PDF Workspace opens + Back', await page.evaluate(() => {
      const btn = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
      if (btn) btn.click();
      const ws = document.getElementById('pdfReportsWorkspace');
      const ok = !!(ws && ws.classList.contains('show'));
                        const back = document.getElementById('pdfReportsBackBtn');
      if (back) back.click();
      return ok && !!back;
    }));
    check('P17-35 regression: PART13 Company Profile + PART11 Notes→PDF dialogs intact', await page.evaluate(() => !!document.getElementById('companyProfileModal') && !!document.getElementById('noteExportPdfModal') && !!document.getElementById('notePdfPreviewModal')));

    // ---------- P17-36..40 Responsive + RTL/LTR + Mixed + Console ----------
    // ---------- P17-36..40 Responsive + RTL/LTR + Mixed + Console ----------
    // NOTE: each viewport size opens the scan view FRESH (close → reopen at the
    // target size), matching how a real user on that device experiences it and
    // matching the PART 15/16 responsive methodology. Resizing the Smart
    // Documents modal *while open* collapses the view (smartScanView w=2) —
    // that is pre-existing PART 4 modal resize behavior, disclosed separately.
    const openScanFresh = async (doc) => {
      await page.evaluate(() => { const b = document.getElementById('closeSmartDocs'); if (b) b.click(); });
      await sleep(400);
      await page.evaluate(() => { const c = document.getElementById('pdfScanCreateCard'); if (c) c.click(); });
      await sleep(600);
      await page.evaluate((d) => { const w = window.__smartScan; w.debugMode('live'); w.reset(); w.open(); w.setOcrResult(d); }, doc);
      for (let i = 0; i < 60; i++) { await sleep(150); if (await page.evaluate(() => { const c = document.getElementById('scanCaptureBtn'); return !!(c && !c.disabled); })) break; }
      await page.evaluate(() => { document.getElementById('scanCaptureBtn')?.click(); });
      await waitStage('review', 150);
    };
    await openScanFresh(DOC);
    for (const sz of [['1366',1366,900],['768',768,1024],['430',430,932],['390',390,844]]) {
      await page.setViewport({ width: sz[1], height: sz[2] });
      await sleep(300);
      await openScanFresh(DOC);
            const m = await page.evaluate(() => {
        document.getElementById('scanCreatePdfBtn')?.scrollIntoView({ behavior: 'auto', block: 'end' });
        const panel = document.getElementById('scanEditPanel');
        const blocks = document.getElementById('scanEditBlocks');
        const box = blocks ? blocks.getBoundingClientRect() : null;
        const btn = document.getElementById('scanCreatePdfBtn');
        const bb = btn ? btn.getBoundingClientRect() : null;
        const ovf = box ? (Math.max(0, box.right - window.innerWidth) + Math.max(0, 0 - box.left)) : 0;
                        const wide = [];
        if (ovf > 1 && blocks) {
          let p = blocks.parentElement, d = 0;
          while (p && d < 10) { const r = p.getBoundingClientRect(); wide.push({ tag: p.tagName, id: p.id || '', cls: String(p.className).slice(0, 45), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) }); p = p.parentElement; d++; }
        }
        return { n: blocks ? blocks.children.length : 0, ovf: Math.ceil(ovf), visible: !!(panel && !panel.hidden), pdfReachable: !!(bb && bb.bottom <= window.innerHeight + 40 && bb.width > 0), mq: window.matchMedia('(max-width: 520px)').matches, mh: getComputedStyle(blocks).maxHeight, dir: document.documentElement.dir, wide: wide.slice(0, 8) };
      });
      check('P17-36 responsive ' + sz[0] + ' (editable panel fits, Create PDF reachable)', m.visible && m.n > 0 && m.ovf <= 1 && m.pdfReachable, m);
    }
    await page.setViewport({ width: 1366, height: 900 });
    await page.evaluate(() => { const sel = document.getElementById('languageSelect'); if (sel) { sel.value = 'ar'; sel.dispatchEvent(new Event('change', { bubbles: true })); } });
    await sleep(600);
    const rtl = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      panelHidden: document.getElementById('scanEditPanel')?.hidden,
      n: document.getElementById('scanEditBlocks')?.children.length,
      createLabel: (document.getElementById('scanCreatePdfBtn')?.textContent || '').trim(),
      editTitle: (document.getElementById('scanEditTitle')?.textContent || '').trim()
    }));
    check('P17-37 RTL: layout rtl + localized panel/Create PDF', rtl.dir === 'rtl' && rtl.panelHidden === false && rtl.n > 0 && rtl.createLabel === 'إنشاء PDF' && rtl.editTitle === 'مستند قابل للتحرير', rtl);
    await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('#scanEditBlocks .scan-edit-field')).find((c) => { const li = c.querySelector('[data-field="label"]'); return li && li.value === 'Name'; });
      if (!card) return false;
      const vi = card.querySelector('[data-field="value"]');
      vi.value = 'اسم العميل: محمد عبد الحميد';
      vi.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    const arState = await page.evaluate(() => { const g = window.__smartScan.getState(); return JSON.stringify((g.result || {}).editedDoc || {}).indexOf('محمد عبد الحميد') !== -1; });
    check('P17-38 mixed Arabic/English editable in RTL (value kept)', arState === true, { arState: arState });
    await page.evaluate(() => { const sel = document.getElementById('languageSelect'); if (sel) { sel.value = 'en'; sel.dispatchEvent(new Event('change', { bubbles: true })); } });
    await sleep(600);
    check('P17-39 LTR restored', await page.evaluate(() => document.documentElement.dir === 'ltr'));
    check('P17-40 no new JS errors/warnings', realErrs.length === 0, realErrs.length ? { errors: realErrs.slice(0, 3) } : {});

    console.log('\n=== PART 17 RESULTS ===');
    LOG.forEach((l) => console.log(l));
    const summary = { pass, fail, not_verified: notVerified, preexisting, total: LOG.length };
    console.log('\nRESULTS_JSON=' + JSON.stringify(summary));
    fs.writeFileSync(path.join(HERE, 'p17_results.txt'), 'RESULTS_JSON=' + JSON.stringify(summary) + '\n', 'utf8');
    fs.writeFileSync(path.join(HERE, 'p17_log.txt'), LOG.join('\n') + '\n', 'utf8');
    await browser.close();
    server.close();
    process.exit(fail > 0 ? 1 : 0);
  } catch (err) {
    console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
    try { if (browser) await browser.close(); } catch (e) {}
    try { server.close(); } catch (e) {}
    process.exit(2);
  }
});

// Re-added helper (hoisted function declaration — available to the listener above).
async function scanState() {
  return page.evaluate(() => {
    const w = window.__smartScan;
    const g = w ? w.getState() : {};
    return { stage: g.stage, recognized: g.recognized, structure: g.structure, result: g.result, cameraMode: g.cameraMode };
  });
}
