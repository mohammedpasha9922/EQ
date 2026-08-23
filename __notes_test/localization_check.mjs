import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const NOTES_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const LANG_KEY = 'eq-language';
const PORT = 8321;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const fp = path.join(ROOT, p);
  const ex = path.extname(p).toLowerCase();
  const mm = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };
  if (res.headersSent) return;
  try { res.writeHead(200, { 'Content-Type': (mm[ex] || 'application/octet-stream') + '; charset=utf-8' }); res.end(fs.readFileSync(fp)); }
  catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));

let pageError = null;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });

await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 20000 });
async function setLang(loc) {
  await page.evaluate((l) => {
    const sel = document.getElementById('topBarLanguageSelect');
    if (!sel) return;
    sel.value = l;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, loc);
  await sleep(250);
}
async function openNotes() {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function newNote() {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function openTablePanel() {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput'); if (b) b.focus();
    const tb = document.getElementById('noteTableBtn'); if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
}
async function readTablePanelStrings() {
  return page.evaluate(() => {
    const g = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : null; };
    return {
      title: g('.note-table-panel-label'),
      rows: g('.note-table-panel-field:nth-child(1) span'),
      cols: g('.note-table-panel-field:nth-child(2) span'),
      header: g('.note-table-panel-field:nth-child(3) span'),
      insert: g('#noteTableInsertBtn'),
      cancel: g('#noteTableCancelBtn')
    };
  });
}
async function readPersonalTab() {
  return page.evaluate(() => {
    const b = document.querySelector('#folderTabsScroll button.folder-tab[data-folder-id="personal"]');
    return b ? b.textContent.trim() : null;
  });
}
async function readUntitledTitle() {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item .note-item-title'));
    return items.map((el) => el.textContent.trim());
  });
}
async function readStoredNoteContent() {
  return page.evaluate((k) => {
    try { const n = JSON.parse(localStorage.getItem(k) || '[]'); return n.map((x) => ({ title: x.title, body: x.body || '', bodyBlocks: x.bodyBlocks })); } catch { return []; }
  }, NOTES_KEY);
}
// ---- English baseline ----
await openNotes();
check('EN: default Personal folder tab shows "Personal"', (await readPersonalTab()) === 'Personal', await readPersonalTab());
await newNote();
await openTablePanel();
const en = await readTablePanelStrings();
check('EN: popup title = "Insert Table"', en.title === 'Insert Table', en.title);
check('EN: Rows = "Rows"', en.rows === 'Rows', en.rows);
check('EN: Cols = "Cols"', en.cols === 'Cols', en.cols);
check('EN: Header row = "Header row"', en.header === 'Header row', en.header);
check('EN: cancel = "Cancel"', en.cancel === 'Cancel', en.cancel);
check('EN: insert btn = "Insert Table"', en.insert === 'Insert Table', en.insert);

// user content (Arabic + English + numbers), empty title => "Untitled" in EN
await page.click('#noteTableInsertBtn');
await page.waitForFunction(() => document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 2000 });
await page.evaluate(() => {
  const t = document.querySelector('table.note-table');
  const cell = t.querySelectorAll('tr')[0].querySelectorAll('td')[0];
  cell.textContent = 'مرحبا Hello 123';
});
await page.click('#noteBodyInput');
await page.evaluate(() => { document.execCommand('insertText', false, 'Mixed مرحبا text 456'); });
await sleep(200);
await page.click('#closeFullScreenNote');
await sleep(200);
const untitledEn = await readUntitledTitle();
check('EN: untitled note displays "Untitled"', untitledEn.includes('Untitled'), JSON.stringify(untitledEn));

// ---- Switch to Arabic ----
await setLang('ar');
await sleep(200);
await newNote();
await openTablePanel();
const ar = await readTablePanelStrings();
check('AR: popup title = إدراج جدول', ar.title === 'إدراج جدول', ar.title);
check('AR: Rows = صفوف', ar.rows === 'صفوف', ar.rows);
check('AR: Cols = أعمدة', ar.cols === 'أعمدة', ar.cols);
check('AR: Header row = صف العنوان', ar.header === 'صف العنوان', ar.header);
check('AR: cancel = إلغاء', ar.cancel === 'إلغاء', ar.cancel);
check('AR: insert btn = إدراج جدول', ar.insert === 'إدراج جدول', ar.insert);
await page.click('#closeFullScreenNote');
await sleep(200);
check('AR: Personal folder tab shows شخصي', (await readPersonalTab()) === 'شخصي', await readPersonalTab());
const untitledAr = await readUntitledTitle();
check('AR: untitled note displays بدون عنوان', untitledAr.includes('بدون عنوان'), JSON.stringify(untitledAr));

// ---- User-entered content unchanged after switch ----
const contentAfterAr = await readStoredNoteContent();
check('AR: user-entered Note content preserved (cells + body)',
  contentAfterAr.some((n) => n.bodyBlocks && n.bodyBlocks.some((bb) => bb.type === 'table' && JSON.stringify(bb.rows).includes('مرحبا Hello 123'))) &&
  contentAfterAr.some((n) => String(n.body).includes('Mixed مرحبا text 456') || JSON.stringify(n.bodyBlocks).includes('Mixed مرحبا text 456')),
  'stored=' + JSON.stringify(contentAfterAr));

// ---- Switch back to English ----
await setLang('en');
await sleep(200);
await openNotes();
check('EN(user-switch): Personal tab shows "Personal" again', (await readPersonalTab()) === 'Personal', await readPersonalTab());
const untitledEn2 = await readUntitledTitle();
check('EN(user-switch): untitled displays "Untitled" again', untitledEn2.includes('Untitled'), JSON.stringify(untitledEn2));

// ---- Switch to Arabic again (round-trip) ----
await setLang('ar');
await sleep(200);
await openNotes();
check('AR(2nd switch): Personal tab shows شخصي again', (await readPersonalTab()) === 'شخصي', await readPersonalTab());

const contentFinal = await readStoredNoteContent();
check('AR(final): user content still preserved', contentAfterAr.length === contentFinal.length && JSON.stringify(contentAfterAr) === JSON.stringify(contentFinal), 'len=' + contentFinal.length);

check('LOC: no JS errors during localization flow', !pageError, 'errors=' + (pageError || 'none'));

console.log('\nLOCALIZATION CHECK SUMMARY');
const totals = { pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length };
console.log(JSON.stringify({ totals }, null, 2));
process.exitCode = totals.fail ? 1 : 0;
await browser.close();
server.close();
await page.evaluate((a, b, c) => { localStorage.removeItem(a); localStorage.removeItem(b); localStorage.removeItem(c); }, NOTES_KEY, FOLDERS_KEY, LANG_KEY);
await page.reload({ waitUntil: 'load', timeout: 20000 });
await sleep(300);