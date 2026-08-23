// NOTES TABLE BUTTON → MOBILE TOOLBAR browser check (test-only artifact).
// Verifies the REAL behavior: pressing the Table button on a coarse-pointer /
// mobile device reveals the compact horizontal table toolbar ABOVE the keyboard
// immediately (no cell focus required), containing every existing table tool,
// horizontally scrollable, RTL/LTR aware, hiding on exit, with no JS errors and
// no duplicate toolbar.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8299;
const K1 = 'eq-note-manager-notes', K2 = 'eq-note-folders';
function check(name, ok, d = '') { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${d ? '  -> ' + d : ''}`); }
const results = [];
function tally(name, ok, d = '') { results.push({ ok }); check(name, ok, d); }
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
async function pressTableBtn(page) {
  await page.click('#noteTableBtn');
  await sleep(120);
}
async function toolbarState(page) {
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
      tbTop: el.getBoundingClientRect().top, bodyBottom: document.querySelector('#noteBodyInput').getBoundingClientRect().bottom,
      dir: document.documentElement.dir || document.body.dir || ''
    };
  });
}
const clickTool = (page, action) => page.evaluate((a) => { const b = document.querySelector('.note-mobile-table-toolbar [data-table-action="' + a + '"]'); if (b) b.click(); }, action);
const rowCount = (page) => page.evaluate(() => { const t = document.querySelector('table.note-table'); return t ? t.querySelectorAll('tr').length : 0; });
const colCount = (page) => page.evaluate(() => { const t = document.querySelector('table.note-table tr'); return t ? t.querySelectorAll('td').length : 0; });
const tableAttr = (page, a) => page.evaluate((at) => { const t = document.querySelector('table.note-table'); return t ? t.getAttribute(at) : null; }, a);
const cellAttr = (page, at) => page.evaluate((a) => { const td = document.querySelector('table.note-table td'); return td ? td.getAttribute(a) : null; }, at);
let browser, pageErrors = [];
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36');
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

  tally('coarse pointer detected (EN)', await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches));
  await openNotes(page); await newNote(page);
  await page.type('#noteTitleInput', 'Table Button Note');
  await insertTable(page);
  tally('table inserted', (await page.evaluate(() => document.querySelectorAll('table.note-table').length)) === 1);

  await page.evaluate(() => document.getElementById('noteTitleInput').focus());
  await sleep(150);
  let st = await toolbarState(page);
  tally('toolbar NOT visible before Table press (no cell focus)', st === null || st.d === 'none');

  await pressTableBtn(page);
  st = await toolbarState(page);
  tally('Table press -> toolbar appears immediately', !!st && st.d === 'flex');
  tally('exactly one toolbar (no duplicate)', !!st && st.n === 1);
  tally('toolbar docked outside editable content', !!st && st.out);
  tally('single horizontal row, no wrap', !!st && st.fd === 'row' && st.wrap === 'nowrap');
  tally('horizontally scrollable', !!st && (st.ox === 'auto' || st.ox === 'scroll'));
  tally('not position fixed (docked, above keyboard)', !!st && st.pos !== 'fixed');
  tally('docked above keyboard (below body bottom)', !!st && st.tbTop >= st.bodyBottom - 1, 'tbTop=' + (st && st.tbTop) + ' bodyBottom=' + (st && st.bodyBottom));
  const ALL = ['add-row','add-col','del-row','del-col','merge-cells','split-cell'];
  tally('all existing structure tools present', !!st && ALL.every((a) => st.actions.includes(a)), 'actions=' + (st ? st.actions : ''));
  tally('border + halign + valign selects present', !!st && st.selB && st.selH && st.selV);
  tally('LTR direction active (EN)', !!st && st.dir === 'ltr', 'dir=' + (st ? st.dir : ''));
const r = await rowCount(page), c = await colCount(page);
  await clickTool(page, 'add-row'); await sleep(120);
  tally('add-row works via toolbar', (await rowCount(page)) === r + 1, 'rows ' + r + '->' + (await rowCount(page)));
  await clickTool(page, 'add-col'); await sleep(120);
  tally('add-col works via toolbar', (await colCount(page)) === c + 1, 'cols ' + c + '->' + (await colCount(page)));
  await clickTool(page, 'del-row'); await sleep(120);
  tally('del-row works via toolbar', (await rowCount(page)) === r, 'rows ' + (r + 1) + '->' + (await rowCount(page)));
  await clickTool(page, 'del-col'); await sleep(120);
  tally('del-col works via toolbar', (await colCount(page)) === c, 'cols ' + (c + 1) + '->' + (await colCount(page)));

  await page.evaluate(() => { const c = document.querySelector('table.note-table tr td:nth-child(1)'); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false })); });
  await page.evaluate(() => { const c = document.querySelector('table.note-table tr td:nth-child(2)'); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: true })); });
  await clickTool(page, 'merge-cells'); await sleep(200);
  const merged = await page.evaluate(() => { const td = document.querySelector('table.note-table tr td'); return td ? (td.colSpan || 1) : 0; });
  tally('merge works via toolbar (colspan 2)', merged === 2, 'colspan=' + merged);

  await page.evaluate(() => { const td = document.querySelector('table.note-table tr td'); if (td) td.focus(); });
  await sleep(150);
  await page.evaluate(() => { const s = document.querySelector('.note-mobile-table-toolbar [data-table-action="split-cell"]'); if (s && !s.hidden) s.click(); });
  await sleep(200);
  const afterSplit = await page.evaluate(() => { const td = document.querySelector('table.note-table tr td'); return td ? (td.colSpan || 1) : 0; });
  tally('split works via toolbar (colspan back to 1)', afterSplit === 1, 'colspan=' + afterSplit);

  await page.evaluate(() => { const td = document.querySelector('table.note-table tr td'); if (td) td.focus(); });
  await sleep(150);
  await page.evaluate(() => { const s = document.querySelector('.note-mobile-table-toolbar [data-table-border-select]'); s.value = 'outside'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(150);
  tally('border select applies (outside)', (await tableAttr(page, 'data-border-style')) === 'outside');

  await page.evaluate(() => { const c = document.querySelector('table.note-table tr td'); c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false })); c.focus(); const s = document.querySelector('.note-mobile-table-toolbar [data-table-h-align-select]'); s.value = 'center'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(150);
  tally('halign select applies (center)', (await cellAttr(page, 'data-h-align')) === 'center');

  await page.setViewport({ width: 390, height: 380, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await sleep(200);
  st = await toolbarState(page);
  tally('toolbar stays above keyboard when viewport shrinks', !!st && st.d === 'flex' && st.tbTop >= st.bodyBottom - 1, 'tbTop=' + (st && st.tbTop) + ' bodyBottom=' + (st && st.bodyBottom));

  await page.evaluate(() => document.getElementById('noteTitleInput').focus());
  await sleep(150);
  st = await toolbarState(page);
  tally('toolbar hides when leaving table context', st === null || st.d === 'none');

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.evaluate(() => { const sel = document.getElementById('topBarLanguageSelect'); sel.value = 'ar'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(300);
  await page.evaluate(() => document.getElementById('noteBodyInput').focus());
  await pressTableBtn(page);
  st = await toolbarState(page);
  tally('toolbar visible in RTL after Table press', !!st && st.d === 'flex');
  tally('all tools present in RTL', !!st && ALL.every((a) => st.actions.includes(a)));
  tally('RTL direction active (ar)', await page.evaluate(() => document.documentElement.dir === 'rtl'));
  await page.evaluate(() => document.getElementById('noteTitleInput').focus());
  await sleep(120);

  tally('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  const pass = results.filter((r) => r.ok).length, fail = results.length - pass;
  console.log('SUMMARY table-button-toolbar: pass=' + pass + ' fail=' + fail);
  process.exitCode = fail ? 1 : 0;
  await browser.close(); await server.close();
} catch (err) {
  console.error('RUNNER ERROR: ' + (err && err.message ? err.message : err));
  if (browser) try { await browser.close(); } catch {}
  process.exitCode = 1;
}