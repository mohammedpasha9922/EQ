// NOTES CORE — isolated browser verification harness (test-only artifact).
// Does NOT modify any production file. Drives the real UI via Puppeteer + Chrome
// and verifies: CREATE / EDIT / AUTO-SAVE / PERSISTENT STORAGE / LIST / DELETE /
// Arabic + English + mixed text round-trip.
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
const PORT = 8197;

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
// ---------- minimal static server ----------
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
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
}
async function noteByTitle(page, title) {
  return (await readStoredNotes(page)).find((n) => n.title === title) || null;
}
async function openNotes(page) {
  // Dispatch click via evaluate: the bound listeners fire regardless of the
  // drawer's CSS visibility/transition state (avoids actionability races).
  const ok = await page.evaluate(() => {
    const btn = document.querySelector('.drawer-menu-item[data-action="open-notes"]');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!ok) throw new Error('open-notes button missing');
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 4000 });
}
async function newNote(page) {
  const ok = await page.evaluate(() => {
    const btn = document.getElementById('openNewNoteButton');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!ok) throw new Error('openNewNoteButton missing');
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 4000 });
}
async function setTitle(page, text) {
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', text);
}
async function setBody(page, text) {
  await page.click('#noteBodyInput');
  await page.type('#noteBodyInput', text);
}
async function closeEditor(page) {
  await page.click('#closeFullScreenNote').catch(() => {});
}
async function closeNotesManager(page) {
  await page.click('#closeNotesManager').catch(() => {});
}
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=500,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 900 });

  // Track real uncaught exceptions only (console 404s from the minimal static
  // server + a benign SVG-path warning in pre-existing icon markup are not
  // uncaught JS errors and are unrelated to the Notes feature).
  let pageError = null;
  page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });

  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 20000 });
  await clearNotesStorage(page);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);

  // ---------- 1) CREATE note ----------
  await openNotes(page);
  await newNote(page);
  const title1 = 'First Note 123';
  const body1 = 'hello world content';
  await setTitle(page, title1);
  await setBody(page, body1);
  await sleep(800); // wait for the 350ms debounce

  const stored = await noteByTitle(page, title1);
  check('CREATE: note persisted with unique id/title/body/createdAt/updatedAt',
    !!stored && !!stored.id && stored.title === title1 && stored.body === body1 &&
    !!stored.createdAt && !!stored.updatedAt,
    stored ? 'id=' + stored.id : 'not-stored');
  const id1 = stored ? stored.id : null;

  // ---------- 2) Refresh persistence ----------
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);
  await openNotes(page);
  const listHasTitle1 = await page.evaluate((t) => {
    return Array.from(document.querySelectorAll('#notesList .note-item')).some((el) =>
      el.querySelector('.note-item-title').textContent.trim() === t);
  }, title1);
  check('PERSIST: note still present after full page refresh', listHasTitle1);
  await closeNotesManager(page);
  await sleep(200);
// ---------- 3) EDIT title + content ----------
  await openNotes(page);
  await page.click('#notesList .note-item');
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 4000 });
  const title1b = 'First Note EDITED 456';
  const body1b = 'content updated here';
  await page.evaluate(() => {
    const el = document.getElementById('noteTitleInput');
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await setTitle(page, title1b);
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await setBody(page, body1b);
  await sleep(800);

  let stored2 = await noteByTitle(page, title1b);
  check('EDIT: note id unchanged and title/body updated via auto-save',
    stored2 && stored2.id === id1 && stored2.title === title1b && stored2.body === body1b && stored2.createdAt <= stored2.updatedAt,
    stored2 ? 'id=' + (stored2.id) : 'missing');
  await closeEditor(page);
  await closeNotesManager(page);
  await sleep(200);

  // ---------- 4) Second note; first stays untouched ----------
  await openNotes(page);
  await newNote(page);
  const title2 = 'Second Note mixed 123';
  const body2 = 'mixed english + 987 text';
  await setTitle(page, title2);
  await setBody(page, body2);
  await sleep(800);
  stored2 = await noteByTitle(page, title2);
  const firstStillOk = await noteByTitle(page, title1b);
  check('SECOND NOTE: created; first note unchanged',
    !!stored2 && !!firstStillOk && firstStillOk.title === title1b && firstStillOk.body === body1b,
    stored2 ? 'first=' + (firstStillOk && firstStillOk.title) : 'second-missing');
  await closeEditor(page);
  await closeNotesManager(page);
  await sleep(200);

  // ---------- 5) Arabic / English / numbers round-trip ----------
  await openNotes(page);
  await newNote(page);
  const arTitle = 'ملاحظة عربية';
  const arBody = 'هذا النص بالعربية 123 وينتهي بmixed English ending';
  await setTitle(page, arTitle);
  await setBody(page, arBody);
  await sleep(800);
  const arStored = await noteByTitle(page, arTitle);
  check('ARABIC+ENGLISH+numbers: stored text identical (round-trip preserved)',
    !!arStored && arStored.title === arTitle && arStored.body === arBody,
    arStored ? 'body=[' + arStored.body + ']' : 'missing');
  await closeEditor(page);
  await closeNotesManager(page);
  await sleep(200);
// ---------- 6) DELETE first note with confirmation ----------
  await openNotes(page);
  await page.evaluate((t) => {
    const item = Array.from(document.querySelectorAll('#notesList .note-item'))
      .find((el) => el.querySelector('.note-item-title').textContent.trim() === t);
    if (item) item.querySelector('[data-action="delete"]').click();
  }, title1b);
  await page.evaluate(() => { document.getElementById('navDeletedBtn').click(); });
  await page.waitForSelector('#deletedNotesList .note-item', { timeout: 4000 });
  const deletedShown = await page.evaluate(() => document.querySelectorAll('#deletedNotesList .note-item').length);
  check('DELETE: first note soft-deleted, still restorable', deletedShown >= 1, 'deletedItems=' + deletedShown);

  // permanent delete -> confirm modal; CANCEL first -> nothing deleted
  await page.evaluate(() => {
    const btn = document.querySelector('#deletedNotesList .note-item [data-action="permanent-delete"]');
    if (btn) btn.click();
  });
  await page.waitForSelector('#deleteConfirmModal.show', { visible: true, timeout: 4000 });
  await page.click('#deleteConfirmCancel');
  await sleep(200);
  const stillDeleted = await page.evaluate(() => document.querySelectorAll('#deletedNotesList .note-item').length);
  check('DELETE: Cancel keeps the note (nothing deleted)', stillDeleted >= 1, 'afterCancel=' + stillDeleted);

  // CONFIRM now
  await page.evaluate(() => {
    const btn = document.querySelector('#deletedNotesList .note-item [data-action="permanent-delete"]');
    if (btn) btn.click();
  });
  await page.waitForSelector('#deleteConfirmModal.show', { visible: true, timeout: 4000 });
  await page.click('#deleteConfirmOk');
  await sleep(400);

  await page.evaluate(() => { document.getElementById('navNotesBtn').click(); });
  await sleep(300);
  const remaining = await readStoredNotes(page);
  const activeRemaining = remaining.filter((n) => !n.deletedAt);
  const secondStillThere = activeRemaining.some((n) => n.title === title2);
  const arStillThere = activeRemaining.some((n) => n.title === arTitle);
  const firstGone = activeRemaining.every((n) => n.title !== title1b);
  check('DELETE: confirmed deletion removes only the target; other notes remain',
    firstGone && secondStillThere && arStillThere,
    'active=' + activeRemaining.map((n) => n.title).join(' | '));

  const fatal = pageError ? pageError.split('\n').filter((l) => l).join(' ') : '';
  check('RUNTIME: no uncaught page errors', !pageError, fatal ? fatal.slice(0, 300) : 'clean');

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