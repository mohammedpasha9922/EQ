// CELL BG COLOR PALETTE — runtime browser verification (test-only artifact,
// modifies nothing in app code). Follows the existing __notes_test probe
// conventions (local http server + system Chrome via puppeteer-core).
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
const PORT = 8757;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fail = 0;
let passCount = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (ok) passCount++; else fail++;
}

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const ext = path.extname(f).toLowerCase();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': (mime[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) {
    if (!res.headersSent) { res.writeHead(404); res.end('nf'); }
  }
});
await new Promise((r) => server.listen(PORT, r));

async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
}
async function insertTable(page, rows, cols) {
  await page.click('#noteBodyInput');
  await page.click('#noteTableBtn');
  await page.waitForFunction(() => { const p = document.getElementById('noteTablePanel'); return p && !p.classList.contains('hidden'); }, { timeout: 3000 });
  await page.evaluate((r, c) => {
    document.getElementById('noteTableRows').value = String(r);
    document.getElementById('noteTableCols').value = String(c);
    document.getElementById('noteTableHeader').checked = false;
  }, rows, cols);
  await page.click('#noteTableInsertBtn');
  await page.waitForFunction(() => document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 3000 });
}
async function clickCell(page, idx) {
  await page.evaluate((i) => {
    const cells = document.querySelectorAll('table.note-table tr td');
    if (cells[i]) cells[i].focus();
  }, idx);
  const handle = await page.$(`table.note-table tr td:nth-child(${idx + 1})`);
  const box = await handle.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(150);
}
function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
async function openCellBgPalette(page, cellIdx) {
  await clickCell(page, cellIdx);
  await page.click('#noteCellBgColorBtn');
  await sleep(120);
}
const C1 = '#fff9c4'; // light yellow
const C2 = '#c8e6c9'; // light green
const C3 = '#bbdefb'; // light blue

let browser = null;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on('pageerror', (e) => console.log('   [PAGEERROR] ' + e.message));
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(400);

  // Clean state
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);

  await openNotes(page);
  await newNote(page);
  await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'CellBg Palette Probe'; });
  await insertTable(page, 1, 3);
  await page.evaluate(() => {
    const cells = document.querySelectorAll('table.note-table tr td');
    if (cells[0]) cells[0].textContent = 'LEFT';
    if (cells[1]) cells[1].textContent = 'MID';
    if (cells[2]) cells[2].textContent = 'RIGHT';
  });

  // ---- Button presence & style contract ----
  const btnInfo = await page.evaluate(() => {
    const b = document.getElementById('noteCellBgColorBtn');
    if (!b) return null;
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const svg = b.querySelector('svg');
    return { cls: b.className, bg: cs.backgroundColor, border: cs.borderStyle, shadow: cs.boxShadow, w: Math.round(r.width), h: Math.round(r.height), svgSize: svg ? svg.getAttribute('width') : null };
  });
  check('Button exists in existing toolbar with note-format-btn class', !!btnInfo && btnInfo.cls.includes('note-format-btn'));
  check('Button ghost/minimal style: no visible background', btnInfo && (btnInfo.bg === 'rgba(0, 0, 0, 0)' || btnInfo.bg === 'transparent'), 'bg=' + (btnInfo && btnInfo.bg));
  check('Button has no visible box-shadow', btnInfo && (btnInfo.shadow === 'none' || btnInfo.shadow === ''), 'shadow=' + (btnInfo && btnInfo.shadow));
  check('Button hit area >= 32x32', btnInfo && btnInfo.w >= 32 && btnInfo.h >= 32, `w=${btnInfo && btnInfo.w} h=${btnInfo && btnInfo.h}`);
  check('Icon around 16px', btnInfo && btnInfo.svgSize === '16');

  // ---- Flow 1: palette appears on click ----
  const disabledBefore = await page.evaluate(() => document.getElementById('noteCellBgColorBtn').disabled);
  check('Button disabled before any cell selected', disabledBefore === true);
  await openCellBgPalette(page, 0);
  const palOpen = await page.evaluate(() => {
    const p = document.getElementById('noteCellBgColorPalette');
    return p ? !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none' : false;
  });
  check('Palette appears after selecting a cell and pressing the button', palOpen === true);
  const swatchCount = await page.evaluate(() => document.querySelectorAll('#noteCellBgColorPalette .note-cell-bg-color-swatch').length);
  check('Palette shows organized color swatches (14)', swatchCount === 14, 'count=' + swatchCount);

  // ---- Flow 1: pick a color -> selected cell only, palette closes ----
  await page.evaluate((h) => { document.querySelector(`#noteCellBgColorPalette [data-color="${h}"]`).click(); }, C1);
  await sleep(180);
  const cellBgsAfterPick = await page.evaluate(() => Array.from(document.querySelectorAll('table.note-table tr td')).map((td) => td.style.backgroundColor || '(none)'));
  check(`Cell[0] gets chosen color (${rgbOf(C1)})`, cellBgsAfterPick[0] === rgbOf(C1), cellBgsAfterPick[0]);
  check('Neighbors unchanged', cellBgsAfterPick[1] === '(none)' && cellBgsAfterPick[2] === '(none)', JSON.stringify(cellBgsAfterPick));
  const textPreserved = await page.evaluate(() => document.querySelectorAll('table.note-table tr td')[0].textContent);
  check('Cell content untouched by background change', textPreserved === 'LEFT', textPreserved);
  const palClosedAfterPick = await page.evaluate(() => document.getElementById('noteCellBgColorPalette').classList.contains('hidden'));
  check('Palette auto-closes after choosing a color', palClosedAfterPick === true);

  // ---- Flow 2: second cell, different color, first unchanged ----
  await openCellBgPalette(page, 1);
  await page.evaluate((h) => { document.querySelector(`#noteCellBgColorPalette [data-color="${h}"]`).click(); }, C2);
  await sleep(180);
  const twoCells = await page.evaluate(() => Array.from(document.querySelectorAll('table.note-table tr td')).map((td) => td.style.backgroundColor || '(none)'));
  check(`Second cell gets its own color (${rgbOf(C2)})`, twoCells[1] === rgbOf(C2), twoCells[1]);
  check('First cell NOT changed by second pick', twoCells[0] === rgbOf(C1), twoCells[0]);

  // ---- Flow 3: replace color of SAME cell ----
  await openCellBgPalette(page, 1);
  await page.evaluate((h) => { document.querySelector(`#noteCellBgColorPalette [data-color="${h}"]`).click(); }, C3);
  await sleep(180);
  const replaced = await page.evaluate(() => Array.from(document.querySelectorAll('table.note-table tr td')).map((td) => td.style.backgroundColor || '(none)'));
  check(`Same-cell new color REPLACES old (${rgbOf(C3)})`, replaced[1] === rgbOf(C3), replaced[1]);
  check('Other cells still intact after replacement', replaced[0] === rgbOf(C1) && replaced[2] === '(none)', JSON.stringify(replaced));

  // ---- Flow 4: outside click closes WITHOUT applying ----
  await openCellBgPalette(page, 2);
  await page.mouse.click(10, 300);
  await sleep(150);
  const closedOutside = await page.evaluate(() => document.getElementById('noteCellBgColorPalette').classList.contains('hidden'));
  const cell2Untouched = await page.evaluate(() => document.querySelectorAll('table.note-table tr td')[2].style.backgroundColor || '(none)');
  check('Outside click closes palette', closedOutside === true);
  check('Outside click does NOT apply any color', cell2Untouched === '(none)', cell2Untouched);

  // ---- B/I/U still work ----
  await page.evaluate(() => {
    const td = document.querySelectorAll('table.note-table tr td')[0];
    const range = document.createRange();
    range.selectNodeContents(td.firstChild || td);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  });
  await page.click('#noteBoldBtn');
  await page.click('#noteItalicBtn');
  await page.click('#noteUnderlineBtn');
  await sleep(120);
  const biu = await page.evaluate(() => {
    const td = document.querySelectorAll('table.note-table tr td')[0];
    return { b: !!td.querySelector('b, span>b'), i: !!td.querySelector('i, span>i'), u: !!td.querySelector('u, span>u') };
  });
  check('Bold still works', biu.b === true, JSON.stringify(biu));
  check('Italic still works', biu.i === true, JSON.stringify(biu));
  check('Underline still works', biu.u === true, JSON.stringify(biu));

  // ---- Text Color still works ----
  await page.evaluate(() => {
    const td = document.querySelectorAll('table.note-table tr td')[1];
    const range = document.createRange();
    range.selectNodeContents(td.firstChild || td);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  });
  await page.click('#noteTextColorBtn');
  await sleep(120);
  await page.evaluate(() => { document.querySelector('#noteTextColorPalette [data-color="#e53935"]').click(); });
  await sleep(160);
  const tcApplied = await page.evaluate(() => {
    const td = document.querySelectorAll('table.note-table tr td')[1];
    const sp = td.querySelector('span[style*="color"]');
    return sp ? getComputedStyle(sp).color : '(none)';
  });
  check('Text Color still applies to selection', tcApplied === 'rgb(229, 57, 53)', tcApplied);

  // ---- Table editing still works (add-row action) ----
  await clickCell(page, 0);
  const addRowOk = await page.evaluate(async () => {
    const before = document.querySelectorAll('table.note-table tr').length;
    const ctl = document.querySelector('.note-mobile-table-toolbar [data-table-action="add-row"], .note-table-ctl[data-table-action="add-row"]');
    if (!ctl) return 'no-ctl';
    ctl.click();
    await new Promise((r) => setTimeout(r, 250));
    return document.querySelectorAll('table.note-table tr').length > before;
  });
  check('Table editing (add row) still works', addRowOk === true, String(addRowOk));

  // ---- Persistence: save -> close -> reopen ----
  await sleep(1300); // autosave debounce
  await page.click('#saveFullScreenNote');
  await sleep(800);
  await page.click('#closeFullScreenNote');
  await sleep(500);
  async function reopenProbeNote() {
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.note-item, [data-note-id], .notes-list-item, .note-card'));
      for (const it of items) { if ((it.textContent || '').indexOf('CellBg Palette Probe') !== -1) { it.click(); return; } }
      const any = document.querySelector('.note-item, [data-note-id], .notes-list-item, .note-card');
      if (any) any.click();
    });
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
    await sleep(500);
    return page.evaluate(() => Array.from(document.querySelectorAll('table.note-table tr td')).slice(0, 3).map((td) => td.style.backgroundColor || '(none)'));
  }
  const reopened = await reopenProbeNote();
  check('Reopen: cell colors persist after Save+Close+Reopen', reopened[0] === rgbOf(C1) && reopened[1] === rgbOf(C3), JSON.stringify(reopened));

  // ---- Persistence: page refresh ----
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(500);
  await openNotes(page);
  const afterRefresh = await reopenProbeNote();
  check('Refresh: cell colors survive full page reload', afterRefresh[0] === rgbOf(C1) && afterRefresh[1] === rgbOf(C3), JSON.stringify(afterRefresh));
  const storedModel = await page.evaluate((k) => {
    const data = JSON.parse(localStorage.getItem(k) || '[]');
    const note = Array.isArray(data) ? data.find((n) => n.title === 'CellBg Palette Probe') : null;
    const tbl = note && Array.isArray(note.bodyBlocks) ? note.bodyBlocks.find((b) => b.type === 'table') : null;
    return tbl ? tbl.rows.map((row) => row.map((c) => c.backgroundColor || null)) : null;
  }, STORAGE_KEY);
  check('Stored model holds backgroundColor on correct cells', !!storedModel && storedModel[0][0] === C1 && storedModel[0][1] === C3 && storedModel[0][2] == null, JSON.stringify(storedModel));

  // ---- Responsive matrix (desktop/tablet sizes don't toggle isMobile -> no reload) ----
  const desktopSizes = [[1280, 800], [768, 800]];
  for (const dir of ['ltr', 'rtl']) {
    for (const [w, h] of desktopSizes) {
      await page.setViewport({ width: w, height: h });
      await sleep(300);
      await page.evaluate((d) => { document.documentElement.setAttribute('dir', d); }, dir);
      await sleep(800);
      // Pre-existing PWA SW behavior can trigger controllerchange->reload during
      // the session; if the editor got reset by such a reload, re-open the note.
      const modalShown = await page.evaluate(() => { const el = document.getElementById('fullScreenNoteModal'); return !!el && el.classList.contains('show'); });
      if (!modalShown) { await openNotes(page); await reopenProbeNote(); }
      const palWasOpen = await page.evaluate(() => { const p = document.getElementById('noteCellBgColorPalette'); return p && !p.classList.contains('hidden'); });
      if (palWasOpen) { await page.click('#noteCellBgColorBtn'); await sleep(100); } // toggle close
      await clickCell(page, 0);
      let isOpen = await page.evaluate(() => { const p = document.getElementById('noteCellBgColorPalette'); return p && !p.classList.contains('hidden'); });
      if (!isOpen) { await page.click('#noteCellBgColorBtn'); await sleep(120); }
      const m = await page.evaluate(() => {
        const docEl = document.documentElement;
        const p = document.getElementById('noteCellBgColorPalette');
        const r = p.getBoundingClientRect();
        const btn = document.getElementById('noteCellBgColorBtn').getBoundingClientRect();
        return {
          overflowX: docEl.scrollWidth > docEl.clientWidth + 1,
          palInVp: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
          palVisible: !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none',
          btnW: Math.round(btn.width)
        };
      });
      const label = `${dir.toUpperCase()} ${w}x${h}`;
      check(`${label}: no horizontal overflow`, !m.overflowX);
      check(`${label}: palette visible & fully inside viewport`, m.palVisible && m.palInVp, JSON.stringify(m));
      check(`${label}: button hit area comfortable`, m.btnW >= 32, `btnW=${m.btnW}`);
      await page.click('#noteCellBgColorBtn'); // toggle close
      await sleep(100);
    }
  }

  // ---- Mobile / coarse-pointer sessions (fresh page per size, like existing probes) ----
  async function mobileSession(w, h, dir) {
    const mp = await browser.newPage();
    await mp.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await mp.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36');
    // Coarse-pointer emulation BEFORE app.js runs (same trick as mobile_toolbar_check.mjs).
    await mp.evaluateOnNewDocument(() => {
      const realMM = window.matchMedia.bind(window);
      window.matchMedia = (q) => {
        if (/pointer/.test(q)) return { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; } };
        return realMM(q);
      };
      try { Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 10 }); } catch (e) {}
    });
    try {
      await mp.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
      await sleep(700);
      // Tolerate a pre-existing PWA service-worker controllerchange->reload that
      // can land mid-setup: retry the setup until the editor holds a real table.
      let ready = false;
      for (let i = 0; i < 3 && !ready; i++) {
        try {
          const shown = await mp.evaluate(() => { const el = document.getElementById('fullScreenNoteModal'); return !!el && el.classList.contains('show'); });
          if (!shown) { await openNotes(mp); await newNote(mp); await insertTable(mp, 1, 3); }
          else { await insertTable(mp, 1, 3); }
          ready = await mp.evaluate(() => !!document.querySelector('#noteBodyInput table.note-table'));
        } catch (e) { ready = false; await sleep(900); }
      }
      if (!ready) throw new Error('mobileSession setup failed after retries');
      // Tap cell[0] then tap the Cell Background Color button.
      await clickCell(mp, 0);
      await mp.evaluate((dd) => { document.documentElement.setAttribute('dir', dd); }, dir);
      await sleep(150);
      await mp.click('#noteCellBgColorBtn');
      await sleep(150);
      return mp.evaluate(() => {
        const docEl = document.documentElement;
        const p = document.getElementById('noteCellBgColorPalette');
        const r = p.getBoundingClientRect();
        const btn = document.getElementById('noteCellBgColorBtn').getBoundingClientRect();
        return {
          overflowX: docEl.scrollWidth > docEl.clientWidth + 1,
          palInVp: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
          palVisible: !p.classList.contains('hidden') && getComputedStyle(p).display !== 'none',
          btnW: Math.round(btn.width),
          btnH: Math.round(btn.height)
        };
      });
    } finally { await mp.close(); }
  }

  for (const dir of ['ltr', 'rtl']) {
    for (const [w, h] of [[430, 900], [390, 844], [360, 720]]) {
      const m = await mobileSession(w, h, dir);
      const label = `${dir.toUpperCase()} ${w}x${h} (touch)`;
      check(`${label}: no horizontal overflow`, !m.overflowX);
      check(`${label}: palette opens on tap & stays inside viewport`, m.palVisible && m.palInVp, JSON.stringify(m));
      check(`${label}: button hit area comfortable`, m.btnW >= 32 && m.btnH >= 32, `btnW=${m.btnW} btnH=${m.btnH}`);
    }
  }

  // ---- Mobile pick-color flow on one representative session ----
  const pickPageSession = await browser.newPage();
  {
    const mp = pickPageSession;
    await mp.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await mp.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
    await sleep(700);
    let ready = false;
    for (let i = 0; i < 3 && !ready; i++) {
      try {
        const shown = await mp.evaluate(() => { const el = document.getElementById('fullScreenNoteModal'); return !!el && el.classList.contains('show'); });
        if (!shown) { await openNotes(mp); await newNote(mp); }
        await insertTable(mp, 1, 3);
        ready = await mp.evaluate(() => !!document.querySelector('#noteBodyInput table.note-table'));
      } catch (e) { ready = false; await sleep(900); }
    }
    if (!ready) throw new Error('mobile pick session setup failed after retries');
    await sleep(200);
    await clickCell(mp, 2);
    await mp.click('#noteCellBgColorBtn');
    await sleep(150);
    const visOk = await mp.evaluate(() => !document.getElementById('noteCellBgColorPalette').classList.contains('hidden'));
    check('Mobile coarse-pointer: palette opens on tap', visOk === true);
    await mp.evaluate(() => { document.querySelector('#noteCellBgColorPalette [data-color="#ffcdd2"]').click(); });
    await sleep(180);
    const applied = await mp.evaluate(() => document.querySelectorAll('table.note-table tr td')[2].style.backgroundColor || '(none)');
    check('Mobile coarse-pointer: picked color lands on tapped cell only', applied === rgbOf('#ffcdd2'), applied);
  }
  await pickPageSession.close();

  console.log('\nCELLBG PALETTE PROBE SUMMARY passes=' + passCount + ' failures=' + fail);
} finally {
  if (browser) await browser.close();
  server.close();
}
process.exitCode = fail ? 1 : 0;