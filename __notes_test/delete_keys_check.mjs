// DELETE/BACKSPACE KEYS — isolated browser verification harness.
// Verifies that Backspace and Delete keys work correctly inside the Notes editor.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const PORT = 8215;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
};

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});

await new Promise((r) => server.listen(PORT, r));

let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readStoredNotes(page) {
  return await page.evaluate((k) => {
    try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
  }, STORAGE_KEY);
}
async function clearNotesStorage(page) {
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
}
async function noteByTitle(page, title) {
  return (await readStoredNotes(page)).find((n) => n.title === title) || null;
}
async function openNotes(page) {
  await page.evaluate(() => {
    const btn = document.querySelector('.drawer-menu-item[data-action="open-notes"]');
    if (btn) btn.click();
  });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 4000 });
}
async function newNote(page) {
  await page.evaluate(() => {
    const btn = document.getElementById('openNewNoteButton');
    if (btn) btn.click();
  });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 4000 });
}
async function setTitle(page, text) {
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', text);
}
async function getBodyText(page) {
  return page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    return el ? el.innerText : '';
  });
}
async function getBodyHTML(page) {
  return page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    return el ? el.innerHTML : '';
  });
}
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=500,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 900 });

  let pageError = null;
  page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // Benign SVG path errors from pre-existing icon markup (documented in formatting_check.mjs)
      if (!t.includes('404') && !t.includes('favicon') && !t.includes('<path>')) {
        pageError = (pageError || '') + '[console.error] ' + t + '\n';
      }
    }
  });

  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await clearNotesStorage(page);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);

  // ================================================================
  // 1) BACKSPACE — delete one character
  // ================================================================
  await openNotes(page);
  await newNote(page);
  await setTitle(page, 'DeleteKeyTest');
  await page.waitForSelector('#noteBodyInput', { visible: true });
  await sleep(200);

  await page.click('#noteBodyInput');
  await page.type('#noteBodyInput', 'ABC');
  await sleep(200);
  let text = await getBodyText(page);
  check('BACKSPACE: typing ABC produces "ABC"', text === 'ABC', 'text=[' + text + ']');

  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await getBodyText(page);
  check('BACKSPACE: after Backspace from "ABC" -> "AB"', text === 'AB', 'text=[' + text + ']');

  // Test auto-save & persistence immediately after backspace (before other tests modify body)
  await page.click('#noteTitleInput');
  await sleep(300);
  await page.click('#noteTitleInput');
  await sleep(900);
  const noteAfterDelete = await noteByTitle(page, 'DeleteKeyTest');
  check('AUTO-SAVE: note body after deletion persisted in storage',
    !!noteAfterDelete && noteAfterDelete.body === 'AB',
    noteAfterDelete ? 'body=[' + noteAfterDelete.body + ']' : 'missing');

  await page.evaluate(() => {
    const closeBtn = document.getElementById('closeFullScreenNote');
    if (closeBtn) closeBtn.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('#notesList .note-item'))
      .find((el) => el.querySelector('.note-item-title').textContent.trim() === 'DeleteKeyTest');
    if (item) item.click();
  });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 4000 });
  await sleep(300);
  text = await getBodyText(page);
  check('REOPEN: deleted text remains deleted after reopening',
    text === 'AB', 'text=[' + text + ']');

  await page.reload({ waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(400);
  await openNotes(page);
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll('#notesList .note-item'))
      .find((el) => el.querySelector('.note-item-title').textContent.trim() === 'DeleteKeyTest');
    if (item) item.click();
  });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 4000 });
  await sleep(300);
  text = await getBodyText(page);
  check('REFRESH: deleted text remains deleted after refresh',
    text === 'AB', 'text=[' + text + ']');
// ================================================================
  // 2) DELETE — delete one character
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'ABCD';
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 1);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);
  text = await getBodyText(page);
  check('DELETE: after Delete between A|BCD -> "ACD"', text === 'ACD', 'text=[' + text + ']');

  // ================================================================
  // 3) SELECTION + BACKSPACE
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'ABCDEF';
  });
  await sleep(100);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 4);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await getBodyText(page);
  check('SELECT+BACKSPACE: "ABCDEF" select BCD Backspace -> "AEF"', text === 'AEF', 'text=[' + text + ']');

  // ================================================================
  // 4) SELECTION + DELETE
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'ABCDEF';
  });
  await sleep(100);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 2);
    range.setEnd(textNode, 5);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);
  text = await getBodyText(page);
  check('SELECT+DELETE: "ABCDEF" select CDE Delete -> "ABF"', text === 'ABF', 'text=[' + text + ']');
// ================================================================
  // 5) ARABIC
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'مرحبا';
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 4);
    range.setEnd(textNode, 4);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await getBodyText(page);
  check('ARABIC BACKSPACE: "مرحبا" Backspace -> "مرحا"', text === 'مرحا', 'text=[' + text + ']');

  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'مرحبا';
  });
  await sleep(100);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 1);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);
  text = await getBodyText(page);
  check('ARABIC DELETE: "مرحبا" Delete between first two -> "محبا"', text === 'محبا', 'text=[' + text + ']');

  // ================================================================
  // 6) ENGLISH
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'Hello';
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 5);
    range.setEnd(textNode, 5);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await getBodyText(page);
  check('ENGLISH BACKSPACE: "Hello" Backspace -> "Hell"', text === 'Hell', 'text=[' + text + ']');

  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'Hello';
  });
  await sleep(100);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 1);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);
  text = await getBodyText(page);
  check('ENGLISH DELETE: "Hello" Delete after H -> "Hllo"', text === 'Hllo', 'text=[' + text + ']');
// ================================================================
// ================================================================
  // 7) NUMBERS
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = '1234567890';
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 10);
    range.setEnd(textNode, 10);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await getBodyText(page);
  check('NUMBERS BACKSPACE: "1234567890" Backspace -> "123456789"', text === '123456789', 'text=[' + text + ']');

  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = '1234567890';
  });
  await sleep(100);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 3);
    range.setEnd(textNode, 3);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);
  text = await getBodyText(page);
  check('NUMBERS DELETE: "1234567890" Delete after pos 3 -> "123567890"', text === '123567890', 'text=[' + text + ']');

  // ================================================================
  // 8) MIXED Arabic + English + numbers
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'مرحبا Hello 123';
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 14);
    range.setEnd(textNode, 14);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await getBodyText(page);
  check('MIXED BACKSPACE: "مرحبا Hello 123" Backspace -> "مرحبا Hello 13"', text === 'مرحبا Hello 13', 'text=[' + text + ']');

  // ================================================================
  // 9) FORMATTED TEXT (Bold) — deletion preserves surrounding format
  // ================================================================
// ================================================================
  // 9) FORMATTED TEXT (Bold) — deletion preserves surrounding format
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'bold';
  });
  await sleep(100);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const textNode = el.firstChild;
    const range = doc.createRange();
    range.selectNodeContents(el);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('bold', false, null);
  });
  await sleep(100);
  let html = await getBodyHTML(page);
  check('FORMAT: bolds text successfully', html.includes('<b>'), 'html=[' + html + ']');

  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const textNode = el.querySelector('b') ? el.querySelector('b').firstChild : el.firstChild;
    const range = doc.createRange();
    range.setStart(textNode, 3);
    range.setEnd(textNode, 3);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);
  text = await getBodyText(page);
  html = await getBodyHTML(page);
  check('FORMAT DELETE: bold text "bold" Delete after bol -> "bol", <b> preserved',
    text === 'bol' && html.includes('<b>'),
    'text=[' + text + '] html=[' + html + ']');

  // ================================================================
  // 10) TABLE-CELL deletion
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.innerHTML = '';
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const table = document.createElement('table');
    table.className = 'note-table';
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.className = 'note-cell';
    td.contentEditable = 'true';
    td.textContent = 'tabletext';
    tr.appendChild(td);
    table.appendChild(tr);
    const wrap = document.createElement('div');
    wrap.className = 'note-table-wrap';
    wrap.contentEditable = 'false';
    wrap.appendChild(table);
    el.appendChild(wrap);
  });
  await sleep(200);
  await page.evaluate(() => {
    const td = document.querySelector('.note-cell');
    if (!td) return;
    td.focus();
    const doc = td.ownerDocument;
    const range = doc.createRange();
    range.setStart(td.firstChild, 5);
    range.setEnd(td.firstChild, 5);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await page.evaluate(() => {
    const td = document.querySelector('.note-cell');
    return td ? td.innerText : 'NO_CELL';
  });
  check('TABLE CELL BACKSPACE: delete char inside cell -> "tabltext"', text === 'tabltext', 'text=[' + text + ']');

  // ================================================================
  // 14) EMPTY EDITOR remains valid
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.innerHTML = '';
  });
  await sleep(300);
  text = await getBodyText(page);
  check('EMPTY: editor empty after clearing', text === '', 'text=[' + text + ']');
  const noteAfterEmpty = await noteByTitle(page, 'DeleteKeyTest');
  check('EMPTY: note still exists in storage after empty body',
    !!noteAfterEmpty, noteAfterEmpty ? 'title=' + noteAfterEmpty.title : 'missing');

  // ================================================================
  // 15) BOUNDARY — Backspace at start does nothing
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.focus();
    el.textContent = 'test';
  });
  await sleep(100);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const range = doc.createRange();
    range.setStart(el, 0);
    range.setEnd(el, 0);
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Backspace');
  await sleep(200);
  text = await getBodyText(page);
  check('BOUNDARY: Backspace at start does nothing', text === 'test', 'text=[' + text + ']');

  // ================================================================
  // 16) BOUNDARY — Delete at end does nothing
  // ================================================================
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    if (!el) return;
    el.focus();
    const doc = el.ownerDocument;
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = doc.createRange();
    let lastNode = null, lastLen = 0;
    while ((node = walker.nextNode())) { lastNode = node; lastLen = node.nodeValue.length; }
    if (lastNode) {
      range.setStart(lastNode, lastLen);
      range.setEnd(lastNode, lastLen);
    } else {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    const sel = doc.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(200);
  text = await getBodyText(page);
  check('BOUNDARY: Delete at end does nothing', text === 'test', 'text=[' + text + ']');

  // ================================================================
  // SUMMARY
  // ================================================================
  const fatal = pageError ? pageError.split('\n').filter((l) => l).join(' ') : '';
  check('RUNTIME: no uncaught page/console errors', !pageError, fatal ? fatal.slice(0, 300) : 'clean');

} catch (err) {
  console.error('HARNESS ERROR:', err);
  results.push({ name: 'HARNESS', ok: false, detail: err.message });
} finally {
  if (browser) await browser.close();
  server.close();
}

const pass = results.filter((r) => r.ok).length;
console.log('\n==== RESULT: ' + pass + '/' + results.length + ' passed ====');
process.exit(pass === results.length ? 0 : 1);