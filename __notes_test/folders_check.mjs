// FOLDERS CHECK — real-browser harness (test-only artifact, does not modify production files).
// Drives the real EQ UI via Puppeteer + Chrome and verifies the Folders system.
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
const UNFILED_ID = '__unfiled__';
const PORT = 8237;

const MIME = {
  '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.jpg':'image/jpeg'
};

const results = [];
const LOG_FILE = 'C:\\Users\\SHCH-HR\\Desktop\\EQ\\__notes_test\\folders_check.log';
function logLine(txt) {
  try { fs.appendFileSync(LOG_FILE, txt + '\n'); } catch (e) { /* ignore */ }
}
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  logLine(line);
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
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await Promise.race([
  new Promise((res, rej) => { server.once('error', rej); server.listen(PORT, res); }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('server.listen timed out on ' + PORT)), 8000))
]).catch((e) => {
  logLine('LISTEN ERROR: ' + e.message);
  console.error('LISTEN ERROR: ' + e.message);
  try { process.exit(9); } catch (_) { }
});
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- dialog auto-responder (prompt/confirm/alert) ----------
let dialogQueue = [];
function queuePrompt(text) { dialogQueue.push({ type: 'prompt', text }); }
function queueConfirm(accept) { dialogQueue.push({ type: 'confirm', accept }); }

async function readFolders(page) {
  return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, FOLDERS_KEY);
}
async function readNotes(page) {
  return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY);
}
async function noteByTitle(page, title) {
  return (await readNotes(page)).find((n) => n.title === title) || null;
}
async function clearStorage(page) {
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
}
async function seedStorage(page, folders, notes) {
  await page.evaluate((kf, f, kn, n) => {
    localStorage.setItem(kf, JSON.stringify(f));
    localStorage.setItem(kn, JSON.stringify(n));
  }, FOLDERS_KEY, folders, STORAGE_KEY, notes);
}
async function openNotes(page) {
  await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
  const ok = await page.evaluate(() => {
    const btn = document.querySelector('.drawer-menu-item[data-action="open-notes"]');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!ok) { const u = await page.evaluate(() => location.href).catch(() => 'ERR'); throw new Error('open-notes button missing, url=' + u); }
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function closeNotesManager(page) {
  await page.evaluate(() => { const b = document.getElementById('closeNotesManager'); if (b) b.click(); });
  await sleep(200);
}
async function addFolderViaUi(page, name) {
  queuePrompt(name);
  await page.evaluate(() => { const b = document.getElementById('addFolderButton'); if (b) b.click(); });
  await sleep(250);
}
async function clickFolderTabByName(page, name) {
  const ok = await page.evaluate((n) => {
    const group = Array.from(document.querySelectorAll('.folder-tab-group'))
      .find((g) => { const t = g.querySelector(':scope > .folder-tab'); return t && t.textContent.trim() === n; });
    if (group) { group.querySelector(':scope > .folder-tab').click(); return true; }
    return false;
  }, name);
  if (!ok) throw new Error('folder tab not found: ' + name);
  await sleep(200);
}
async function clickUnfiledTab(page) {
  const ok = await page.evaluate((id) => {
    const b = document.querySelector('#folderTabsScroll > button.folder-tab[data-folder-id="' + id + '"]');
    if (!b) return false;
    b.click();
    return true;
  }, UNFILED_ID);
  if (!ok) throw new Error('unfiled tab not found');
  await sleep(200);
}

async function openNewNoteEditor(page) {
  const ok = await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) { b.click(); return true; } return false; });
  if (!ok) throw new Error('openNewNoteButton missing');
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 4000 });
}
async function setNoteFieldsAndClose(page, title, body) {
  await page.click('#noteTitleInput');
  await page.type('#noteTitleInput', title);
  await page.click('#noteBodyInput');
  await page.type('#noteBodyInput', body);
  await sleep(500);
  await page.click('#closeFullScreenNote');
  await sleep(300);
}
async function renderNoteTitles(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#notesList .note-item-title')).map((el) => el.textContent.trim()));
}
async function clickRename(page, name) {
  const ok = await page.evaluate((n) => {
    const g = Array.from(document.querySelectorAll('.folder-tab-group')).find((el) =>
      el.querySelector(':scope > .folder-tab') && el.querySelector(':scope > .folder-tab').textContent.trim() === n);
    if (!g) return false;
    const b = g.querySelector(':scope > .folder-tab-btn.rename');
    if (b) b.click();
    return !!b;
  }, name);
  if (!ok) throw new Error('rename btn not found for ' + name);
  await sleep(150);
}
async function clickDelete(page, name) {
  const ok = await page.evaluate((n) => {
    const g = Array.from(document.querySelectorAll('.folder-tab-group')).find((el) =>
      el.querySelector(':scope > .folder-tab') && el.querySelector(':scope > .folder-tab').textContent.trim() === n);
    if (!g) return false;
    const b = g.querySelector(':scope > .folder-tab-btn.delete');
    if (b) b.click();
    return !!b;
  }, name);
  if (!ok) throw new Error('delete btn not found for ' + name);
  await sleep(150);
}

try {
  const watchdog = setTimeout(() => {
    logLine('HARNESS TIMEOUT (watchdog)');
    try { process.exit(2); } catch (e) { /* ignore */ }
  }, 90000);
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const txt = m.text();
      // Known benign noise from pre-existing markup / minimal test server:
      // a malformed SVG <path> in the original drawer icons and 404s for
      // assets the tiny static server does not serve. These are NOT uncaught
      // JS errors and are unrelated to the Folders feature.
      if (txt.includes('attribute d: Expected number')) return;
      if (/Failed to load resource: the server responded with a status of 404/.test(txt)) return;
      pageErrors.push('console.error: ' + txt);
    }
  });
  page.on('dialog', async (d) => {
    const item = dialogQueue.shift() || { type: 'confirm', accept: true };
    if (item.type === 'prompt') { await d.accept(item.text); }
    else { if (item.accept) await d.accept(); else await d.dismiss(); }
  });

  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0', timeout: 25000 });
  await clearStorage(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(300);

  // ---------- 1) Create Folder "Work" ----------
  await openNotes(page);
  let folders = await readFolders(page);
  check('DEFAULT: a default folder exists ("personal")', folders.some((f) => f.id === 'personal'), 'folders=' + folders.length);
  await addFolderViaUi(page, 'Work');
  folders = await readFolders(page);
  const work = folders.find((f) => f.name === 'Work');
  check('CREATE FOLDER: "Work" persisted', !!work, JSON.stringify(folders.map((f) => f.name)));
  check('CREATE FOLDER: unique id (not the name)', !!work && !work.id.includes('Work') && work.id !== 'Work', work ? work.id : '');

  // ---------- 2) Open folder + create Note inside it ----------
  await clickFolderTabByName(page, 'Work');
  await openNewNoteEditor(page);
  await setNoteFieldsAndClose(page, 'Note-In-Work', 'body of work note');
  let workNote = await noteByTitle(page, 'Note-In-Work');
  check('CREATE NOTE IN FOLDER: saved with folderId of "Work"', !!workNote && workNote.folderId === work.id,
    workNote ? ('folderId=' + workNote.folderId + ' expected=' + work.id) : 'missing');

  // ---------- 3) Refresh -> folder + note still there with same folderId ----------
  await closeNotesManager(page);
  await page.reload({ waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(300);
  await openNotes(page);
  folders = await readFolders(page);
  const workAfterRefresh = folders.find((f) => f.name === 'Work');
  workNote = await noteByTitle(page, 'Note-In-Work');
  check('REFRESH: folder still exists', !!workAfterRefresh, workAfterRefresh ? 'yes' : 'no');
  check('REFRESH: note still exists with same folderId', !!workNote && workNote.folderId === work.id,
    workNote ? ('folderId=' + workNote.folderId) : 'missing');

  // ---------- 4) Open folder -> shows only its notes ----------
  await clickFolderTabByName(page, 'Work');
  let titles = await renderNoteTitles(page);
  check('OPEN FOLDER: shows only notes in that folder', JSON.stringify(titles) === JSON.stringify(['Note-In-Work']),
    'titles=' + JSON.stringify(titles));

  // ---------- 5) Back to folders level (switch to another folder tab works) ----------
  await clickFolderTabByName(page, 'Personal');
  titles = await renderNoteTitles(page);
  check('BACK TO FOLDERS: switching to another folder shows its (empty) notes', Array.isArray(titles) && titles.length === 0,
    'titles=' + JSON.stringify(titles));

  // ---------- 6) Rename Folder ----------
  queuePrompt('Work Renamed 2');
  await clickRename(page, 'Work');
  folders = await readFolders(page);
  const renamed = folders.find((f) => f.name === 'Work Renamed 2');
  check('RENAME FOLDER: name updated', !!renamed, JSON.stringify(folders.map((f) => f.name)));
  const afterRename = await noteByTitle(page, 'Note-In-Work');
  check('RENAME: note folderId unchanged (same folder)', !!afterRename && afterRename.folderId === work.id,
    afterRename ? ('folderId=' + afterRename.folderId) : 'missing');

  // ---------- 7) Create second folder ----------
  await addFolderViaUi(page, 'Home 123');
  folders = await readFolders(page);
  check('CREATE SECOND FOLDER: "Home 123" persisted', folders.some((f) => f.name === 'Home 123'),
    JSON.stringify(folders.map((f) => f.name)));
  const home = folders.find((f) => f.name === 'Home 123');
  check('TWO FOLDERS: unique ids', home && work.id !== home.id, work.id + ' vs ' + (home ? home.id : 'x'));

  await clickFolderTabByName(page, 'Home 123');
  await openNewNoteEditor(page);
  await setNoteFieldsAndClose(page, 'Home-Note', 'home body');
  const homeNote = await noteByTitle(page, 'Home-Note');
  check('SECOND FOLDER NOTE: folderId = Home 123', !!homeNote && homeNote.folderId === home.id,
    homeNote ? ('folderId=' + homeNote.folderId) : 'missing');

  // ---------- 8) Delete Folder -> notes move to Unfiled, not deleted ----------
  const notesBeforeDelete = (await readNotes(page)).length;
  queueConfirm(true);
  await clickDelete(page, 'Work Renamed 2');
  folders = await readFolders(page);
  const deletedGone = !folders.some((f) => f.name === 'Work Renamed 2');
  check('DELETE FOLDER: folder removed after confirmation', deletedGone, JSON.stringify(folders.map((f) => f.name)));
  const movedNote = await noteByTitle(page, 'Note-In-Work');
  const notesAfterDelete = await readNotes(page);
  check('DELETE FOLDER: notes NOT deleted (count preserved)', notesAfterDelete.length === notesBeforeDelete,
    notesBeforeDelete + ' -> ' + notesAfterDelete.length);
  check('DELETE FOLDER: its note moved to Unfiled', !!movedNote && movedNote.folderId === UNFILED_ID,
    movedNote ? ('folderId=' + movedNote.folderId) : 'missing');

  await clickUnfiledTab(page);
  titles = await renderNoteTitles(page);
  check('UNFILED TAB: shows moved note', titles.includes('Note-In-Work'), 'titles=' + JSON.stringify(titles));

  // ---------- 9) Arabic / English / numbers / mixed names ----------
  await addFolderViaUi(page, 'ملاحظات 123 Work');
  folders = await readFolders(page);
  check('MIXED NAME: Arabic+English+numbers folder persisted', folders.some((f) => f.name === 'ملاحظات 123 Work'),
    JSON.stringify(folders.map((f) => f.name)));
  const mixed = folders.find((f) => f.name === 'ملاحظات 123 Work');
  check('MIXED NAME: unique id', !!mixed && !mixed.id.includes('ملاحظات'), mixed ? mixed.id : '');

  // ---------- empty + duplicate name prevention ----------
  folders = await readFolders(page);
  const beforeEmpty = folders.length;
  await addFolderViaUi(page, '   ');
  folders = await readFolders(page);
  check('EMPTY NAME: rejected (no folder added)', folders.length === beforeEmpty, beforeEmpty + ' -> ' + folders.length);

  const beforeDup = folders.length;
  await addFolderViaUi(page, 'ملاحظات 123 Work');
  folders = await readFolders(page);
  check('DUPLICATE NAME: rejected (no second folder)', folders.length === beforeDup, beforeDup + ' -> ' + folders.length);

  // ---------- 10) Existing notes without folder are not lost (Unfiled) ----------
  await closeNotesManager(page);
  const legacyTitle = 'Legacy-No-Folder';
  await seedStorage(page, [], [{ id: 'legacy-1', title: legacyTitle, body: 'old', createdAt: Date.now(), updatedAt: Date.now() }]);
  await page.reload({ waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(300);
  await openNotes(page);
  await clickUnfiledTab(page);
  titles = await renderNoteTitles(page);
  check('LEGACY UNFILED NOTE: old note (no folder) shown in Unfiled', titles.includes(legacyTitle),
    'titles=' + JSON.stringify(titles));
  const legacyStillStored = await noteByTitle(page, legacyTitle);
  check('LEGACY UNFILED NOTE: still stored (not deleted)', !!legacyStillStored, legacyStillStored ? 'yes' : 'no');

  // ---------- 11) No JS console errors ----------
  check('RUNTIME: no uncaught page/console errors', pageErrors.length === 0,
    pageErrors.length ? pageErrors.slice(0, 3).join(' | ') : 'clean');

} catch (err) {
  console.error('HARNESS ERROR:', err);
  logLine('HARNESS ERROR: ' + (err && err.message ? err.message : err));
  results.push({ name: 'HARNESS', ok: false, detail: err.message });
} finally {
  if (browser) await browser.close();
  server.close();
}

const pass = results.filter((r) => r.ok).length;
const summaryLine = '==== RESULT: ' + pass + '/' + results.length + ' passed ====';
console.log('\n' + summaryLine);
logLine(''); logLine(summaryLine);
process.exit(pass === results.length ? 0 : 1);

