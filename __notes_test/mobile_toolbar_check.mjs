// NOTES MOBILE TABLE TOOLBAR browser check (test-only artifact, modifies nothing).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8271;
const K1 = 'eq-note-manager-notes', K2 = 'eq-note-folders';
function check(name, ok, d = '') { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${d ? '  -> ' + d : ''}`); }
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
async function focusCell(page, r, c) {
  await page.evaluate((rr, cc) => { const t = document.querySelector('table.note-table'); const tr = t.querySelectorAll('tr')[rr]; tr.querySelectorAll('td, th')[cc].focus(); }, r, c);
  await sleep(120);
}
async function info(page) {
  return page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    if (!t) return null;
    return Array.from(t.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('td, th')).map((td) => ({ col: td.colSpan || 1, row: td.rowSpan || 1 })));
  });
}
async function state(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.note-mobile-table-toolbar');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      n: document.querySelectorAll('.note-mobile-table-toolbar').length,
      d: cs.display, pos: cs.position, wrap: cs.flexWrap, ox: cs.overflowX, fd: cs.flexDirection,
      out: !document.querySelector('#noteBodyInput .note-mobile-table-toolbar'),
      actions: Array.from(el.querySelectorAll('[data-table-action]')).map((b) => b.getAttribute('data-table-action')),
      selB: !!el.querySelector('[data-table-border-select]'), selH: !!el.querySelector('[data-table-h-align-select]'), selV: !!el.querySelector('[data-table-v-align-select]'),
      bodyLock: document.body.style.position,
      tbTop: el.getBoundingClientRect().top, bodyBottom: document.querySelector('#noteBodyInput').getBoundingClientRect().bottom
    };
  });
}
let browser, pageErrors = [];
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36');
  // Emulate a coarse-pointer / touch device BEFORE app.js runs so the app's
  // isMobileDevice() check sees a mobile device without relying on CDP media features.
  await page.evaluateOnNewDocument(() => {
    const realMM = window.matchMedia.bind(window);
    window.matchMedia = (q) => {
      if (/pointer/.test(q)) { return { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; } }; }
      return realMM(q);
    };
    try { Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { configurable: true, get: () => 10 }); } catch (e) {}
  });
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 25000 });
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, K1, K2);
  await page.reload({ waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(400);

  check('coarse pointer detected', await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches));
  await openNotes(page); await newNote(page);
  await page.type('#noteTitleInput', 'Mobile Note'); await insertTable(page);
  check('table inserted', (await page.evaluate(() => document.querySelectorAll('table.note-table').length)) === 1);

  let st = await state(page);
  check('toolbar not visible before focus', st === null || st.d === 'none');
  await focusCell(page, 0, 0);
  st = await state(page);
  check('toolbar visible on focus', st && st.d === 'flex');
  check('only one toolbar', st && st.n === 1);
  check('outside editable content', st && st.out);
  check('all five buttons', st && st.actions && ['add-row','add-col','del-row','del-col','merge-cells'].every((a) => st.actions.includes(a)), 'buttons=' + (st ? st.actions : ''));
  check('border + halign + valign selects', st && st.selB && st.selH && st.selV);
  check('horizontal flex row, no wrap', st && st.fd === 'row' && st.wrap === 'nowrap');
  check('horizontally scrollable', st && (st.ox === 'auto' || st.ox === 'scroll'));
  check('not position fixed', st && st.pos !== 'fixed');
  check('no body scroll lock', st && st.bodyLock !== 'fixed');
  check('docked below editable body', st && st.tbTop >= st.bodyBottom - 1, 'tbTop=' + st.tbTop + ' bodyBottom=' + st.bodyBottom);
const clickBtn = (sel) => page.evaluate((s) => { const b = document.querySelector('.note-mobile-table-toolbar [data-table-action="' + s + '"]'); if (b) b.click(); }, sel);
  const rowCount = () => page.evaluate(() => document.querySelector('table.note-table').querySelectorAll('tr').length);
  const colCount = () => page.evaluate(() => document.querySelector('table.note-table tr').querySelectorAll('td').length);

  await focusCell(page, 0, 0);
  await clickBtn('add-row'); await sleep(120);
  check('add-row works (4 rows)', (await rowCount()) === 4, 'rows=' + (await rowCount()));
  await clickBtn('add-col'); await sleep(120);
  check('add-col works (4 cols)', (await colCount()) === 4, 'cols=' + (await colCount()));
  await clickBtn('del-row'); await sleep(120);
  check('del-row works (3 rows)', (await rowCount()) === 3, 'rows=' + (await rowCount()));
  await clickBtn('del-col'); await sleep(120);
  check('del-col works (3 cols)', (await colCount()) === 3, 'cols=' + (await colCount()));

  // Alignment is applied to the focused/selected cell; tap the cell first (real
  // mousedown) so the selection is refreshed, then change the toolbar <select>.
  const alignSet = async (selectSel, value) => {
    await page.evaluate((rr, cc, sel, val) => {
      const t = document.querySelector('table.note-table');
      const cell = t.querySelectorAll('tr')[rr].querySelectorAll('td, th')[cc];
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false }));
      cell.focus();
      const s = document.querySelector(sel);
      s.value = val; s.dispatchEvent(new Event('change', { bubbles: true }));
    }, 0, 0, selectSel, value);
    await sleep(150);
  };
  await alignSet('.note-mobile-table-toolbar [data-table-h-align-select]', 'center');
  check('halign select applies', await page.evaluate(() => document.querySelector('table.note-table td').getAttribute('data-h-align') === 'center'));
  await alignSet('.note-mobile-table-toolbar [data-table-v-align-select]', 'bottom');
  check('valign select applies', await page.evaluate(() => document.querySelector('table.note-table td').getAttribute('data-v-align') === 'bottom'));

  // Merge needs an explicit cell rectangle: anchor (0,0) then shift-click (0,1).
  await page.evaluate(() => { const c = document.querySelector('table.note-table tr td:nth-child(1)'); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false })); });
  await page.evaluate(() => { const c = document.querySelector('table.note-table tr td:nth-child(2)'); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: true })); });
  await clickBtn('merge-cells'); await sleep(200);
  check('merge works (colspan 2)', (await info(page))[0][0].col === 2, 'colspan=' + (await info(page))[0][0].col);

  await page.evaluate(() => { const s = document.querySelector('.note-mobile-table-toolbar [data-table-border-select]'); s.value = 'outside'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(150);
  check('border select applies', await page.evaluate(() => document.querySelector('table.note-table').getAttribute('data-border-style') === 'outside'));

  await page.evaluate(() => document.getElementById('noteTitleInput').focus());
  await sleep(150);
  st = await state(page);
  check('toolbar hides when leaving table', st === null || st.d === 'none');

  await page.evaluate(() => { const sel = document.getElementById('topBarLanguageSelect'); sel.value = 'ar'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(300);
  check('RTL direction active', await page.evaluate(() => document.documentElement.dir === 'rtl'));
  await focusCell(page, 0, 0);
  st = await state(page);
  check('toolbar visible in RTL', st && st.d === 'flex');
  check('all actions in RTL', st && st.actions && st.actions.length >= 5);
  check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  await browser.close(); await server.close();
} catch (err) {
  console.error('RUNNER ERROR: ' + (err && err.message ? err.message : err));
  if (browser) try { await browser.close(); } catch {}
  process.exitCode = 1;
}