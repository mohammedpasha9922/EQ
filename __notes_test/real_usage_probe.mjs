// REAL-USAGE probe — closest to how a human actually uses the Notes editor.
// Test-only artifact; it does NOT modify app.js / index.html / styles.css.
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
const PORT = 8619;

let fail = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fail++;
}

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (err) { if (!res.headersSent) { res.writeHead(404); res.end('not found'); } }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pageErrors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

async function setup(page, mobile = false) {
  page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
  if (mobile) await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  else await page.setViewport({ width: 1400, height: 1000 });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
  await page.evaluate(() => document.getElementById('noteTitleInput').value = 'RealUsage Note');
  await page.evaluate(() => document.getElementById('noteBodyInput').focus());
  await sleep(150);
}

// Real typing into the contenteditable body via keyboard events.
async function typeText(page, text) {
  await page.keyboard.type(text, { delay: 8 });
  await sleep(120);
}

// Select n characters starting at offset using real keyboard nav.
async function selectByKeyboard(page, offset, n) {
  await page.keyboard.press('Home');
  await sleep(40);
  for (let i = 0; i < offset; i++) { await page.keyboard.press('ArrowRight'); }
  for (let i = 0; i < n; i++) { await page.keyboard.press('Shift+ArrowRight'); }
  await sleep(80);
  return page.evaluate(() => window.getSelection().toString());
}

function stubPicker(page, id) {
  return page.evaluate((sel) => {
    const i = document.getElementById(sel);
    i.__showPickerCalled = 0;
    i.showPicker = () => { i.__showPickerCalled = (i.__showPickerCalled || 0) + 1; };
  }, id);
}
async function pickerOpened(page, id) {
  return page.evaluate((sel) => (document.getElementById(sel).__showPickerCalled || 0) > 0, id);
}
// Simulate the OS picker delivering a color (steals focus + collapses selection first).
async function deliverColor(page, id, color) {
  await page.evaluate(() => { window.getSelection().removeAllRanges(); if (document.activeElement) document.activeElement.blur(); });
  await sleep(30);
  await page.evaluate((sel, col) => {
    const i = document.getElementById(sel);
    i.value = col;
    i.dispatchEvent(new Event('input', { bubbles: true }));
  }, id, color);
  await sleep(150);
}
async function bodyHTML(page) {
  return page.evaluate(() => document.getElementById('noteBodyInput').innerHTML);
}
async function readStored(page) {
  return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY);
}