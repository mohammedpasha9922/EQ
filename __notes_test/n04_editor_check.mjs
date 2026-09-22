// PART 04 — Notes Editor (Checklist + Divider) behavioral harness (real Chrome, test-only).
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
const LOG = path.join(HERE, 'n04_editor_check.log');

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

const seedNotes = [
  { id: 'n-legacy', title: 'Legacy Table Note', body: '', folderId: 'personal', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000,
    bodyBlocks: [{ type: 'table', header: false, rows: [['H1', 'H2'], ['a', 'b']] }] },
  { id: 'n-text', title: 'Plain Note', body: 'just text here', folderId: 'personal', createdAt: Date.now() - 7200e3, updatedAt: Date.now() - 7200e3 }
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
  const openNote = async (title) => {
    // Defensive: ensure the Notes Home modal is actually shown before clicking a card.
    const isShown = await page.evaluate(() => document.getElementById('notesManagerModal')?.classList.contains('show') || false);
    if (!isShown) { await openHome(); }
    const found = await page.evaluate((t) => {
      const card = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => (li.querySelector('.note-item-title')?.textContent.trim() || '') === t);
      if (!card) return false;
      card.click();
      return true;
    }, title);
    if (!found) throw new Error('openNote: card not found for "' + title + '"');
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
    await sleep(300);
  };
  const closeEditor = async () => { await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click()); await sleep(300); };
  const savedToStorage = () => page.evaluate(() => JSON.parse(localStorage.getItem('eq-note-manager-notes')));

  await goto();
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  await openNote('Plain Note');

  // ---- Checklist ----
  await page.evaluate(() => document.getElementById('noteChecklistBtn').click());
  await sleep(200);
  check('P04-08 checklist button inserts checklist', await page.evaluate(() => !!document.querySelector('#noteBodyInput ul.note-checklist')));
  check('P04-08b two default items with checkboxes', await page.evaluate(() => document.querySelectorAll('#noteBodyInput li.note-check-item').length === 2));
  await page.evaluate(() => { const t = document.querySelector('#noteBodyInput .note-check-text'); t.focus(); });
  await page.type('#noteBodyInput .note-check-text', 'Task one');
  await page.evaluate(() => document.querySelector('#noteBodyInput li.note-check-item .note-check-box').click());
  await sleep(200);
  const toggle = await page.evaluate(() => ({ li: document.querySelector('#noteBodyInput li.note-check-item').classList.contains('checked'), aria: document.querySelector('#noteBodyInput .note-check-box').getAttribute('aria-checked') }));
  check('P04-09 checklist toggle updates class + aria', toggle.li && toggle.aria === 'true', JSON.stringify(toggle));
  await sleep(700); // autosave debounce
  const stored = await savedToStorage();
  const clBlock = ((stored.find((n) => n.id === 'n-text') || {}).bodyBlocks || []).find((b) => b.type === 'checklist');
  check('P04-21 checklist autosaves to model', !!clBlock && clBlock.items[0].text === 'Task one' && clBlock.items[0].checked === true, JSON.stringify(clBlock));
  // ---- Divider ----
  await page.evaluate(() => document.getElementById('noteDividerBtn').click());
  await sleep(200);
  check('P04-12 divider button inserts divider', await page.evaluate(() => !!document.querySelector('#noteBodyInput hr.note-divider')));
  await sleep(700);
  const blocks2 = ((await savedToStorage()).find((n) => n.id === 'n-text') || {}).bodyBlocks || [];
  check('P04-12b divider persists as block', blocks2.some((b) => b.type === 'divider'), JSON.stringify(blocks2.map((b) => b.type)));
  check('P04-22 Saved indicator visible after autosave', await page.evaluate(() => { const s = document.getElementById('noteSavedIndicator'); return s && !s.classList.contains('hidden') && s.offsetWidth > 0; }));

  // ---- Persistence across close/reopen + reload ----
  await closeEditor();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  await openNote('Plain Note');
  const persist = await page.evaluate(() => ({
    items: Array.from(document.querySelectorAll('#noteBodyInput li.note-check-item')).map((li) => ({ t: li.querySelector('.note-check-text')?.textContent, c: li.classList.contains('checked') })),
    divider: !!document.querySelector('#noteBodyInput hr.note-divider')
  }));
  check('P04-23 checklist + checked state + divider persist after reload', persist.items.length === 2 && persist.items[0].t === 'Task one' && persist.items[0].c === true && persist.divider, JSON.stringify(persist));

  // ---- Existing lists / formatting still work ----
  await page.evaluate(() => { document.getElementById('noteBodyInput').focus(); });
  await page.type('#noteBodyInput', 'testbold ');
  await sleep(100);
  // Select the freshly-typed text, then apply Bold via the real toolbar button (user path).
  await page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = null;
    while ((node = walker.nextNode())) { if (node.nodeValue && node.nodeValue.includes('testbold')) break; }
    if (!node) return;
    const idx = node.nodeValue.indexOf('testbold');
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + 8);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await page.click('#noteBoldBtn');
  await sleep(600);
  check('P04-13 bold via toolbar button works', await page.evaluate(() => !!document.querySelector('#noteBodyInput b, #noteBodyInput strong')));

  // ---- Regression: legacy table note intact + PDF available ----
  await closeEditor();
  await openNote('Legacy Table Note');
  const reg = await page.evaluate(() => ({
    table: !!document.querySelector('#noteBodyInput table.note-table'),
    pdfBtn: !!document.getElementById('exportNotePdfBtn'),
    previewBtn: !!document.getElementById('notePreviewPdfBtn'),
    toolbar: !!document.querySelector('#fullScreenNoteModal .note-format-toolbar')
  }));
  check('P04-31/32/33 legacy table intact + toolbar + PDF buttons', reg.table && reg.toolbar && reg.pdfBtn && reg.previewBtn, JSON.stringify(reg));
  await closeEditor();
  // ---- N03 regression: plus -> new note -> title focus -> autosave ----
  await openHome();
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(250);
  const focused = await page.evaluate(() => document.activeElement === document.getElementById('noteTitleInput'));
  await page.type('#noteTitleInput', 'N03 Check Note');
  await page.evaluate(() => { document.getElementById('noteBodyInput').focus(); });
  await page.type('#noteBodyInput', 'hello N03 body');
  await sleep(700);
  const n03 = await savedToStorage();
  check('P04-N03 plus→title focus→autosave intact', focused && n03.some((n) => n.title === 'N03 Check Note' && (n.body || '').includes('hello N03 body')), 'focused=' + focused);
  await closeEditor();

  // ---- N02 regression: home search/sort/open ----
  await openHome();
  await page.type('#notesSearchInput', 'zebra-not-exist'); await sleep(250);
  check('P04-N02 search still works', await page.evaluate(() => !document.getElementById('notesSearchEmpty').classList.contains('hidden')));
  await page.evaluate(() => { const i = document.getElementById('notesSearchInput'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await sleep(200);
  check('P04-N02 cards present', (await page.evaluate(() => document.querySelectorAll('#notesList .note-item').length)) >= 3);

  // ---- Mobile viewport: editor no overflow, toolbar visible, touch ----
  await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  await sleep(250);
  await openNote('Plain Note');
  const mob = await page.evaluate(() => {
    const m = document.getElementById('fullScreenNoteModal');
    const tb = document.querySelector('#fullScreenNoteModal .note-format-toolbar');
    const title = document.getElementById('noteTitleInput');
    return { overflow: m.scrollWidth - m.clientWidth, tb: !!tb && tb.offsetWidth > 0, title: title.offsetWidth > 0 };
  });
  check('P04-27/28 mobile: no overflow, toolbar+title usable, touch', mob.overflow <= 1 && mob.tb && mob.title, JSON.stringify(mob));
  // mobile checklist toggle via touch click
  await page.evaluate(() => { const boxes = document.querySelectorAll('#noteBodyInput li.note-check-item'); boxes[1]?.querySelector('.note-check-box')?.click(); });
  await sleep(300);
  check('P04-28b mobile checklist toggle works', await page.evaluate(() => document.querySelectorAll('#noteBodyInput li.note-check-item.checked').length >= 2));
  await closeEditor();

  // ---- RTL Arabic ----
  await page.setViewport({ width: 1366, height: 850 });
  await page.evaluate((k) => localStorage.setItem(k, 'ar'), LANG_KEY);
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  await openNote('Plain Note');
  const rtl = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir'),
    checklist: !!document.querySelector('#noteBodyInput ul.note-checklist'),
    overflow: document.getElementById('fullScreenNoteModal').scrollWidth - document.getElementById('fullScreenNoteModal').clientWidth
  }));
  check('P04-29 Arabic RTL editor renders checklist, no overflow', rtl.dir === 'rtl' && rtl.checklist && rtl.overflow <= 1, JSON.stringify(rtl));
  await closeEditor();

  const realErrors = consoleErrors.filter((e) => !e.toLowerCase().includes('favicon') && !/attribute d: Expected number/.test(e));
  check('P04-32 no JS console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  fs.writeFileSync(path.join(HERE, 'n04_editor_check.result.txt'), results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name}`).join('\n') + `\nTOTAL ${results.filter(r => r.ok).length}/${results.length}\n`);
  console.log(`\nP04 RESULT: ${results.filter(r => r.ok).length}/${results.length} passed`);
} catch (e) {
  console.error('HARNESS ERROR:', e.message);
  try { fs.appendFileSync(LOG, 'HARNESS ERROR: ' + e.message + '\n'); } catch (_) {}
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}



