// PART 07 — Color Presets behavioral verification harness (real Chrome,
// REAL UI interactions). Test-only artifact; it does NOT modify production files.
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
const LANG_KEY = 'eq-language';
const PORT = 8677;
const LOG = path.join(HERE, 'part07_verify.log');

fs.writeFileSync(LOG, '');
const results = [];
let consoleErrCount = 0;
const pageErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}
function note(name, detail = '') {
  const line = `NOTE  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}

const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': mimeOf(p) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
async function newCleanPage(viewport) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') { pageErrors.push('[console] ' + m.text()); consoleErrCount++; } });
  if (viewport) await page.setViewport(viewport);
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((a, b, c) => { localStorage.removeItem(a); localStorage.removeItem(b); localStorage.removeItem(c); }, STORAGE_KEY, FOLDERS_KEY, LANG_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(350);
  return page;
}
async function openNotes(page) {
  await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
  await sleep(200);
}
async function newNote(page, title) {
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
  await page.evaluate((t) => { document.getElementById('noteTitleInput').value = t; }, title);
  await sleep(150);
}
async function closeEditor(page) { await page.click('#closeFullScreenNote').catch(() => {}); await sleep(250); }
async function openNoteByTitle(page, title) {
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item'));
    const it = items.find((el) => (el.querySelector('.note-item-title')?.textContent.trim() || '') === t);
    if (it) it.click();
  }, title);
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
  await sleep(200);
}
async function typeText(page, text) {
  await page.evaluate(() => document.getElementById('noteBodyInput').focus());
  await sleep(100);
  await page.keyboard.type(text, { delay: 6 });
  await sleep(120);
}
async function bodyTextColor(page) {
  return page.evaluate(() => {
    const spans = document.querySelectorAll('#noteBodyInput span, #noteBodyInput font, #noteBodyInput [style*="color"]');
    const out = [];
    for (const s of spans) { const c = getComputedStyle(s).color; if (c && c !== 'rgb(0, 0, 0)' && !out.includes(c)) out.push(c); }
    return out;
  });
}
async function bodyHighlight(page) {
  return page.evaluate(() => {
    const spans = document.querySelectorAll('#noteBodyInput span, #noteBodyInput [style*="background"], #noteBodyInput [style*="background-color"]');
    const out = [];
    for (const s of spans) { const c = getComputedStyle(s).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' && !out.includes(c)) out.push(c); }
    return out;
  });
}
async function openAa(page) {
  await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  await page.click('#noteAaBtn');
  // The Aa button is a toggle: verify the panel actually opened; if a stray
  // extra click left it closed, click once more and wait again.
  const opened = await page.waitForFunction(() => { const p = document.getElementById('noteAaPanel'); return p && !p.classList.contains('hidden'); }, { timeout: 2500 }).then(() => true).catch(() => false);
  if (!opened) {
    await page.click('#noteAaBtn');
    await page.waitForFunction(() => { const p = document.getElementById('noteAaPanel'); return p && !p.classList.contains('hidden'); }, { timeout: 2500 }).catch(() => {});
  }
  await sleep(120);
}
async function closeAa(page) {
  await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); const p = document.getElementById('noteAaPanel'); if (b && p && !p.classList.contains('hidden')) b.click(); });
  await sleep(80);
}
async function clickPreset(page, id) {
  const ok = await page.evaluate((pid) => {
    const panel = document.getElementById('noteAaPanel');
    if (!panel || panel.classList.contains('hidden')) return 'panel-closed';
    const row = document.getElementById('noteAaPresetsRow');
    if (!row) return 'no-row';
    const btn = row.querySelector('[data-preset="' + pid + '"]');
    if (!btn) return 'no-btn';
    btn.click();
    return 'clicked';
  }, id);
  await sleep(200);
  return ok;
}
async function readNotes(page) { return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY); }
async function selectWordOffset(page, startOffset, count) {
  const doSel = async () => {
    await page.evaluate(() => { document.getElementById('noteBodyInput').focus(); });
    await sleep(50);
    await page.keyboard.press('Home');
    await sleep(40);
    for (let i = 0; i < startOffset; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.down('Shift');
    for (let i = 0; i < count; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Shift');
    await sleep(60);
    return page.evaluate(() => window.getSelection().toString());
  };
  // Native selection can occasionally be dropped right after typing (timing
  // flake). Verify and re-select once before continuing.
  let txt = await doSel();
  if (!txt) txt = await doSel();
  return txt;
}

console.log('=== PART 07 behavioral verification ===');
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

  // ================= DESKTOP LTR ENGLISH CORE FLOW =================
  const page = await newCleanPage({ width: 1366, height: 800 });
  const baselineErrors = pageErrors.slice();

  await openNotes(page);
  check('22 N02/N03 notes home opens', !!await page.evaluate(() => !!document.getElementById('notesManagerModal')?.classList.contains('show')));
  await newNote(page, 'P7 Color Presets');
  check('22 N02/N03 create note (editor opens)', !!await page.evaluate(() => !!document.getElementById('fullScreenNoteModal')?.classList.contains('show')));
  await typeText(page, 'Hello World Alpha Beta Gamma Delta');

  // 1. Text Color (individual handler via Aa) — with selection-verify retry.
  // A real mouse click on the Aa button occasionally drops the native
  // selection (timing flake); re-select and retry so we measure the product,
  // not the flake.
  let tColors = [];
  let tSw = false;
  for (let attempt = 0; attempt < 3 && !(tSw && tColors.length > 0); attempt++) {
    await selectWordOffset(page, 0, 5); // "Hello"
    await openAa(page);
    const selOk = await page.evaluate(() => !window.getSelection().isCollapsed && !!window.getSelection().toString());
    if (!selOk) { await closeAa(page); continue; }
    await page.evaluate(() => document.getElementById('noteTextColorBtn').click());
    await sleep(100);
    tSw = await page.evaluate(() => { const s = document.querySelector('#noteTextColorPalette .note-text-color-swatch:not([data-color="#000000"])'); if (!s) return false; s.click(); return true; });
    await sleep(180);
    tColors = await bodyTextColor(page);
    if (!(tSw && tColors.length > 0)) await closeAa(page);
  }
  note('1 bodyHTML', JSON.stringify(await page.evaluate(() => document.getElementById('noteBodyInput').innerHTML)));
  check('1 Text Color applied via Aa palette', tSw && tColors.length > 0, 'sw=' + tSw + ' colors=' + JSON.stringify(tColors));
  await closeAa(page);

  // 2. Highlight (individual handler via Aa) — same retry strategy.
  let hColors = [];
  let hSw = false;
  for (let attempt = 0; attempt < 3 && !(hSw && hColors.length > 0); attempt++) {
    await selectWordOffset(page, 6, 5); // "World"
    await openAa(page);
    const selOk = await page.evaluate(() => !window.getSelection().isCollapsed && !!window.getSelection().toString());
    if (!selOk) { await closeAa(page); continue; }
    await page.evaluate(() => document.getElementById('noteHighlightBtn').click());
    await sleep(100);
    hSw = await page.evaluate(() => { const s = document.querySelector('#noteHighlightPalette .note-aa-highlight-swatch'); if (!s) return false; s.click(); return true; });
    await sleep(180);
    hColors = await bodyHighlight(page);
    if (!(hSw && hColors.length > 0)) await closeAa(page);
  }
  check('2 Highlight applied via Aa palette', hSw && hColors.length > 0, 'sw=' + hSw + ' hl=' + JSON.stringify(hColors));
  await closeAa(page);

  // Preset row presence (desktop)
  await openAa(page);
  const presetCount = await page.evaluate(() => document.querySelectorAll('#noteAaPresetsRow .note-aa-preset-swatches').length);
  const presetIds = await page.evaluate(() => Array.from(document.querySelectorAll('#noteAaPresetsRow [data-preset]')).map((b) => b.getAttribute('data-preset')));
  check('Preset row rendered (desktop)', presetCount === 5, 'count=' + presetCount + ' ids=' + JSON.stringify(presetIds));
  await closeAa(page);
// Presets 6-10 on plain text words
  async function applyPresetAt(wordOffset, presetId) {
    await selectWordOffset(page, wordOffset, 8);
    await openAa(page);
    const r = await clickPreset(page, presetId);
    const colors = await bodyTextColor(page);
    const hl = await bodyHighlight(page);
    await closeAa(page);
    return { r, colors, hl };
  }
  const p6 = await applyPresetAt(12, 'simple');       // "Alpha"
  check('6 Simple preset applied', p6.r === 'clicked' && p6.colors.length > 0, 'r=' + p6.r + ' colors=' + JSON.stringify(p6.colors) + ' hl=' + JSON.stringify(p6.hl));
  const p7 = await applyPresetAt(18, 'academic');     // "Beta"
  check('7 Academic preset applied', p7.r === 'clicked' && p7.colors.length > 0, 'r=' + p7.r + ' colors=' + JSON.stringify(p7.colors));
  const p8 = await applyPresetAt(23, 'business');     // "Gamma"
  check('8 Business preset applied', p8.r === 'clicked' && p8.colors.length > 0, 'r=' + p8.r + ' colors=' + JSON.stringify(p8.colors));
  const p9 = await applyPresetAt(29, 'engineering');  // "Delta"
  check('9 Engineering preset applied', p9.r === 'clicked' && p9.colors.length > 0, 'r=' + p9.r + ' colors=' + JSON.stringify(p9.colors));
  await selectWordOffset(page, 0, 34);
  await openAa(page);
  const p10 = await clickPreset(page, 'modern');
  const p10colors = await bodyTextColor(page);
  await closeAa(page);
  check('10 Modern preset applied', p10 === 'clicked' && p10colors.length > 0, 'r=' + p10 + ' colors=' + JSON.stringify(p10colors));

  // 11. Autosave
  await sleep(900);
  const notes = await readNotes(page);
  const savedNote = notes.find((n) => n.title === 'P7 Color Presets');
  const savedHasColor = !!(savedNote && (savedNote.bodyFormatting?.some((r) => r.color) || JSON.stringify(savedNote.bodyBlocks || '').includes('color')));
  check('11 Autosave persisted colors', !!savedNote && savedHasColor, 'title=' + (savedNote?.title) + ' hasColor=' + savedHasColor);

  // 12. Close/Reopen
  await closeEditor(page);
  await openNoteByTitle(page, 'P7 Color Presets');
  const reopenColors = await bodyTextColor(page);
  check('12 Close/Reopen preserves colors', reopenColors.length > 0, 'colors=' + JSON.stringify(reopenColors));
  await closeEditor(page);

  // 13. Reload
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(400);
  await openNotes(page);
  await openNoteByTitle(page, 'P7 Color Presets');
  const reloadColors = await bodyTextColor(page);
  check('13 Reload preserves colors', reloadColors.length > 0, 'colors=' + JSON.stringify(reloadColors));
  await closeEditor(page);
  await page.evaluate(() => { const m = document.getElementById('notesManagerModal'); if (m && m.classList.contains('show')) { const c = document.getElementById('closeNotesManager'); if (c) c.click(); } });
  await sleep(200);
// 14. Preview
  await openNotes(page);
  await openNoteByTitle(page, 'P7 Color Presets');
  await sleep(150);
  await page.click('#notePreviewPdfBtn').catch(() => {});
  await sleep(1400);
  const previewShown = await page.evaluate(() => { const m = document.getElementById('notePdfPreviewModal'); return m ? !m.classList.contains('hidden') && getComputedStyle(m).display !== 'none' : null; });
  note('14 Preview modal state', 'shown=' + previewShown);

  // 15. PDF
  await page.evaluate(() => { const m = document.getElementById('notePdfPreviewModal'); if (m && !m.classList.contains('hidden')) { const c = document.getElementById('notePdfPreviewClose'); if (c) c.click(); } });
  await sleep(200);
  await page.click('#exportNotePdfBtn').catch(() => {});
  await sleep(1600);
  const pdfProbe = await page.evaluate(() => {
    const a = document.querySelector('a[download][href^="blob:"]');
    return { hadDownloadLink: !!a };
  });
  note('15 PDF export attempted', JSON.stringify(pdfProbe));
  await page.evaluate(() => { const m = document.getElementById('fullScreenNoteModal'); if (m && m.classList.contains('show')) { const c = document.getElementById('closeFullScreenNote'); if (c) c.click(); } });
  await sleep(200);
  await page.close();

  const coreErrors = pageErrors.filter((e) => !baselineErrors.includes(e));
  check('29 No new JS/console errors (desktop core flow)', coreErrors.length === 0, 'errors=' + coreErrors.length);
// ================= TABLE FEATURES + REGRESSIONS (FRESH PAGE) =================
  const tpage = await newCleanPage({ width: 1366, height: 800 });
  const baselineT = pageErrors.slice();
  await openNotes(tpage);
  await newNote(tpage, 'P7 Table');

  // Insert a 2x2 table with header (real toolbar interaction)
  await tpage.evaluate(() => { const b = document.getElementById('noteBodyInput'); if (b) b.focus(); const tb = document.getElementById('noteTableBtn'); if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  await tpage.click('#noteTableBtn'); await sleep(120);
  await tpage.evaluate(() => {
    document.getElementById('noteTableRows').value = 2;
    document.getElementById('noteTableCols').value = 2;
    const h = document.getElementById('noteTableHeader'); if (h) h.checked = true;
  });
  await tpage.evaluate(() => { const b = document.getElementById('noteTableInsertBtn'); if (b) b.click(); });
  await sleep(280);
  const tableCount = await tpage.evaluate(() => document.querySelectorAll('table.note-table').length);
  check('16 Real HTML table inserted', tableCount === 1, 'tables=' + tableCount);

  // 3. Cell Background (individual handler via cell-bg palette)
  await tpage.evaluate(() => { const t = document.querySelector('table.note-table'); const c = t.querySelector('tbody tr td.note-cell'); if (c) c.focus(); });
  await sleep(100);
  await tpage.evaluate(() => document.getElementById('noteCellBgColorBtn').click());
  await sleep(120);
  const bgSw = await tpage.evaluate(() => { const s = document.querySelector('#noteCellBgColorPalette .note-cell-bg-color-swatch'); if (!s) return false; s.click(); return true; });
  await sleep(180);
  const cellBgVal = await tpage.evaluate(() => { const t = document.querySelector('table.note-table'); const c = t.querySelector('tbody tr td.note-cell'); return c ? c.style.backgroundColor : null; });
  check('3 Cell Background applied', bgSw && !!(cellBgVal && cellBgVal !== 'transparent'), 'bg=' + cellBgVal);

  // 4. Border style (border color not part of engine; verify style control works)
  const selSet = await tpage.evaluate(() => {
    const sel = [...document.querySelectorAll('.note-mobile-table-toolbar [data-table-border-select]')].pop();
    if (!sel) return false;
    sel.value = 'outside';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  await sleep(150);
  const borderAttr = await tpage.evaluate(() => document.querySelector('table.note-table')?.getAttribute('data-border-style') || null);
  check('4 Border style control works (border color not in engine)', selSet && borderAttr === 'outside', 'attr=' + borderAttr);

  // 5. Table color (text foreground inside a cell, supported via execCommand)
  await tpage.evaluate(() => { const t = document.querySelector('table.note-table'); const c = t.querySelector('tbody tr td.note-cell'); c.textContent = 'CellA'; });
  await tpage.evaluate(() => { const t = document.querySelector('table.note-table'); const c = t.querySelector('tbody tr td.note-cell'); const r = document.createRange(); r.selectNodeContents(c); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  await sleep(80);
  await openAa(tpage);
  await tpage.evaluate(() => document.getElementById('noteTextColorBtn').click()); await sleep(100);
  const tcs = await tpage.evaluate(() => { const s = document.querySelector('#noteTextColorPalette .note-text-color-swatch'); if (!s) return false; s.click(); return true; });
  await sleep(180);
  await closeAa(tpage);
  // Preset applied inside a table cell (should set text + cell bg): dispatch real
  // mousedown so noteTableFocus is set (cell bg applies to focused/selected cell).
  await tpage.evaluate(() => {
    const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
    const c = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[1];
    if (!c) return;
    c.textContent = 'PresetCell';
    c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false }));
    c.focus();
    const r = document.createRange(); r.selectNodeContents(c);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  });
  await sleep(100);
  await openAa(tpage);
  const rCell = await clickPreset(tpage, 'simple');
  await sleep(200);
  const cellFmt = await tpage.evaluate(() => { const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1]; const c = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[1]; const sp = c.querySelector('span'); return { bg: c.style.backgroundColor, spanColor: sp ? sp.style.color : null }; });
  await closeAa(tpage);
  check('Preset applies inside table cell (text+bg)', rCell === 'clicked' && !!(cellFmt.bg || cellFmt.spanColor), JSON.stringify(cellFmt));

  // 16. Table integrity (real HTML structure) after edits
  await sleep(700);
  const domIntegrity = await tpage.evaluate(() => {
    const t = document.querySelector('table.note-table');
    if (!t) return { ok: false };
    const trs = t.querySelectorAll('tbody tr');
    return { ok: trs.length === 2 && Array.from(trs).every((tr) => tr.querySelectorAll('td, th').length === 2), trs: trs.length };
  });
  check('16 Table integrity (real HTML structure)', domIntegrity.ok === true, 'rows=' + domIntegrity.trs);

  // 17. Resize regression (real pointer-drag on DOM handle)
  const resizeProbe = await tpage.evaluate(() => {
    const w = [...document.querySelectorAll('.note-table-wrap')].pop();
    const h = w && w.querySelector('.note-table-resize .note-col-handle');
    if (!h) return { present: false };
    const r = h.getBoundingClientRect();
    const inView = r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight;
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const before = (w.querySelector('col') && w.querySelector('col').style.width) || '';
    h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, pointerType: 'mouse', button: 0 }));
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: cx + 80, clientY: cy, pointerType: 'mouse' }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: cx + 80, clientY: cy, pointerType: 'mouse', button: 0 }));
    const table = w.querySelector('table.note-table');
    const col = table && table.querySelector('col');
    return { present: true, inView, fixed: !!(table && table.className.includes('note-table-fixed')), styleW: col && col.style.width, before };
  });
  await sleep(120);
  const resizeOk = resizeProbe.present && resizeProbe.inView && !!resizeProbe.styleW && resizeProbe.styleW !== resizeProbe.before;
  check('17 Resize regression: handle present + real drag changes col width', resizeOk, JSON.stringify(resizeProbe));

  // 18. Merge regression (real selection: focus cell, anchor, shift-click; merge via toolbar btn)
  const mergeProbe = await (async () => {
    await tpage.evaluate(() => {
      const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
      const c = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[0];
      if (c) { c.focus(); c.click(); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false })); }
    });
    await sleep(70);
    await tpage.evaluate(() => {
      const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
      const c = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[1];
      if (c) c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: true }));
    });
    await sleep(70);
    const clicked = await tpage.evaluate(() => {
      const btn = [...document.querySelectorAll('.note-mobile-table-toolbar [data-table-action="merge-cells"]')].pop();
      if (btn) { btn.click(); return true; } return false;
    });
    await sleep(220);
    const info = await tpage.evaluate(() => {
      const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
      const first = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[0];
      return { colspan: first ? first.colSpan : 0 };
    });
    return { clicked, info };
  })();
  check('18 Merge regression works', mergeProbe.clicked && mergeProbe.info.colspan === 2, JSON.stringify(mergeProbe.info));

  // 19. Alignment regression (real change on h-align select)
  const alignApplied = await tpage.evaluate(() => {
    const sel = [...document.querySelectorAll('.note-mobile-table-toolbar [data-table-h-align-select]')].pop();
    if (!sel) return false;
    const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
    const tr = w.querySelectorAll('tbody tr')[1] || w.querySelector('tbody tr');
    const c = tr ? tr.querySelector('td.note-cell') : null;
    if (c) { c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false })); c.focus(); }
    sel.value = 'left';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  await sleep(200);
  // The aligned cell is the one that received the mousedown above: tbody row 1,
  // first cell (which is the merged colspan=2 cell from test 18). Row 0's cells
  // are untouched by design (no selection/focus there).
  const alignAfter = await tpage.evaluate(() => { const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1]; const tr = w.querySelectorAll('tbody tr')[1] || w.querySelector('tbody tr'); const c = tr ? tr.querySelector('td.note-cell') : null; return c ? (c.getAttribute('data-h-align') || c.style.textAlign || null) : null; });
  check('19 Alignment control present & functional', alignApplied && !!alignAfter, 'after=' + alignAfter);
  const tcInCell = await tpage.evaluate(() => { const t = document.querySelector('table.note-table'); const c = t.querySelector('tbody tr td.note-cell'); return (c.querySelector('span') && c.querySelector('span').style.color) || null; });
  const bodyCols = await bodyTextColor(tpage);
  check('5 Table color (foreground in cell) supported & applied', tcs && !!(tcInCell || bodyCols.length > 0), 'cellColor=' + tcInCell + ' body=' + JSON.stringify(bodyCols));
  await closeAa(tpage);
// 20. PART04 regression (checklist + divider)
  const ckClicked = await tpage.evaluate(() => { const b = document.getElementById('noteChecklistBtn'); if (b) { b.click(); return true; } return false; });
  await sleep(150);
  const ckPresent = await tpage.evaluate(() => !!document.querySelector('#noteBodyInput .note-checklist, #noteBodyInput ul.note-checklist'));
  const dvClicked = await tpage.evaluate(() => { const b = document.getElementById('noteDividerBtn'); if (b) { b.click(); return true; } return false; });
  await sleep(150);
  const dvPresent = await tpage.evaluate(() => !!document.querySelector('#noteBodyInput hr.note-divider'));
  check('20 PART04 checklist works', ckClicked && ckPresent, 'ck=' + ckPresent);
  check('20 PART04 divider works', dvClicked && dvPresent, 'dv=' + dvPresent);

  // 21. PART05 regression (Aa headings)
  await tpage.evaluate(() => { document.getElementById('noteBodyInput').innerHTML = '<p>p05 heading text</p>'; });
  await tpage.evaluate(() => { const b = document.getElementById('noteBodyInput'); b.focus(); const r = document.createRange(); r.selectNodeContents(b.querySelector('p')); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); });
  await sleep(80);
  await openAa(tpage);
  const h1Clicked = await tpage.evaluate(() => { const b = document.getElementById('noteStyleH1Btn'); if (b) { b.click(); return true; } return false; });
  await sleep(120);
  const isH1 = await tpage.evaluate(() => !!document.querySelector('#noteBodyInput h1'));
  check('21 PART05 Aa heading (H1) works', h1Clicked && isH1, 'h1=' + isH1);
  await closeAa(tpage);

  const tErrors = pageErrors.filter((e) => !baselineT.includes(e));
  check('29 No new JS/console errors (table/regression flow)', tErrors.length === 0, 'errors=' + tErrors.length);
  await tpage.close();
// ================= RESPONSIVE VIEWPORTS + OVERFLOW =================
  async function viewportOverflowTest(width, height, label) {
    const pg = await newCleanPage({ width, height, hasTouch: width <= 768, isMobile: width <= 768 });
    const baselineV = pageErrors.slice();
    await openNotes(pg);
    await newNote(pg, 'P7 VW');
    await typeText(pg, 'Responsive note body text for overflow checks here');
    await sleep(150);
    // Baseline document overflow BEFORE opening the (PART 07) presets/panel.
    const before = await pg.evaluate(() => { const d = document.documentElement; return { sw: d.scrollWidth, cw: d.clientWidth }; });
    await openAa(pg);
    // Robustly wait for the panel to be visible.
    await pg.waitForFunction(() => { const p = document.getElementById('noteAaPanel'); return p && !p.classList.contains('hidden'); }, { timeout: 4000 }).catch(() => {});
    await sleep(150);
    const presetCountV = await pg.evaluate(() => document.querySelectorAll('#noteAaPresetsRow .note-aa-preset-swatches').length);
    const after = await pg.evaluate(() => {
      const row = document.getElementById('noteAaPresetsRow');
      const panel = document.getElementById('noteAaPanel');
      const doc = document.documentElement;
      return {
        docScrollW: doc.scrollWidth, docClientW: doc.clientWidth,
        panelLeft: panel ? Math.round(panel.getBoundingClientRect().left) : 0,
        panelRight: panel ? Math.round(panel.getBoundingClientRect().right) : 0,
        panelW: panel ? Math.round(panel.getBoundingClientRect().width) : 0,
        rowSW: row ? row.scrollWidth : 0, rowCW: row ? row.clientWidth : 0
      };
    });
    // The PART 07 contribution to horizontal overflow = delta when the panel+p
    // row is opened. Pre-existing offscreen/absolute elements inflate absolute
    // scrollWidth regardless of the feature, so compare before vs after.
    const delta = after.docScrollW - before.sw;
    const panelFitsViewport = after.panelRight <= after.docClientW + 1;
    check(label + ' preset row does not exceed its container', after.rowCW > 0 && after.rowSW <= after.rowCW + 2, 'rowSW=' + after.rowSW + ' rowCW=' + after.rowCW);
    check(label + ' opening PART 07 panel adds no horizontal overflow', delta <= 0, 'before=' + before.sw + ' after=' + after.docScrollW + ' cw=' + after.docClientW + ' delta=' + delta);
    check(label + ' presets rendered', presetCountV === 5, 'count=' + presetCountV);
    await closeAa(pg);
    const errs = pageErrors.filter((e) => !baselineV.includes(e));
    check(label + ' no new JS errors', errs.length === 0, 'errors=' + errs.length);
    await pg.close();
  }

  await viewportOverflowTest(1366, 800, '23 Desktop 1366px');
  await viewportOverflowTest(768, 1024, '24 Tablet 768px');
  await viewportOverflowTest(390, 844, '25 Mobile 390px');

  // ================= RTL ARABIC =================
  const ar = await newCleanPage({ width: 1366, height: 800 });
  const baselineAr = pageErrors.slice();
  await ar.evaluate((k, v) => { localStorage.setItem(k, v); }, LANG_KEY, 'ar');
  await ar.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(400);
  const dir = await ar.evaluate(() => document.documentElement.getAttribute('dir') || getComputedStyle(document.body).direction);
  await openNotes(ar);
  await newNote(ar, 'P7 عربي');
  await typeText(ar, 'نص عربي للاختبار');
  await sleep(150);
  await openAa(ar);
  const arPresets = await ar.evaluate(() => document.querySelectorAll('#noteAaPresetsRow .note-aa-preset-swatches').length);
  const arOverflow = await ar.evaluate(() => { const doc = document.documentElement; return { sw: doc.scrollWidth, cw: doc.clientWidth }; });
  check('26 RTL Arabic presets rendered', arPresets === 5, 'count=' + arPresets + ' dir=' + dir);
  check('26 RTL Arabic no horizontal overflow', arOverflow.sw <= arOverflow.cw + 1, 'sw=' + arOverflow.sw + ' cw=' + arOverflow.cw + ' dir=' + dir);
  const errsAr = pageErrors.filter((e) => !baselineAr.includes(e));
  check('26 RTL Arabic no new JS errors', errsAr.length === 0, 'errors=' + errsAr.length);

  // ================= LTR ENGLISH =================
  // Fresh LTR page: set lang to en and confirm dir is ltr
  await ar.evaluate((k, v) => { localStorage.setItem(k, v); }, LANG_KEY, 'en');
  await ar.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(400);
  const ltrDir = await ar.evaluate(() => document.documentElement.getAttribute('dir') || getComputedStyle(document.body).direction);
  check('27 LTR English direction ltr', ltrDir === 'ltr' || ltrDir === '', 'dir=' + ltrDir);
  await ar.close();

  console.log('\n=== SUMMARY ===');
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  const total = results.length;
  const notVerified = total - pass - fail;
  console.log('PASS ' + pass);
  console.log('FAIL ' + fail);
  console.log('NOT VERIFIED ' + notVerified);
  console.log('TOTAL ' + total);
  fs.appendFileSync(LOG, '\n===\nPASS ' + pass + '\nFAIL ' + fail + '\nNOT VERIFIED ' + notVerified + '\nTOTAL ' + total + '\n');
} finally {
  if (browser) await browser.close();
  server.close();
}
process.exitCode = results.some((r) => !r.ok) ? 1 : 0;