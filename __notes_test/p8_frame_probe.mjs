// PART 08 frame probe — verifies a note frame click applies the scoped class
// on the editor body, toggles the correct active button, persists on the note,
// and never leaves duplicate frame classes behind. Test-only; does not modify
// app.js / index.html / styles.css.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const PORT = 8631;

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
await page.evaluate(() => document.getElementById('noteTitleInput').value = 'Frame Probe Note');
await page.evaluate(() => document.getElementById('noteBodyInput').focus());
await sleep(150);

// Open the Aa panel to expose the Styles & Frames rows.
await page.evaluate(() => {
  const btn = document.querySelector('[data-i18n="noteAaBtn"]') || document.getElementById('noteAaButton');
  (btn || document.querySelector('.note-aa-btn')).click();
});
await sleep(250);

const frameInfo = await page.evaluate(() => {
  const row = document.getElementById('noteAaFramesRow');
  if (!row) return null;
  const btns = Array.from(row.querySelectorAll('.note-aa-frame-btn')).map((b) => ({
    id: b.getAttribute('data-frame-id'),
    text: b.textContent.trim(),
    cls: b.className
  }));
  return { btns };
});
console.log('FRAME BUTTONS:', JSON.stringify(frameInfo && frameInfo.btns, null, 2));

// Click the Dashed frame button.
const dashedClicked = await page.evaluate(() => {
  const row = document.getElementById('noteAaFramesRow');
  const b = row && Array.from(row.querySelectorAll('.note-aa-frame-btn')).find((x) => x.getAttribute('data-frame-id') === 'dashed');
  if (!b) return false;
  b.click();
  return true;
});
await sleep(350);
check('dashed frame button clickable', dashedClicked === true);

const body = await page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  const active = Array.from((document.getElementById('noteAaFramesRow') || { querySelectorAll: () => [] }).querySelectorAll('.note-aa-frame-btn.is-active')).map((b) => b.getAttribute('data-frame-id'));
  return {
    hasDashed: el.classList.contains('note-frame-dashed'),
    frames: Array.from(el.classList).filter((c) => /^note-frame-/.test(c)),
    activeFrames: active,
    dup: (function () {
      const all = Array.from(el.classList).filter((c) => /^note-frame-/.test(c));
      return all.length !== new Set(all).size;
    })()
  };
});
check('note-frame-dashed applied to body', body.hasDashed, 'frames=' + JSON.stringify(body.frames));
check('no duplicate frame classes', !body.dup, 'frames=' + JSON.stringify(body.frames));
check('only one frame class on body', body.frames.length === 1, 'frames=' + JSON.stringify(body.frames));
check('Dashed button is active', body.activeFrames.includes('dashed'), 'active=' + JSON.stringify(body.activeFrames));

// Switch to Soft — should remove dashed and add soft (no duplicates).
await page.evaluate(() => {
  const row = document.getElementById('noteAaFramesRow');
  const b = row && Array.from(row.querySelectorAll('.note-aa-frame-btn')).find((x) => x.getAttribute('data-frame-id') === 'soft');
  if (b) b.click();
});
await sleep(350);
const body2 = await page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  const frames = Array.from(el.classList).filter((c) => /^note-frame-/.test(c));
  return {
    hasSoft: el.classList.contains('note-frame-soft'),
    hasDashed: el.classList.contains('note-frame-dashed'),
    frames,
    dup: frames.length !== new Set(frames).size
  };
});
check('switching to Soft removes Dashed', !body2.hasDashed && body2.hasSoft, 'frames=' + JSON.stringify(body2.frames));
check('no duplicate frame classes after switch', !body2.dup, 'frames=' + JSON.stringify(body2.frames));

// Verify persistence on the stored note object.
const stored = await page.evaluate((k) => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}, STORAGE_KEY);
const target = stored.find((n) => n && n.title === 'Frame Probe Note');
check('note persisted with frame=soft', !!(target && target.noteFrame === 'soft'), JSON.stringify(target && { frame: target.noteFrame, title: target.title }));

check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
console.log(fail === 0 ? '\nALL FRAME CHECKS PASSED' : `\n${fail} FRAME CHECK(S) FAILED`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);

