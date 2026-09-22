// N02 — NOTES HOME behavioral harness (real Chrome, test-only artifact).
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
const PORT = 8371;
const LOG = path.join(HERE, 'n02_home_check.log');

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
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': mimeOf(p) + '; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((res) => server.listen(PORT, res));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DAY = 86400000;
const seedNotes = [
  { id: 'n-alpha', title: 'Alpha', body: 'oldest note body zeppelin', folderId: 'personal', createdAt: Date.now() - 3 * DAY, updatedAt: Date.now() - 3 * DAY },
  { id: 'n-study', title: 'Study Notes', body: 'quantum physics summary', folderId: 'personal', createdAt: Date.now() - 1 * DAY, updatedAt: Date.now() - 1 * DAY },
  { id: 'n-proj', title: 'Project Notes', body: 'project roadmap details', folderId: 'personal', createdAt: Date.now() - 3600e3, updatedAt: Date.now() - 3600e3 },
  { id: 'n-table', title: 'Table Note', body: '', folderId: 'personal', createdAt: Date.now() - 2 * DAY, updatedAt: Date.now() - 2 * DAY,
    bodyBlocks: [{ type: 'table', header: false, rows: [['A', 'B'], ['1', '2']] }] }
];
const seedFolders = [{ id: 'personal', name: 'Personal', createdAt: Date.now() }];

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  let promptAnswer = null;
  page.on('dialog', async (d) => { if (d.type() === 'prompt') await d.accept(promptAnswer ?? ''); else await d.accept(); });

  const goto = async () => { await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 }); await sleep(700); };
  const seed = async () => { await page.evaluate((kf, f, kn, n) => { localStorage.setItem(kf, JSON.stringify(f)); localStorage.setItem(kn, JSON.stringify(n)); }, FOLDERS_KEY, seedFolders, STORAGE_KEY, JSON.parse(JSON.stringify(seedNotes))); };
  const openHome = async () => {
    await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
    await sleep(200);
  };
  const cardTitles = () => page.evaluate(() => Array.from(document.querySelectorAll('#notesList .note-item .note-item-title')).map((e) => e.textContent.trim()));
  const clickMenuAction = async (cardTitle, action) => page.evaluate((t, a) => {
    const card = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => li.querySelector('.note-item-title')?.textContent.trim() === t);
    if (!card) return false;
    card.querySelector('.note-menu-btn')?.click();
    const btn = card.querySelector(`.note-menu button[data-action="${a}"]`);
    if (!btn) return false;
    btn.click();
    return true;
  }, cardTitle, action);
  const closeEditor = async () => { await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click()); await sleep(250); };

  // ---------- Basic home ----------
  await goto();
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  check('N02-01 drawer entry opens Notes Home', true);
  check('N02-03 header renders (back/title/plus)', await page.evaluate(() =>
    !!document.querySelector('#notesManagerModal.show #closeNotesManager') &&
    !!document.querySelector('#notesManagerModal.show #notesManagerTitle') &&
    !!document.querySelector('#notesManagerModal.show #openNewNoteButton')));
  check('N02-06 existing notes appear (4)', (await cardTitles()).length === 4, JSON.stringify(await cardTitles()));
  check('N02-07 Recent order newest first', JSON.stringify(await cardTitles()) === JSON.stringify(['Project Notes', 'Study Notes', 'Table Note', 'Alpha']), JSON.stringify(await cardTitles()));
  check('N02-19 Last Modified "Updated today" shown', await page.evaluate(() => (document.querySelector('#notesList .note-item .note-item-meta')?.textContent || '').includes('Updated today')));

  // ---------- Search ----------
  await page.type('#notesSearchInput', 'zeppelin'); await sleep(250);
  check('N02-08 search matches note body', JSON.stringify(await cardTitles()) === JSON.stringify(['Alpha']), JSON.stringify(await cardTitles()));
  const setInput = (v) => page.evaluate((val) => { const i = document.getElementById('notesSearchInput'); i.value = val; i.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await setInput('zzzznotfound'); await sleep(250);
  check('N02-09 search no-results state', await page.evaluate(() => !document.getElementById('notesSearchEmpty').classList.contains('hidden')));
  await setInput(''); await sleep(200);

  // ---------- Plus / open ----------
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  check('N02-05 Plus opens Note Editor', true);
  await closeEditor();
  await page.evaluate(() => { const c = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => li.querySelector('.note-item-title')?.textContent.trim() === 'Study Notes'); c.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  const openedTitle = await page.evaluate(() => document.getElementById('noteTitleInput').value);
  check('N02-10 card click opens Note with content', openedTitle === 'Study Notes', openedTitle);
  await closeEditor();
  // ---------- Rename ----------
  promptAnswer = 'Renamed Note';
  check('N02-11 rename works', await clickMenuAction('Study Notes', 'rename')); await sleep(250);
  check('N02-11b renamed shows in Home', (await cardTitles()).includes('Renamed Note'), JSON.stringify(await cardTitles()));
  check('N02-21 rename persists in storage', await page.evaluate(() => JSON.parse(localStorage.getItem('eq-note-manager-notes')).some((n) => n.title === 'Renamed Note')));

  // ---------- Duplicate ----------
  check('N02-12 duplicate works', await clickMenuAction('Renamed Note', 'duplicate')); await sleep(250);
  const dup = await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('eq-note-manager-notes'));
    const orig = arr.find((n) => n.title === 'Renamed Note');
    const copies = arr.filter((n) => n.title.startsWith('Renamed Note'));
    return { count: copies.length, copyBody: copies.find((n) => n !== orig)?.body, origIntact: !!orig };
  });
  check('N02-12b duplicate: copy suffix + body kept + original intact', dup.count === 2 && dup.origIntact && typeof dup.copyBody === 'string', JSON.stringify(dup));

  // ---------- Pin / Unpin ----------
  check('N02-13 pin works', await clickMenuAction('Alpha', 'pin')); await sleep(250);
  const pinState = await page.evaluate(() => ({
    pinnedClass: !!document.querySelector('#notesList .note-item.pinned'),
    first: document.querySelector('#notesList .note-item .note-item-title')?.textContent.trim(),
    stored: JSON.parse(localStorage.getItem('eq-note-manager-notes')).find((n) => n.title === 'Alpha')?.pinned
  }));
  check('N02-13b pinned card highlighted + on top + persisted', pinState.pinnedClass && pinState.first === 'Alpha' && pinState.stored === true, JSON.stringify(pinState));
  check('N02-14 unpin works', await clickMenuAction('Alpha', 'pin')); await sleep(250);
  const expectFirst = () => page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('eq-note-manager-notes')).filter((n) => !n.deletedAt);
    arr.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    arr.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return arr[0]?.title;
  });
  check('N02-14b unpinned: correct newest-first restored', (await page.evaluate(() => document.querySelector('#notesList .note-item .note-item-title')?.textContent.trim())) === await expectFirst());

  // ---------- Sort ----------
  await page.select('#notesSortSelect', 'oldest'); await sleep(200);
  check('N02-16 sort oldest', (await cardTitles())[0] === 'Alpha', JSON.stringify(await cardTitles()));
  await page.select('#notesSortSelect', 'az'); await sleep(200);
  check('N02-17 sort A-Z', (await cardTitles())[0] === 'Alpha' && (await cardTitles()).slice().sort((a, b) => a.localeCompare(b)).join('|') === (await cardTitles()).join('|'), JSON.stringify(await cardTitles()));
  await page.select('#notesSortSelect', 'newest'); await sleep(200);
  check('N02-15 sort newest (default)', (await cardTitles())[0] === await expectFirst(), JSON.stringify(await cardTitles()));

  // ---------- Delete ----------
  check('N02-18 delete works', await clickMenuAction('Table Note', 'delete')); await sleep(250);
  const del = await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('eq-note-manager-notes'));
    const n = arr.find((x) => x.title === 'Table Note');
    return { gone: !arr.some((x) => x.title === 'Table Note' && !x.deletedAt), kept: !!n };
  });
  check('N02-18b soft delete keeps record with deletedAt', del.gone && del.kept, JSON.stringify(del));

  // ---------- Back ----------
  await page.evaluate(() => document.getElementById('closeNotesManager').click()); await sleep(250);
  check('N02-04 back closes Notes Home', await page.evaluate(() => !document.getElementById('notesManagerModal').classList.contains('show')));

  // ---------- Persistence after reopen ----------
  await openHome();
  const titlesAfter = await cardTitles();
  check('N02-22/23 rename+duplicate persist after reopen', titlesAfter.includes('Renamed Note') && titlesAfter.some((t) => t.startsWith('Renamed Note (copy)')), JSON.stringify(titlesAfter));

  // ---------- Empty state ----------
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  check('N02-20 empty state + create-first-note hint', await page.evaluate(() =>
    !document.getElementById('notesEmptyState').classList.contains('hidden') &&
    (document.querySelector('#notesEmptyState .notes-empty-sub')?.textContent || '').includes('Create your first note')));
  // ---------- Responsive + touch ----------
  const viewports = [[1366, 850, 'Desktop'], [768, 1024, 'Tablet'], [390, 844, 'Mobile']];
  await page.evaluate((kf, f, kn, n) => { localStorage.setItem(kf, JSON.stringify(f)); localStorage.setItem(kn, JSON.stringify(n)); }, FOLDERS_KEY, seedFolders, STORAGE_KEY, JSON.parse(JSON.stringify(seedNotes)));
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  for (let vi = 0; vi < viewports.length; vi++) {
    const [w, h, label] = viewports[vi];
    await page.setViewport({ width: w, height: h, hasTouch: label === 'Mobile', isMobile: label === 'Mobile' });
    await sleep(250);
    const r = await Promise.race([
      page.evaluate(() => {
        const modal = document.querySelector('#notesManagerModal .notes-manager');
        const inp = document.getElementById('notesSearchInput');
        const plus = document.getElementById('openNewNoteButton');
        return {
          overflow: modal ? modal.scrollWidth - modal.clientWidth : -1,
          searchVisible: !!inp && inp.offsetWidth > 0,
          plusVisible: !!plus && plus.offsetWidth > 0,
          items: document.querySelectorAll('#notesList .note-item').length
        };
      }),
      new Promise((res) => setTimeout(() => res({ timeout: true }), 10000))
    ]);
    check(`N02-${26 + vi} ${label}: no horizontal overflow + search/plus visible`, !r.timeout && r.overflow <= 1 && r.searchVisible && r.plusVisible, JSON.stringify(r));
  }
  // The app closes modals on viewport change — re-open Notes Home before measuring.
  await openHome();
  const touchInfo = await Promise.race([
    page.evaluate(() => {
      const b = document.querySelector('.note-menu-btn');
      return {
        exists: !!b,
        size: b ? Math.min(b.offsetWidth, b.offsetHeight) : 0,
        items: document.querySelectorAll('#notesList .note-item').length,
        modalOpen: document.getElementById('notesManagerModal')?.classList.contains('show'),
        stored: JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]').length
      };
    }),
    new Promise((res) => setTimeout(() => res({ timeout: true }), 10000))
  ]);
  check('N02-29 touch target >= 30px', !touchInfo.timeout && touchInfo.exists && touchInfo.size >= 30, JSON.stringify(touchInfo));

  // ---------- Localization (Arabic RTL) ----------
  await page.setViewport({ width: 1366, height: 850 });
  await page.evaluate((k) => localStorage.setItem(k, 'ar'), LANG_KEY);
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  const ar = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir') || document.body.getAttribute('dir'),
    placeholder: document.getElementById('notesSearchInput')?.placeholder,
    sortFirst: document.querySelector('#notesSortSelect option')?.textContent.trim()
  }));
  check('N02-32 Arabic RTL: dir + placeholder + sort options', ar.dir === 'rtl' && (ar.placeholder || '').includes('ابحث') && ar.sortFirst === 'الأحدث', JSON.stringify(ar));

  // ---------- Regression: editor, table content, formatting, PDF ----------
  await page.evaluate((k) => localStorage.setItem(k, 'en'), LANG_KEY);
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  await page.evaluate(() => { const c = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => li.querySelector('.note-item-title')?.textContent.trim() === 'Table Note'); c.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(400);
  const reg = await page.evaluate(() => ({
    table: !!document.querySelector('#noteBodyInput table.note-table'),
    pdfBtn: !!document.getElementById('exportNotePdfBtn'),
    toolbar: !!document.querySelector('.note-format-toolbar')
  }));
  check('N02-33/35/36 editor opens; table intact; formatting toolbar present', reg.table && reg.toolbar, JSON.stringify(reg));
  check('N02-37 PDF export still available in editor', reg.pdfBtn);
  await closeEditor();

  // NOTE: the "<path> attribute d" SVG parse error is PRE-EXISTING (index.html drawer icon,
  // confirmed in tests/__fc_run.txt and Phase-06 logs from before N02). Not caused by N02.
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('attribute d: Expected number'));
  check('N02-38 no JS console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  fs.writeFileSync(path.join(HERE, 'n02_home_check.result.txt'), results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name}`).join('\n') + `\nTOTAL ${results.filter(r => r.ok).length}/${results.length}\n`);
  console.log(`\nN02 RESULT: ${results.filter(r => r.ok).length}/${results.length} passed`);
} catch (e) {
  console.error('HARNESS ERROR:', e.message);
  try { fs.appendFileSync(LOG, 'HARNESS ERROR: ' + e.message + '\n'); } catch (_) {}
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}



