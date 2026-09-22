// PART 07 debug probe — preset-in-cell targeting + align targeting diagnostics.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8741;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const ext = path.extname(f).toLowerCase();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': (mime[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 800 });
page.on('pageerror', (e) => console.log('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR: ' + m.text()); });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await sleep(600);


// Open notes + new note (exact harness flow)
await page.evaluate(() => { try { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); localStorage.removeItem('eq-language'); } catch (e) {} });
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(400);
await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
await sleep(200);
await page.evaluate(() => document.getElementById('openNewNoteButton').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'P7Dbg'; });
await sleep(200);
console.log('editor modal open =', await page.evaluate(() => !!document.getElementById('fullScreenNoteModal')?.classList.contains('show')));

// Insert 2x2 table with header
await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); if (b) b.focus(); const tb = document.getElementById('noteTableBtn'); if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
await page.click('#noteTableBtn'); await sleep(150);
await page.evaluate(() => {
  document.getElementById('noteTableRows').value = 2;
  document.getElementById('noteTableCols').value = 2;
  const h = document.getElementById('noteTableHeader'); if (h) h.checked = true;
  const b = document.getElementById('noteTableInsertBtn'); if (b) b.click();
});
await sleep(300);
console.log('tables =', await page.evaluate(() => document.querySelectorAll('table.note-table').length));

const stateProbe = () => page.evaluate(() => {
  const bg = document.getElementById('noteCellBgColorBtn');
  const sel = window.getSelection();
  const panel = document.getElementById('noteAaPanel');
  const cs = panel ? getComputedStyle(panel) : null;
  return {
    bgDisabled: bg ? bg.disabled : null,
    active: document.activeElement ? (document.activeElement.tagName + '.' + (document.activeElement.className || '')) : null,
    selStr: sel ? sel.toString() : null,
    selCollapsed: sel ? sel.isCollapsed : null,
    panelDisplay: cs ? cs.display : null,
    swatches: document.querySelectorAll('#noteAaPresetsRow .note-aa-preset-swatches').length
  };
});

// ---- Scenario A: preset inside cell (exact harness sequence) ----
console.log('--- SCENARIO A: preset in cell ---');
await page.evaluate(() => {
  const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
  const c = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[1];
  c.textContent = 'PresetCell';
  c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false }));
  c.focus();
  const r = document.createRange(); r.selectNodeContents(c);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
});
await sleep(100);
console.log('D1:', JSON.stringify(await stateProbe()));
console.log('GEO:', JSON.stringify(await page.evaluate(() => {
  const btn = document.getElementById('noteAaBtn');
  const tb = document.querySelector('.note-mobile-table-toolbar');
  const r = btn.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return {
    btnRect: { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    tbRect: tb ? (({ left, top, width, height, display }) => ({ l: Math.round(left), t: Math.round(top), w: Math.round(width), h: Math.round(height), display }))(tb.getBoundingClientRect()) : null,
    hitIsBtnOrInside: !!(hit && (hit.id === 'noteAaBtn' || (hit.closest && hit.closest('#noteAaBtn')))),
    hitDesc: hit ? hit.tagName + '#' + (hit.id || '') + '.' + (hit.className || '') : null
  };
})));

await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); if (b) b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
// Instrument: log click handler firing + disabled state around the real click
await page.evaluate(() => {
  window.__aaLog = [];
  const b = document.getElementById('noteAaBtn');
  b.addEventListener('click', () => window.__aaLog.push('click fired, panelHiddenBefore=' + document.getElementById('noteAaPanel').classList.contains('hidden')), true);
  b.addEventListener('mousedown', () => window.__aaLog.push('mousedown, disabled=' + b.disabled), true);
});
await page.click('#noteAaBtn');
console.log('IMMEDIATE:', JSON.stringify(await page.evaluate(() => ({
  log: window.__aaLog,
  disabled: document.getElementById('noteAaBtn').disabled,
  panelHidden: document.getElementById('noteAaPanel').classList.contains('hidden'),
  active: document.activeElement.tagName + '.' + (document.activeElement.className || '')
}))));
await sleep(150);
console.log('D2 (after openAa):', JSON.stringify(await stateProbe()));

await page.click('#noteAaBtn'); await sleep(150);
console.log('D2 (after openAa):', JSON.stringify(await stateProbe()));

const clickRes = await page.evaluate(() => {
  const row = document.getElementById('noteAaPresetsRow');
  const btn = row && row.querySelector('[data-preset="simple"]');
  if (!btn) return 'no-btn';
  btn.click(); return 'clicked';
});
await sleep(250);
console.log('preset click =', clickRes);

// A2: same cell targeting, but open the panel with a DOM click on the real
// button (bypasses pointer hit-testing) — distinguishes product logic from
// overlay hit-testing artifacts.
console.log('--- SCENARIO A2: JS click on noteAaBtn ---');
await page.evaluate(() => {
  const p = document.getElementById('noteAaPanel');
  if (p && !p.classList.contains('hidden')) document.getElementById('noteAaBtn').click();
});
await sleep(120);
await page.evaluate(() => {
  const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
  const c = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[1];
  c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false }));
  c.focus();
  const r = document.createRange(); r.selectNodeContents(c);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
});
await sleep(80);
const a2open = await page.evaluate(() => { document.getElementById('noteAaBtn').click(); return !document.getElementById('noteAaPanel').classList.contains('hidden'); });
await sleep(150);
console.log('A2 panel open =', a2open, 'D2js:', JSON.stringify(await stateProbe()));
const a2click = await page.evaluate(() => {
  const row = document.getElementById('noteAaPresetsRow');
  const btn = row && row.querySelector('[data-preset="simple"]');
  if (!btn) return 'no-btn';
  btn.click(); return 'clicked';
});
await sleep(250);
console.log('A2 preset click =', a2click);
console.log('A2 cell result:', JSON.stringify(await page.evaluate(() => {
  const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
  const c = w.querySelectorAll('tbody tr')[1].querySelectorAll('td.note-cell')[1];
  const sp = c.querySelector('span');
  return { bg: c.style.backgroundColor, spanColor: sp ? sp.style.color : null };
})));


// ---- Scenario B: align with focus set ----
console.log('--- SCENARIO B: align ---');
await page.evaluate(() => {
  const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
  const c = w.querySelector('tbody tr td.note-cell');
  if (c) { c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: false })); c.focus(); }
});
await sleep(100);
console.log('B1:', JSON.stringify(await stateProbe()));
console.log('h-align selects:', JSON.stringify(await page.evaluate(() => ({
  wrapSel: document.querySelectorAll('.note-table-wrap [data-table-h-align-select]').length,
  toolbarSel: document.querySelectorAll('.note-mobile-table-toolbar [data-table-h-align-select]').length,
  anySel: document.querySelectorAll('[data-table-h-align-select]').length,
  toolbarVisible: (() => { const t = document.querySelector('.note-mobile-table-toolbar'); return t ? getComputedStyle(t).display : 'absent'; })()
}))));
await page.evaluate(() => {
  const sels = document.querySelectorAll('[data-table-h-align-select]');
  const sel = sels[sels.length - 1];
  if (!sel) return 'no-select';
  sel.value = 'center';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  return 'ok';
});
await sleep(200);
console.log('B2 align:', JSON.stringify(await page.evaluate(() => {
  const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
  return Array.from(w.querySelectorAll('tbody td')).map((td) => td.getAttribute('data-h-align'));
})));
await page.evaluate(() => {
  const sels = document.querySelectorAll('.note-mobile-table-toolbar [data-table-h-align-select]');
  const sel = sels[sels.length - 1];
  if (sel) { sel.value = 'right'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
});
await sleep(200);
console.log('B3 mobile-toolbar align:', JSON.stringify(await page.evaluate(() => {
  const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
  return Array.from(w.querySelectorAll('tbody td')).map((td) => td.getAttribute('data-h-align'));
})));

await browser.close();
server.close();
process.exit(0);

