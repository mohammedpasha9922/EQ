// NOTES TABLE CONTROLS RELOCATION check (test-only artifact; modifies nothing).
// Verifies the table-controls UI relocation only:
//  - inline per-table control block (.note-table-controls) is GONE from the note
//    content (the table renders clean with no toolbar stuck above it);
//  - all table controls now live once in the single contextual horizontal
//    toolbar (.note-mobile-table-toolbar), shown only when a cell is active;
//  - every action (row/col add+delete, merge, split, borders, h/v align) still
//    works via that toolbar; no duplicate controls; toolbar is one nowrap
//    horizontal scrollable row; RTL/LTR respected; desktop + mobile;
//  - no page horizontal overflow and no JS errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8302;
let failures = 0;
function check(name, ok, d = '') { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${d ? '  -> ' + d : ''}`); }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/' || p === '') p = '/index.html';
  const f = path.join(ROOT, p), e = path.extname(p).toLowerCase();
  const m = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
  try { const data = fs.readFileSync(f); res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' }); res.end(data); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function openNotes(page) {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
}
async function newNote(page) {
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
}
async function insertTable(page) {
  await page.click('#noteBodyInput');
  await page.evaluate(() => document.getElementById('noteTableBtn').click());
  await page.waitForFunction(() => { const p = document.getElementById('noteTablePanel'); return p && !p.classList.contains('hidden'); }, { timeout: 3000 });
  await page.evaluate(() => document.getElementById('noteTableInsertBtn').click());
  await page.waitForFunction(() => document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 3000 });
}
const rowCount = (page) => page.evaluate(() => { const t = document.querySelector('table.note-table'); return t ? t.querySelectorAll('tr').length : 0; });
const colCount = (page) => page.evaluate(() => { const t = document.querySelector('table.note-table tr'); return t ? t.querySelectorAll('td, th').length : 0; });
const toolbarInfo = (page) => page.evaluate(() => {
  const el = document.querySelector('.note-mobile-table-toolbar');
  const wraps = Array.from(document.querySelectorAll('.note-table-wrap'));
  const cs = el ? getComputedStyle(el) : null;
  const wrap = document.querySelector('.note-table-wrap');
  return {
    exists: !!el,
    n: document.querySelectorAll('.note-mobile-table-toolbar').length,
    display: el ? getComputedStyle(el).display : null,
    inlineControls: wraps.some((w) => w.querySelector('.note-table-controls')),
    wrapChildren: wrap ? Array.from(wrap.children).map((c) => c.tagName + '.' + c.className) : [],
    actions: el ? Array.from(el.querySelectorAll('[data-table-action]')).map((b) => b.getAttribute('data-table-action')) : [],
    selB: !!el && !!el.querySelector('[data-table-border-select]'),
    selH: !!el && !!el.querySelector('[data-table-h-align-select]'),
    selV: !!el && !!el.querySelector('[data-table-v-align-select]'),
    borderDupes: el ? el.querySelectorAll('[data-table-border-select]').length : 0,
    halignDupes: el ? el.querySelectorAll('[data-table-h-align-select]').length : 0,
    valignDupes: el ? el.querySelectorAll('[data-table-v-align-select]').length : 0,
    fd: cs ? cs.flexDirection : null, wrapF: cs ? cs.flexWrap : null, ox: cs ? cs.overflowX : null,
    wsn: cs ? cs.whiteSpace : null, dir: el ? getComputedStyle(el).direction : null,
    noHOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  };
});
async function focusCell(page, r, c) {
  await page.evaluate((ri, ci) => {
    const t = document.querySelector('table.note-table'); if (!t) return;
    const tr = t.querySelectorAll('tr')[ri]; const cell = tr ? tr.querySelectorAll('td, th')[ci] : null;
    if (cell) {
      // Seed the editor's active-cell state the same way a real tap does
      // (setCellSelection via mousedown), then focus.
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false }));
      cell.focus();
    }
  }, r, c);
  await sleep(180);
}
async function clickToolbar(page, action) {
  await page.evaluate((a) => { const b = document.querySelector('.note-mobile-table-toolbar [data-table-action="' + a + '"]'); if (b) b.click(); }, action);
  await sleep(160);
}
const ALL = ['add-row', 'add-col', 'del-row', 'del-col', 'merge-cells', 'split-cell'];
let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const viewports = [
    { w: 1280, h: 800, lang: 'en', name: 'Desktop-LTR' },
    { w: 1440, h: 900, lang: 'en', name: 'Desktop-Laptop-LTR' },
    { w: 1280, h: 800, lang: 'ar', name: 'Desktop-RTL' },
    { w: 390, h: 844, lang: 'en', isM: true, name: 'iPhone-Portrait' },
    { w: 844, h: 390, lang: 'en', isM: true, name: 'iPhone-Landscape' },
    { w: 360, h: 800, lang: 'ar', isM: true, name: 'Android-Portrait-RTL' },
    { w: 360, h: 720, lang: 'en', isM: true, name: 'Android-Small' }
  ];
for (const vp of viewports) {
    console.log('\n=== ' + vp.name + ' ' + vp.w + 'x' + vp.h + ' lang=' + vp.lang + ' ===');
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, ...(vp.isM ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
    let errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 25000 });
    await page.evaluate((l) => localStorage.setItem('eq-language', l), vp.lang).catch(() => {});
    await page.reload({ waitUntil: 'networkidle0', timeout: 25000 });
    await sleep(300);
    await openNotes(page);
    await newNote(page);
    await insertTable(page);

    let t = await toolbarInfo(page);
    check('Inline .note-table-controls removed from note content', t.inlineControls === false, JSON.stringify(t.wrapChildren));
    check('Toolbar hidden before cell focus', !t.exists || t.display === 'none', 'exists=' + t.exists + ' display=' + t.display);

    await focusCell(page, 0, 0);
    t = await toolbarInfo(page);
    check('Toolbar appears on cell focus (single bar)', t.exists && t.n === 1 && t.display === 'flex', 'n=' + t.n + ' display=' + t.display);
    check('All structure tools present (once)', !!t.actions && ALL.every((a) => t.actions.filter((x) => x === a).length === 1), 'actions=' + JSON.stringify(t.actions));
    check('Border + h-align + v-align present (one each)', t.selB && t.selH && t.selV && t.borderDupes === 1 && t.halignDupes === 1 && t.valignDupes === 1, 'B=' + t.borderDupes + ' H=' + t.halignDupes + ' V=' + t.valignDupes);
    check('Toolbar is one nowrap horizontal scrollable row', t.fd === 'row' && t.wrapF === 'nowrap' && t.ox === 'auto' && t.wsn === 'nowrap', 'fd=' + t.fd + ' wrap=' + t.wrapF + ' ox=' + t.ox + ' wsn=' + t.wsn);
    const wantDir = vp.lang === 'ar' ? 'rtl' : 'ltr';
    check('Toolbar direction matches app (' + wantDir + ')', t.dir === wantDir, 'dir=' + t.dir);
let r = await rowCount(page), c = await colCount(page);
    await clickToolbar(page, 'add-row'); check('add-row works', (await rowCount(page)) === r + 1);
    await clickToolbar(page, 'add-col'); check('add-col works', (await colCount(page)) === c + 1);
    await clickToolbar(page, 'del-row'); check('del-row works', (await rowCount(page)) === r);
    await clickToolbar(page, 'del-col'); check('del-col works', (await colCount(page)) === c);

    await page.evaluate(() => { const c1 = document.querySelector('table.note-table tr td'); if (c1) c1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false })); });
    await page.evaluate(() => { const t = document.querySelector('table.note-table'); const c2 = t.rows[0].cells[1]; if (c2) c2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: true })); });
    await clickToolbar(page, 'merge-cells');
    let merged = await page.evaluate(() => { const td = document.querySelector('table.note-table tr td'); return td ? (td.colSpan || 1) : 0; });
    check('merge-cells works (colspan 2)', merged === 2, 'colspan=' + merged);
    await focusCell(page, 0, 0);
    await clickToolbar(page, 'split-cell');
    let afterSplit = await page.evaluate(() => { const td = document.querySelector('table.note-table tr td'); return td ? (td.colSpan || 1) : 0; });
    check('split-cell works (colspan back to 1)', afterSplit === 1, 'colspan=' + afterSplit);

    await focusCell(page, 0, 0);
    await page.evaluate(() => { const s = document.querySelector('.note-mobile-table-toolbar [data-table-border-select]'); s.value = 'outside'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await sleep(150);
    check('border select applies (outside)', (await page.evaluate(() => document.querySelector('table.note-table').getAttribute('data-border-style'))) === 'outside');
    await page.evaluate(() => { const s = document.querySelector('.note-mobile-table-toolbar [data-table-h-align-select]'); s.value = 'center'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await sleep(150);
    check('h-align select applies (center)', (await page.evaluate(() => document.querySelector('table.note-table td').getAttribute('data-h-align'))) === 'center');
    await page.evaluate(() => { const s = document.querySelector('.note-mobile-table-toolbar [data-table-v-align-select]'); s.value = 'bottom'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await sleep(150);
    check('v-align select applies (bottom)', (await page.evaluate(() => document.querySelector('table.note-table td').getAttribute('data-v-align'))) === 'bottom');

    await page.evaluate(() => document.getElementById('noteTitleInput').focus());
    await sleep(200);
    t = await toolbarInfo(page);
    check('Toolbar hides when focus leaves the table', !t.exists || t.display === 'none', 'display=' + t.display);
    check('No page horizontal overflow', (await toolbarInfo(page)).noHOverflow);
    check('No JS errors (' + vp.name + ')', errs.length === 0, errs.length ? errs[0].slice(0, 180) : 'clean');
    await page.close();
  }
} catch (e) { check('Harness', false, e.message); failures++; }
finally { try { await browser.close(); } catch {} server.close(); }
console.log('\nRESULT: ' + (failures === 0 ? 'ALL PASS' : failures + ' FAILURES'));
process.exit(failures === 0 ? 0 : 1);