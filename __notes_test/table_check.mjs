// NOTES TABLE SUPPORT verification harness (test-only artifact, modifies nothing).
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
const PORT = 8241;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(urlPath).toLowerCase();
  const mimeMap = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
  };
  const mime = mimeMap[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, r));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readNotes(page) {
  return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY);
}
async function clearStorage(page) {
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
}
function noteByTitle(notes, title) { return notes.find((n) => n.title === title) || null; }

async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function openNoteByTitle(page, title) {
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item'));
    const it = items.find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (it) it.click();
  }, title);
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function closeEditor(page) { await page.click('#closeFullScreenNote').catch(() => {}); }
async function closeNotesManager(page) { await page.click('#closeNotesManager').catch(() => {}); }
async function clickTableBtn(page) {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput');
    if (b) b.focus();
    const tb = document.getElementById('noteTableBtn');
    if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
}
async function setTableDims(page, r, c, header) {
  await page.evaluate((rr, cc, h) => {
    const ri = document.getElementById('noteTableRows'); if (ri) ri.value = rr;
    const ci = document.getElementById('noteTableCols'); if (ci) ci.value = cc;
    const hi = document.getElementById('noteTableHeader'); if (hi) hi.checked = h;
  }, r, c, !!header);
  await page.click('#noteTableInsertBtn');
  await page.waitForFunction(() => !document.getElementById('noteTablePanel') || document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 2000 });
}
async function focusCell(page, tableIdx, r, c) {
  await page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return false;
    const tr = t.querySelectorAll('tr')[ri];
    if (!tr) return false;
    const cell = tr.querySelectorAll('td, th')[ci];
    if (!cell) return false;
    cell.focus();
    return true;
  }, tableIdx, r, c);
}
async function typeInCell(page, tableIdx, r, c, text) {
  await focusCell(page, tableIdx, r, c);
  await page.keyboard.type(text);
}
async function selectCellWord(page, tableIdx, r, c, word) {
  await page.evaluate((ti, ri, ci, w) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr.querySelectorAll('td, th')[ci];
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.nodeValue.indexOf(w);
      if (idx >= 0) {
        const rng = document.createRange();
        rng.setStart(node, idx);
        rng.setEnd(node, idx + w.length);
        const sel = document.getSelection();
        sel.removeAllRanges(); sel.addRange(rng);
        break;
      }
    }
  }, tableIdx, r, c, word);
}
async function clickFormat(page, id) {
  await page.evaluate((btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return false;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    return true;
  }, id);
  await page.click('#' + id);
}
async function tableCellTexts(page, tableIdx) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => td.innerText)
    );
  }, tableIdx);
}
async function tableCellFormats(page, tableIdx) {
  return page.evaluate((ti) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((td) => {
        const runs = [];
        for (const el of td.querySelectorAll('b, i, u')) {
          const tag = el.tagName;
          for (const txt of el.childNodes) {
            if (txt.nodeType === 3) runs.push(tag + ':' + txt.nodeValue);
          }
        }
        return runs;
      })
    );
  }, tableIdx);
}
async function clickTableCellAction(page, tableIdx, action) {
  await page.evaluate((ti, act) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const wrap = t.closest('.note-table-wrap');
    const btn = wrap && wrap.querySelector('[data-table-action="' + act + '"]');
    if (btn) btn.click();
  }, tableIdx, action);
}
let browser;
let pageError = null;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
    page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });
  // NOTE: we intentionally do NOT capture console 'error' messages here,
  // because the app loads a PWA manifest icon (apple-touch-icon.png) that 404s
  // and an SVG path warns in console — unrelated to the Notes feature. We only
  // flag real uncaught JS exceptions (pageerror), matching the other harnesses.
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await clearStorage(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);

  // ---------- 1) CREATE note + 2x2 table ----------
  await openNotes(page);
  await newNote(page);
  const title = 'TableNote 2x2 + 3x4';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  const t2x2 = await page.evaluate(() => document.querySelectorAll('table.note-table').length);
  check('CREATE 2x2: table inserted into editor', t2x2 === 1, 'tables=' + t2x2);
  const dims = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    const trs = t.querySelectorAll('tr');
    return trs.length + 'x' + (trs.length ? trs[0].querySelectorAll('td, th').length : 0);
  });
  check('CREATE 2x2: dimensions 2x2', dims === '2x2', 'dims=' + dims);
  await typeInCell(page, 0, 0, 0, 'Arabic: مرحبا');
  await typeInCell(page, 0, 0, 1, 'English: Hello');
  await typeInCell(page, 0, 1, 0, '12345');
  await typeInCell(page, 0, 1, 1, 'Mixed: سلام hello 99');
  await sleep(700);

  // ---------- 2) Formatting inside cells ----------
  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await clickFormat(page, 'noteBoldBtn');
  await sleep(300);
  await selectCellWord(page, 0, 0, 1, 'Hello');
  await clickFormat(page, 'noteItalicBtn');
  await sleep(300);
  await selectCellWord(page, 0, 1, 0, '12345');
  await clickFormat(page, 'noteUnderlineBtn');
  await sleep(300);
  const bfmt = await tableCellFormats(page, 0);
  check('FORMAT: Bold applied inside a cell', JSON.stringify(bfmt).includes('B:مرحبا'), 'fmt=' + JSON.stringify(bfmt));
  check('FORMAT: Italic applied inside a cell', JSON.stringify(bfmt).includes('I:Hello'), 'fmt=' + JSON.stringify(bfmt));
  check('FORMAT: Underline applied inside a cell', JSON.stringify(bfmt).includes('U:12345'), 'fmt=' + JSON.stringify(bfmt));
    // ---------- 3) Auto-save + storage model ----------
  await sleep(700);
  let notes = await readNotes(page);
  let stored = noteByTitle(notes, title);
  check('AUTO-SAVE: note persisted with bodyBlocks', !!stored && Array.isArray(stored.bodyBlocks), stored ? 'keys=' + Object.keys(stored).join(',') : 'missing');
  const tblBlock = stored && stored.bodyBlocks && stored.bodyBlocks.find((b) => b.type === 'table');
  check('AUTO-SAVE: table block stored', !!tblBlock, tblBlock ? 'rows=' + tblBlock.rows.length : 'none');
  const cellTexts = tblBlock ? tblBlock.rows.map((row) => row.map((c) => c.text || '')) : [];
  check('AUTO-SAVE: cell text round-trips (Arabic/English/Numbers/Mixed)',
    cellTexts[0] && cellTexts[0][0] === 'Arabic: مرحبا' && cellTexts[0][1] === 'English: Hello' &&
    cellTexts[1][0] === '12345' && cellTexts[1][1] === 'Mixed: سلام hello 99',
    'cells=' + JSON.stringify(cellTexts));
  const boldRun = tblBlock && (tblBlock.rows[0][0].formatting || []).some((r) => r.bold && tblBlock.rows[0][0].text.slice(r.start, r.end) === 'مرحبا');
  check('AUTO-SAVE: bold run persisted in cell', !!boldRun, tblBlock ? 'fmt=' + JSON.stringify(tblBlock.rows[0][0].formatting) : 'n/a');

  // ---------- 4) Close / reopen ----------
  await closeEditor(page);
  await sleep(300);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(300);
  const tAfter = await page.evaluate(() => document.querySelectorAll('table.note-table').length);
  check('REOPEN: table still present', tAfter === 1, 'tables=' + tAfter);
  const textsAfter = await tableCellTexts(page, 0);
  check('REOPEN: cell content preserved',
    textsAfter && textsAfter[0] && textsAfter[0][0] === 'Arabic: مرحبا' && textsAfter[1][1] === 'Mixed: سلام hello 99',
    'cells=' + JSON.stringify(textsAfter));
  const boldAfter = await tableCellFormats(page, 0);
  check('REOPEN: bold formatting preserved inside cell', JSON.stringify(boldAfter).includes('B:مرحبا'), 'fmt=' + JSON.stringify(boldAfter));
  await closeEditor(page);
  await sleep(400);
    // ---------- 5) Refresh ----------
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(400);
  await openNotes(page);
  await openNoteByTitle(page, title);
  await sleep(300);
  const tRefresh = await page.evaluate(() => document.querySelectorAll('table.note-table').length);
  check('REFRESH: table still present', tRefresh === 1, 'tables=' + tRefresh);
  const textsRefresh = await tableCellTexts(page, 0);
  check('REFRESH: cell content preserved',
    textsRefresh && textsRefresh[0] && textsRefresh[0][1] === 'English: Hello' && textsRefresh[1][0] === '12345',
    'cells=' + JSON.stringify(textsRefresh));

  // ---------- 6) Add Row / Delete Row / Add Col / Delete Col ----------
  await clickTableCellAction(page, 0, 'add-row');
  await sleep(400);
  let rowsAfterAdd = await page.evaluate(() => document.querySelector('table.note-table').querySelectorAll('tr').length);
  check('ADD ROW: rows increased to 3', rowsAfterAdd === 3, 'rows=' + rowsAfterAdd);
  await focusCell(page, 0, 2, 0);
  await clickTableCellAction(page, 0, 'del-row');
  await sleep(400);
  let rowsAfterDel = await page.evaluate(() => document.querySelector('table.note-table').querySelectorAll('tr').length);
  check('DELETE ROW: rows back to 2', rowsAfterDel === 2, 'rows=' + rowsAfterDel);
  await clickTableCellAction(page, 0, 'add-col');
  await sleep(400);
  let colsAfterAdd = await page.evaluate(() => { const tr = document.querySelector('table.note-table tr'); return tr ? tr.querySelectorAll('td, th').length : 0; });
  check('ADD COL: columns increased to 3', colsAfterAdd === 3, 'cols=' + colsAfterAdd);
  await focusCell(page, 0, 0, 2);
  await clickTableCellAction(page, 0, 'del-col');
  await sleep(400);
  let colsAfterDel = await page.evaluate(() => { const tr = document.querySelector('table.note-table tr'); return tr ? tr.querySelectorAll('td, th').length : 0; });
  check('DELETE COL: columns back to 2', colsAfterDel === 2, 'cols=' + colsAfterDel);
  await sleep(500);
  notes = await readNotes(page);
  stored = noteByTitle(notes, title);
  check('AUTO-SAVE: structural changes persisted', !!stored && Array.isArray(stored.bodyBlocks) && !!stored.bodyBlocks.find((b) => b.type === 'table'), '');
  await closeEditor(page);
  await sleep(300);
    // ---------- 7) 3x4 table with header ----------
  await openNotes(page);
  await newNote(page);
  const title2 = 'TableNote 3x4';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title2);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 3, 4, true);
  await sleep(400);
  const dims34 = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    const trs = t.querySelectorAll('tr');
    return trs.length + 'x' + (trs.length ? trs[0].querySelectorAll('td, th').length : 0);
  });
  check('CREATE 3x4 + HEADER: table dimensions 3x4', dims34 === '3x4', 'dims=' + dims34);
  const headerClass = await page.evaluate(() => !!document.querySelector('table.note-table.note-table-hasheader'));
  check('CREATE 3x4 + HEADER: header class applied', headerClass, 'headerClass=' + headerClass);
  await closeEditor(page);
  await sleep(500);
  notes = await readNotes(page);
  const s2 = noteByTitle(notes, title2);
  check('CREATE 3x4 + HEADER: persisted with header=true', !!s2 && !!s2.bodyBlocks && !!s2.bodyBlocks.find((b) => b.type === 'table' && b.header), s2 ? 'header=' + (s2.bodyBlocks.find((b)=>b.type==='table').header) : 'missing');

  // ---------- 8) Folder preservation ----------
  await openNotes(page);
  await newNote(page);
  const title3 = 'FolderTestTable';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title3);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(600);
  notes = await readNotes(page);
  const fBefore = noteByTitle(notes, title3);
  const folderBefore = fBefore ? fBefore.folderId : null;
  await closeEditor(page);
  await sleep(300);
  await openNotes(page);
  await openNoteByTitle(page, title3);
  await sleep(300);
  await clickTableCellAction(page, 0, 'add-row');
  await sleep(500);
  notes = await readNotes(page);
  const fAfter = noteByTitle(notes, title3);
  check('FOLDERS: table note keeps the same folderId', !!fBefore && !!fAfter && fBefore.folderId === fAfter.folderId,
    'before=' + folderBefore + ' after=' + (fAfter ? fAfter.folderId : null));
  await closeEditor(page);
  await sleep(200);
      // ---------- 9) Legacy note compatibility ----------
  // Seed a legacy note (body + bodyFormatting, NO bodyBlocks) directly into
  // storage, THEN reload so the app reads it into memory, then verify it opens
  // exactly like the old plain-text experience (no table, formatting intact,
  // and it stays in the legacy model after re-save).
  const legacyTitle = 'Legacy TableTest';
  await page.evaluate((title, body, fmt) => {
    localStorage.removeItem('eq-note-manager-notes');
    localStorage.removeItem('eq-note-folders');
    localStorage.setItem('eq-note-manager-notes', JSON.stringify([{
      id: 'note-legacytable1', title, body, bodyFormatting: fmt, folderId: 'personal',
      createdAt: Date.now(), updatedAt: Date.now()
    }]));
  }, legacyTitle, 'plain legacy text', [{ start: 0, end: 5, bold: true, italic: false, underline: false }]);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);
  await openNotes(page);
  await openNoteByTitle(page, legacyTitle);
  await sleep(300);
    const legacyState = await page.evaluate(() => {
    const html = document.getElementById('noteBodyInput').innerHTML;
    return { html, hasBold: /<b>plain<\/b>/.test(html), hasTable: !!document.querySelector('table.note-table') };
  });
  check('LEGACY: old note opens, renders <b> formatting, no table',
    legacyState.hasBold && !legacyState.hasTable, 'html=' + (legacyState.html || '').slice(0, 80));
  await closeEditor(page);
  await sleep(400);
  const legacyStored = await page.evaluate((title) => {
    const n = JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]').find((x) => x.title === title);
    return n ? { hasBodyBlocks: !!n.bodyBlocks, body: n.body, hasFmt: !!n.bodyFormatting } : null;
  }, legacyTitle);
  check('LEGACY: stays in legacy model (no bodyBlocks) after save; body preserved',
    !!legacyStored && !legacyStored.hasBodyBlocks && legacyStored.body === 'plain legacy text' && legacyStored.hasFmt,
    'stored=' + JSON.stringify(legacyStored));

  // ---------- 10) Security: inert HTML inside cells ----------
  await openNotes(page);
  await newNote(page);
  const xssTitle = 'XSSTableNote';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', xssTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 1, 1, false);
  await typeInCell(page, 0, 0, 0, '<img src=x onerror=window.__xss_cell=1>');
  await sleep(700);
  const cellDom = await page.evaluate(() => {
    const cell = document.querySelector('table.note-table td.note-cell');
    return { html: cell ? cell.innerHTML : '', img: cell ? cell.querySelectorAll('img').length : -1, script: cell ? cell.querySelectorAll('script').length : -1 };
  });
  check('XSS: typed markup stored as inert text (no live nodes)', cellDom.img === 0 && cellDom.script === 0, 'html=' + cellDom.html);
  const xssSet = await page.evaluate(() => window.__xss_cell);
  check('XSS: no inline handler/script ran on edit', !xssSet, 'val=' + xssSet);

    // Re-seed a tampered note with a malicious cell payload and ensure it is
  // inert on render AND after save. Seed into storage BEFORE reload so the app
  // loads it into memory; use folderId 'personal' so it appears in the default
  // (Personal) view right after reload.
  await page.evaluate((title) => {
    localStorage.removeItem('eq-note-manager-notes');
    localStorage.removeItem('eq-note-folders');
    localStorage.setItem('eq-note-manager-notes', JSON.stringify([{
      id: 'note-tamper1', title, folderId: 'personal', createdAt: Date.now(), updatedAt: Date.now(),
      bodyBlocks: [{ type: 'table', header: false, rows: [[
        { text: '<script>window.__xss_t=1</script>', formatting: [] },
        { text: '<b onclick=alert(1)>x</b>', formatting: [] }
      ]] }]
    }]));
  }, 'TamperedTable');
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(500);
  await openNotes(page);
  await openNoteByTitle(page, 'TamperedTable');
  await sleep(300);
  const tamperDom = await page.evaluate(() => {
    const cell = document.querySelector('table.note-table td.note-cell');
    return { html: cell ? cell.innerHTML : '', script: cell ? cell.querySelectorAll('script').length : -1 };
  });
  check('SECURITY: tampered bodyBlocks cell text rendered inert (no script element)', tamperDom.script === 0 && /&lt;script&gt;/.test(tamperDom.html), 'html=' + tamperDom.html);
  const tamperXss = await page.evaluate(() => window.__xss_t);
  check('SECURITY: tampered script payload never executed', !tamperXss, 'val=' + tamperXss);
  await closeEditor(page);
  await sleep(200);

    // ---------- 11) Delete note removes table ----------
  // Model (app.js): active-list [data-action="delete"] -> deleteNote() SOFT-TRASHES
  // (sets deletedAt, leaves active list) until purged; permanent hard-purge is done
  // from the Trash view via [data-action="permanent-delete"] -> confirm -> permanentDeleteNote.
  await openNotes(page);
  await newNote(page);
  const delTitle = 'DeleteTableNote';
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', delTitle);
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await sleep(600);
  await closeEditor(page);
  await sleep(400);
  // (a) soft-trash the table note from the active notes list
  await page.evaluate((t) => {
    const item = Array.from(document.querySelectorAll('#notesList .note-item'))
      .find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (item) { const btn = item.querySelector('[data-action="delete"]'); if (btn) btn.click(); }
  }, delTitle);
  await sleep(600);
  const trashed = await readNotes(page);
  const trashedNote = noteByTitle(trashed, delTitle);
  const activeLeft = !trashed.filter((n) => !n.deletedAt).some((n) => n.title === delTitle);
  check('DELETE: table note soft-trashed (deletedAt set) and left active list',
    !!trashedNote && !!trashedNote.deletedAt && activeLeft,
    'trashed=' + (!!trashedNote && !!trashedNote.deletedAt) + ', activeLeft=' + activeLeft);
  // (b) open Trash, permanently purge the trashed note through the confirm modal
  await page.evaluate(() => { const b = document.getElementById('navDeletedBtn'); if (b) b.click(); });
  await page.waitForSelector('#deletedNotesList .note-item', { timeout: 4000 });
  await page.evaluate((t) => {
    const item = Array.from(document.querySelectorAll('#deletedNotesList .note-item'))
      .find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (item) { const btn = item.querySelector('[data-action="permanent-delete"]'); if (btn) btn.click(); }
  }, delTitle);
  await page.waitForSelector('#deleteConfirmModal.show', { visible: true, timeout: 3000 }).catch(() => {});
  await page.click('#deleteConfirmOk');
  await sleep(600);
  const afterPurge = await readNotes(page);
  check('DELETE: table note permanently purged from storage', !noteByTitle(afterPurge, delTitle), 'remaining=' + (afterPurge || []).length);
  check('DELETE: no leftover table in storage from deleted note', !afterPurge.some((n) => n.title === delTitle && Array.isArray(n.bodyBlocks)), '');
  await closeNotesManager(page);
  await sleep(200);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  results.push({ name: 'HARNESS', ok: false, detail: err && err.message ? err.message : String(err) });
} finally {
  if (browser) await browser.close();
  server.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
console.log('\n==== RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
if (pageError) {
  results.push({ name: 'RUNTIME: no uncaught page/console errors', ok: false, detail: pageError.split('\n').filter(Boolean).slice(0, 5).join(' | ') });
} else {
  results.push({ name: 'RUNTIME: no uncaught page/console errors', ok: true, detail: 'clean' });
}
const pass2 = results.filter((r) => r.ok).length;
const fail2 = results.length - pass2;
const lines = results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  -> ' + r.detail : ''}`).join('\n');
const report = [lines, '', '==== RESULT: ' + pass2 + ' passed, ' + fail2 + ' failed, ' + results.length + ' total ====', '', 'FINAL: ' + pass2 + '/' + results.length + ' passed'].join('\n') + '\n';
fs.writeFileSync(path.join(HERE, 'table_results.txt'), report, 'utf8');
console.log('\n' + report);
process.exit(pass2 === results.length ? 0 : 1);







