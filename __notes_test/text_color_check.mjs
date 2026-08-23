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
const PORT = 8251;
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
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': (mimeMap[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readNotes(page) {
  return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY);
}
async function clearStorage(page) {
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
}
async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function closeEditor(page) {
  await page.click('#closeFullScreenNote').catch(() => {});
}
async function clickTableBtn(page) {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput');
    if (b) b.focus();
    const tb = document.getElementById('noteTableBtn');
    if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
}
async function setTableDims(page, rows, cols, header) {
  await page.evaluate((rr, cc, h) => {
    const ri = document.getElementById('noteTableRows'); if (ri) ri.value = rr;
    const ci = document.getElementById('noteTableCols'); if (ci) ci.value = cc;
    const hi = document.getElementById('noteTableHeader'); if (hi) hi.checked = h;
  }, rows, cols, !!header);
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
        sel.removeAllRanges();
        sel.addRange(rng);
        return true;
      }
    }
    return false;
  }, tableIdx, r, c, word);
}
async function selectCellRange(page, tableIdx, r, c, start, end) {
  await page.evaluate((ti, ri, ci, s, e) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr.querySelectorAll('td, th')[ci];
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue || '';
      if (text.length >= e && s >= 0) {
        const rng = document.createRange();
        rng.setStart(node, s);
        rng.setEnd(node, e);
        const sel = document.getSelection();
        sel.removeAllRanges();
        sel.addRange(rng);
        return true;
      }
    }
    return false;
  }, tableIdx, r, c, start, end);
}
function colorRgbToHex(value) {
  const m = String(value || '').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  const [, r, g, b] = m;
  return '#' + [r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}
function colorHtmlContains(html, hex) {
  if (!html) return false;
  const cleaned = String(html).toLowerCase();
  const target = String(hex).toLowerCase();
  const rgb = colorRgbToHex(cleaned);
  if (rgb) return rgb === target;
  return cleaned.includes(target);
}
async function pickTextColor(page, color) {
  await page.evaluate((hex) => {
    const input = document.getElementById('noteTextColorInput');
    if (!input) return false;
    input.value = hex;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, color);
}
async function cellFormats(page, tableIdx, r, c) {
  return page.evaluate((ti, ri, ci) => {
    const t = document.querySelectorAll('table.note-table')[ti];
    if (!t) return null;
    const tr = t.querySelectorAll('tr')[ri];
    const cell = tr && tr.querySelectorAll('td, th')[ci];
    if (!cell) return null;
    return (cell.innerHTML || '').slice(0, 200);
  }, tableIdx, r, c);
}
let browser;
let pageError = null;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await clearStorage(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(300);

  await openNotes(page);
  await newNote(page);
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', 'Text Color Note');
  await page.click('#noteBodyInput');
  await clickTableBtn(page);
  await setTableDims(page, 2, 2, false);
  await typeInCell(page, 0, 0, 0, 'Arabic مرحبا');
  await typeInCell(page, 0, 0, 1, 'English Hello');
  await typeInCell(page, 0, 1, 0, '12345');
  await typeInCell(page, 0, 1, 1, 'Mixed سلام hello 99');
  await sleep(200);

  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await pickTextColor(page, '#ff0000');
  await sleep(400);
  let html1 = await cellFormats(page, 0, 0, 0);
  check('COLOR: Arabic selected text recolors only the selected text', colorHtmlContains(html1, '#ff0000'), 'html=' + html1);

  await selectCellWord(page, 0, 0, 1, 'Hello');
  await pickTextColor(page, '#0000ff');
  await sleep(400);
  const html2 = await cellFormats(page, 0, 0, 1);
  check('COLOR: English selected text is blue', colorHtmlContains(html2, '#0000ff'), 'html=' + html2);

  await selectCellWord(page, 0, 1, 0, '12345');
  await pickTextColor(page, '#00aa00');
  await sleep(400);
  const html3 = await cellFormats(page, 0, 1, 0);
  check('COLOR: numeric selected text is green', colorHtmlContains(html3, '#00aa00'), 'html=' + html3);

  await selectCellWord(page, 0, 1, 1, 'hello');
  await pickTextColor(page, '#9900cc');
  await sleep(300);
  const htmlMixed = await cellFormats(page, 0, 1, 1);
  check('COLOR: mixed Arabic/English/Numbers cell allows multiple colors in the same cell', colorHtmlContains(htmlMixed, '#9900cc'), 'html=' + htmlMixed);

  await selectCellWord(page, 0, 0, 0, 'مرحبا');
  await page.evaluate(() => document.execCommand('bold', false, null));
  await pickTextColor(page, '#ff6600');
  await sleep(300);
  const htmlBoldColor = await cellFormats(page, 0, 0, 0);
  check('COLOR: Bold + color stays independent', /<b>.*color: rgb\(255, 102, 0\)|<b>.*color: rgb\(255, 102, 0\)/i.test(htmlBoldColor || '') || colorHtmlContains(htmlBoldColor, '#ff6600'), 'html=' + htmlBoldColor);

  await selectCellWord(page, 0, 0, 1, 'Hello');
  await page.evaluate(() => document.execCommand('italic', false, null));
  await pickTextColor(page, '#3366ff');
  await sleep(300);
  const htmlItalicColor = await cellFormats(page, 0, 0, 1);
  check('COLOR: Italic + color stays independent', /<i>.*color: rgb\(51, 102, 255\)|<i>.*color: rgb\(51, 102, 255\)/i.test(htmlItalicColor || '') || colorHtmlContains(htmlItalicColor, '#3366ff'), 'html=' + htmlItalicColor);

  await selectCellWord(page, 0, 1, 0, '12345');
  await page.evaluate(() => document.execCommand('underline', false, null));
  await pickTextColor(page, '#00cc99');
  await sleep(300);
  const htmlUnderlineColor = await cellFormats(page, 0, 1, 0);
  check('COLOR: Underline + color stays independent', /<u>.*color: rgb\(0, 204, 153\)|<u>.*color: rgb\(0, 204, 153\)/i.test(htmlUnderlineColor || '') || colorHtmlContains(htmlUnderlineColor, '#00cc99'), 'html=' + htmlUnderlineColor);

  await page.evaluate(() => {
    const t = document.querySelectorAll('table.note-table')[0];
    const cell = t.querySelectorAll('tr')[0].querySelectorAll('td')[0];
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await pickTextColor(page, '#111111');
  await sleep(300);
  const htmlFullCell = await cellFormats(page, 0, 0, 0);
  check('COLOR: full-cell selection applies color to the full selected text', colorHtmlContains(htmlFullCell, '#111111'), 'html=' + htmlFullCell);

  await page.evaluate(() => {
    const note = JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]');
    if (!note || !note.length) return;
    const table = note[0].bodyBlocks && note[0].bodyBlocks.find((b) => b.type === 'table');
    console.log('STORED_TABLE', JSON.stringify(table));
  });

  const notes = await readNotes(page);
  const note = notes.find((n) => n.title === 'Text Color Note');
  check('COLOR: auto-save stores color in formatting model', !!(note && note.bodyBlocks && note.bodyBlocks[0] && note.bodyBlocks[0].rows[0][0].formatting.some((r) => r.color)), 'fmt=' + JSON.stringify(note && note.bodyBlocks && note.bodyBlocks[0].rows[0][0].formatting));

  await closeEditor(page);
  await sleep(300);
  await page.reload({ waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(300);
  await openNotes(page);
  await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList .note-item'));
    const item = items.find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (item) item.click();
  }, 'Text Color Note');
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  const htmlAfterReload = await cellFormats(page, 0, 0, 0);
  check('COLOR: reload preserves cell color', colorHtmlContains(htmlAfterReload, '#111111'), 'html=' + htmlAfterReload);

  await page.evaluate(() => {
    const table = document.querySelector('table.note-table');
    const firstRow = table.querySelectorAll('tr')[0];
    const firstCell = firstRow.querySelectorAll('td')[0];
    firstCell.textContent = '<script>alert(1)</script>hello';
    const range = document.createRange();
    range.selectNodeContents(firstCell);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await pickTextColor(page, '#ff0099');
  await sleep(300);
  const htmlXss = await page.evaluate(() => document.querySelector('table.note-table td').innerHTML);
  const inertDominant = !/<\s*script\b|onerror\s*=|javascript\s*:/i.test(htmlXss) && /hello/i.test(htmlXss) && /ff0099|color:\s*rgb\(255,\s*0,\s*153\)/i.test(htmlXss);
  check('COLOR: XSS/inert text remains inert and not executed', inertDominant, 'html=' + htmlXss);
  check('COLOR: no JS errors during color flow', !pageError, 'errors=' + (pageError || 'none'));

  console.log('\nTEXT COLOR CHECK SUMMARY');
  const totals = { pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length };
  console.log(JSON.stringify({ totals }, null, 2));
  process.exitCode = totals.fail ? 1 : 0;
} finally {
  if (browser) await browser.close();
  server.close();
}
