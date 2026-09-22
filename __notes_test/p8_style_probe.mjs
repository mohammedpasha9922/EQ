// PART 08 style probe — verifies a note style click applies the scoped class
// on the editor body, toggles the correct active button, and persists on the note.
// Test-only; does not modify app.js / index.html / styles.css.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const PORT = 8632;

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
  } catch { if (!res.headersSent) { res.writeHead(404); res.end('not found'); } }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pageErrors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
await page.setViewport({ width: 1400, height: 1000 });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(250);
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
await page.evaluate(() => document.getElementById('noteTitleInput').value = 'Style Probe Note');
await page.evaluate(() => document.getElementById('noteBodyInput').focus());
await sleep(150);

// Open the Aa panel to expose the Styles & Frames rows.
await page.evaluate(() => {
  const btn = document.querySelector('[data-i18n="noteAaBtn"]') || document.getElementById('noteAaButton');
  (btn || document.querySelector('.note-aa-btn')).click();
});
await sleep(250);

const styleInfo = await page.evaluate(() => {
  const row = document.getElementById('noteAaStylesRow');
  if (!row) return null;
  const btns = Array.from(row.querySelectorAll('.note-aa-style-btn')).map((b) => ({
    id: b.getAttribute('data-style-id'),
    text: b.textContent.trim(),
    cls: b.className
  }));
  return { btns };
});
console.log('STYLE BUTTONS:', JSON.stringify(styleInfo && styleInfo.btns, null, 2));

// Click the Simple style button.
const simpleClicked = await page.evaluate(() => {
  const row = document.getElementById('noteAaStylesRow');
  const b = row && Array.from(row.querySelectorAll('.note-aa-style-btn')).find((x) => x.getAttribute('data-style-id') === 'simple');
  if (!b) return false;
  b.click();
  return true;
});
await sleep(350);
check('simple style button clickable', simpleClicked === true);

const body = await page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  const active = Array.from((document.getElementById('noteAaStylesRow') || { querySelectorAll: () => [] }).querySelectorAll('.note-aa-style-btn.is-active')).map((b) => b.getAttribute('data-style-id'));
  return {
    hasSimple: el.classList.contains('note-style-simple'),
    styles: Array.from(el.classList).filter((c) => /^note-style-/.test(c)),
    activeStyles: active
  };
});
check('note-style-simple applied to body', body.hasSimple, 'styles=' + JSON.stringify(body.styles));
check('Simple button is active', body.activeStyles.includes('simple'), 'active=' + JSON.stringify(body.activeStyles));

// Switch to Academic — should remove simple and add academic.
await page.evaluate(() => {
  const row = document.getElementById('noteAaStylesRow');
  const b = row && Array.from(row.querySelectorAll('.note-aa-style-btn')).find((x) => x.getAttribute('data-style-id') === 'academic');
  if (b) b.click();
});
await sleep(350);
const body2 = await page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  const styles = Array.from(el.classList).filter((c) => /^note-style-/.test(c));
  return {
    hasAcademic: el.classList.contains('note-style-academic'),
    hasSimple: el.classList.contains('note-style-simple'),
    styles
  };
});
check('switching to academic removes simple', !body2.hasSimple && body2.hasAcademic, 'styles=' + JSON.stringify(body2.styles));

// Verify persistence on the stored note object.
const stored = await page.evaluate((k) => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}, STORAGE_KEY);
const target = stored.find((n) => n && n.title === 'Style Probe Note');
check('note persisted with style=academic', !!(target && target.noteStyle === 'academic'), JSON.stringify(target && { style: target.noteStyle, title: target.title }));

check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
console.log(fail === 0 ? '\nALL STYLE CHECKS PASSED' : `\n${fail} STYLE CHECK(S) FAILED`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
