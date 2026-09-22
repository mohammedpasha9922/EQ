// N03 — CREATE NOTE behavioral harness (real Chrome, test-only artifact).
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
const LANG_KEY = 'eq-language';
const PORT = 8412;
const LOG = path.join(HERE, 'n03_create_check.log');

const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml' };
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': mimeOf(p) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((res) => server.listen(PORT, res));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DAY = 86400000;
const seedNotes = [
  { id: 'n-old', title: 'Pre-existing Note', body: 'legacy content must survive', folderId: 'personal', createdAt: Date.now() - DAY, updatedAt: Date.now() - DAY }
];
const seedFolders = [{ id: 'personal', name: 'Personal', createdAt: Date.now() }];

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  const goto = async () => { await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 }); await sleep(700); };
  const seed = async () => { await page.evaluate((kf, f, kn, n) => { localStorage.setItem(kf, JSON.stringify(f)); localStorage.setItem(kn, JSON.stringify(n)); }, FOLDERS_KEY, seedFolders, STORAGE_KEY, JSON.parse(JSON.stringify(seedNotes))); };
  const openHome = async () => {
    await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
    await sleep(200);
  };
  const closeEditor = async () => { await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click()); await sleep(300); };
  const savedShown = () => page.evaluate(() => document.getElementById('noteSavedIndicator')?.classList.contains('show'));

  await goto();
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();

  // ---------- Create flow ----------
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(200);
  check('N03-01 Plus opens New Note (existing editor)', true);
  check('N03-03 UI: Title field + Start writing placeholder + Saved indicator', await page.evaluate(() => {
    const t = document.getElementById('noteTitleInput');
    const b = document.getElementById('noteBodyInput');
    const s = document.getElementById('noteSavedIndicator');
    return !!t && !!s && (b?.getAttribute('data-i18n-placeholder') === 'noteBodyPlaceholder' || (b?.getAttribute('placeholder') || '').includes('writing'));
  }));
  check('N03-02/04 Title focused immediately + editable', await page.evaluate(() => document.activeElement === document.getElementById('noteTitleInput')));
  check('N03-05 empty title allowed (no validation wall)', await page.evaluate(() => JSON.parse(localStorage.getItem('eq-note-manager-notes')).some((n) => n.title === '')));

  // ---------- Autosave: title ----------
  await page.type('#noteTitleInput', 'N03 Autosave Note'); await sleep(700);
  check('N03-10 title autosaves (no manual Save)', await page.evaluate(() => JSON.parse(localStorage.getItem('eq-note-manager-notes')).some((n) => n.title === 'N03 Autosave Note')));
  check('N03-12 Saved ✓ appears after save', await savedShown());
  await page.type('#noteTitleInput', ' v2'); await sleep(60);
  check('N03-14 indicator resets while editing (debounced)', !(await savedShown()));
  await sleep(700);
  // ---------- Autosave: body ----------
  await page.click('#noteBodyInput');
  await page.keyboard.type('Hello from N03 body');
  await sleep(700);
  const bodySaved = await page.evaluate(() => {
    const n = JSON.parse(localStorage.getItem('eq-note-manager-notes')).find((x) => x.title === 'N03 Autosave Note v2');
    return !!n && (n.body || '').includes('Hello from N03 body');
  });
  check('N03-11 body autosaves', bodySaved);
  check('N03-12b Saved ✓ visible after body save', await savedShown());

  // ---------- Persistence: close/reopen ----------
  await closeEditor();
  await openHome();
  check('N03-09 note appears in Notes Home', await page.evaluate(() =>
    Array.from(document.querySelectorAll('#notesList .note-item .note-item-title')).some((e) => e.textContent.trim() === 'N03 Autosave Note v2')));
  await page.evaluate(() => { const c = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => li.querySelector('.note-item-title')?.textContent.trim() === 'N03 Autosave Note v2'); c.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(300);
  const reopen = await page.evaluate(() => ({
    title: document.getElementById('noteTitleInput').value,
    body: document.getElementById('noteBodyInput').textContent
  }));
  check('N03-15 reopen: title+body intact', reopen.title === 'N03 Autosave Note v2' && reopen.body.includes('Hello from N03 body'), JSON.stringify(reopen));
  await closeEditor();

  // ---------- Persistence: page reload ----------
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  check('N03-16 changes persist after page reload', await page.evaluate(() => {
    const n = JSON.parse(localStorage.getItem('eq-note-manager-notes')).find((x) => x.title === 'N03 Autosave Note v2');
    return !!n && (n.body || '').includes('Hello from N03 body');
  }));
  await openHome();
  check('N03-21 new note at top of Recent (Last Modified updated)', (await page.evaluate(() => document.querySelector('#notesList .note-item .note-item-title')?.textContent)) === 'N03 Autosave Note v2');

  // ---------- Data integrity ----------
  check('N03-17/18 existing notes intact + valid model', await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('eq-note-manager-notes'));
    const old = arr.find((x) => x.title === 'Pre-existing Note');
    const nw = arr.find((x) => x.title === 'N03 Autosave Note v2');
    return !!old && old.body === 'legacy content must survive' && !!nw && typeof nw.id === 'string' && typeof nw.updatedAt === 'number' && typeof nw.folderId === 'string';
  }));

  // ---------- Empty body note ----------
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(150);
  await page.type('#noteTitleInput', 'Empty Body Note');
  await sleep(600);
  await closeEditor();
  check('N03-19/20 empty body note valid + persisted', await page.evaluate(() => {
    const n = JSON.parse(localStorage.getItem('eq-note-manager-notes')).find((x) => x.title === 'Empty Body Note');
    return !!n && typeof n.body === 'string';
  }));
  // ---------- Responsive ----------
  const viewports = [[1366, 850, 'Desktop'], [768, 1024, 'Tablet'], [390, 844, 'Mobile']];
  for (let vi = 0; vi < viewports.length; vi++) {
    const [w, h, label] = viewports[vi];
    await page.setViewport({ width: w, height: h, hasTouch: label === 'Mobile', isMobile: label === 'Mobile' });
    await sleep(250);
    await openHome();
    await page.evaluate(() => document.getElementById('openNewNoteButton').click());
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
    await sleep(150);
    const r = await page.evaluate(() => {
      const ed = document.querySelector('#fullScreenNoteModal .full-screen-note');
      const t = document.getElementById('noteTitleInput');
      return { overflow: ed ? ed.scrollWidth - ed.clientWidth : -1, titleVisible: !!t && t.offsetWidth > 0 };
    });
    check(`N03-${22 + vi} ${label}: editor no overflow + title usable`, r.overflow <= 1 && r.titleVisible, JSON.stringify(r));
    await closeEditor();
    await page.evaluate(() => document.getElementById('closeNotesManager')?.click());
    await sleep(200);
  }
  await page.setViewport({ width: 1366, height: 850 });

  // ---------- Localization: Arabic RTL ----------
  await page.evaluate((k) => localStorage.setItem(k, 'ar'), LANG_KEY);
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(200);
  await page.type('#noteTitleInput', 'عنوان عربي'); await sleep(700);
  const ar = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    title: document.getElementById('noteTitleInput').value,
    saved: document.getElementById('noteSavedIndicator')?.textContent.trim(),
    savedShown: document.getElementById('noteSavedIndicator')?.classList.contains('show')
  }));
  check('N03-28 Arabic RTL: typing + localized Saved ✓', ar.dir === 'rtl' && ar.title === 'عنوان عربي' && (ar.saved || '').includes('تم الحفظ') && ar.savedShown, JSON.stringify(ar));
  await closeEditor();

  // ---------- Regression ----------
  await page.evaluate((k) => localStorage.setItem(k, 'en'), LANG_KEY);
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  check('N03-29 Notes Home still opens', true);
  await page.evaluate(() => { const c = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => li.querySelector('.note-item-title')?.textContent.trim() === 'Pre-existing Note'); c.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(400);
  const reg = await page.evaluate(() => ({
    content: (document.getElementById('noteBodyInput').textContent || '').includes('legacy content must survive'),
    toolbar: document.querySelectorAll('.note-format-btn').length > 0,
    table: !!document.getElementById('noteTableBtn'),
    pdfBtn: !!document.getElementById('exportNotePdfBtn')
  }));
  check('N03-30/31 existing note opens, content intact', reg.content);
  check('N03-32/33 formatting toolbar + tables still present', reg.toolbar && reg.table, JSON.stringify(reg));
  check('N03-34 PDF functionality still available', reg.pdfBtn);
  await closeEditor();
  // NOTE: the "<path> attribute d: Expected number ... a2 2 2 0 0 0" console error is a
  // PRE-EXISTING malformed SVG in the drawer Notes icon (index.html drawer), documented in
  // pre-N03 logs (tests/__fc_run.txt, __notes_test/_p6_console.txt). Not caused by N03.
  const PRE_EXISTING = 'a2 2 2 0 0 0-2 2v14';
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes(PRE_EXISTING));
  check('N03-35 no JS console errors caused by N03', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  fs.writeFileSync(path.join(HERE, 'n03_create_check.result.txt'), results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name}`).join('\n') + `\nTOTAL ${results.filter(r => r.ok).length}/${results.length}\n`);
  console.log(`\nN03 RESULT: ${results.filter(r => r.ok).length}/${results.length} passed`);
} catch (e) {
  console.error('HARNESS ERROR:', e.message);
  try { fs.appendFileSync(LOG, 'HARNESS ERROR: ' + e.message + '\n'); } catch (_) {}
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}



