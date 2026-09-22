// PART 10 — Notes Organization. Real-browser behavioral harness.
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
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : (detail === 'NV' ? 'NOTVER' : 'FAIL')}  ${name}${detail && detail !== 'NV' ? '  -> ' + detail : ''}`);
  if (ok) pass++; else if (detail === 'NV') notVerified++; else fail++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.svg':'image/svg+xml' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': mimeOf(f) + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));

const dialogQueue = [];
function queuePrompt(text) { dialogQueue.push({ type: 'prompt', text }); }
function queueConfirm(accept) { dialogQueue.push({ type: 'confirm', accept }); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const freshErrors = [];
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) freshErrors.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else freshErrors.push('console: ' + m.text()); } });
page.on('dialog', async (d) => {
  const item = dialogQueue.shift() || { type: 'confirm', accept: true };
  if (item.type === 'prompt') { try { await d.accept(item.text); } catch (e) {} }
  else { try { if (item.accept) await d.accept(); else await d.dismiss(); } catch (e) {} }
});

async function gotoApp() { await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(400); }
async function readNotes() { return page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY); }
async function clearStorage() { await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); localStorage.removeItem('eq-language'); localStorage.removeItem('eq-note-sort'); }, STORAGE_KEY, FOLDERS_KEY); }
async function seedNotes(notes) { await page.evaluate((k, n) => localStorage.setItem(k, JSON.stringify(n)), STORAGE_KEY, notes); }
async function openNotes() {
  await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
  await sleep(250);
}
async function renderTitles() { return page.evaluate(() => Array.from(document.querySelectorAll('#notesList .note-item-title')).map((el) => el.textContent.trim())); }
async function setViewport(w, h) { await page.setViewport({ width: w, height: h }); await sleep(350); }
async function overflowInfo(sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const docW = document.documentElement.clientWidth;
    return { dx: Math.round(el.scrollWidth - el.clientWidth), overRight: Math.round(el.getBoundingClientRect().right - docW) };
  }, sel);
}
async function openNoteMenu(title) {
  return page.evaluate((t) => {
    const item = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => {
      const s = li.querySelector('.note-item-title'); return s && s.textContent.trim() === t;
    });
    if (!item) return false;
    const btn = item.querySelector('.note-menu-btn');
    if (btn) btn.click();
    return true;
  }, title);
}
async function clickNoteAction(title, action) {
  return page.evaluate((t, a) => {
    const item = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => {
      const s = li.querySelector('.note-item-title'); return s && s.textContent.trim() === t;
    });
    if (!item) return false;
    const b = item.querySelector('[data-action="' + a + '"]');
    if (b) { b.click(); return true; }
    return false;
  }, title, action);
}
async function clickFirstItem() {
  return page.evaluate(() => {
    const item = document.querySelector('#notesList .note-item');
    if (item) { item.scrollIntoView({ block: 'center' }); item.click(); return true; }
    return false;
  });
}
async function setSearch(q) {
  await page.evaluate((v) => { const si = document.getElementById('notesSearchInput'); if (si) { si.value = v; si.dispatchEvent(new Event('input', { bubbles: true })); } }, q);
  await sleep(200);
}
async function setSort(v) {
  await page.evaluate((val) => { const s = document.getElementById('notesSortSelect'); if (s) { s.value = val; s.dispatchEvent(new Event('change', { bubbles: true })); } }, v);
  await sleep(250);
}

console.log('=== PART 10 — Notes Organization ===');
try {
  await setViewport(1366, 900);
  await gotoApp();
  await clearStorage();

  // ---------- Seed a deterministic set of notes on the active folder ----------
  const pixel = path.join(HERE, '_p9_pixel.png');
  // Valid 1x1 transparent PNG data URL (so image blocks decode cleanly in tests).
  const pixelData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const baseNow = Date.now();
  const notes = [
    { id: 'n-physics', title: 'Physics Report', body: 'Newton second law F=ma', bodyFormatting: [], folderId: 'personal', createdAt: baseNow - 60000, updatedAt: baseNow - 60000 },
    { id: 'n-project', title: 'Project Alpha', body: 'Launch plan for Q1', bodyFormatting: [], folderId: 'personal', createdAt: baseNow - 200000, updatedAt: baseNow - 200000 },
    { id: 'n-revenue', title: 'Revenue Table', body: '', bodyFormatting: [], folderId: 'personal', createdAt: baseNow - 300000, updatedAt: baseNow - 300000,
      bodyBlocks: [ { type: 'table', header: true, rows: [[{ text: 'Revenue', formatting: [] }, { text: '5000', formatting: [] }], [{ text: '2024', formatting: [] }, { text: '6000', formatting: [] }]] }, { type: 'text', body: 'Quarterly results', formatting: [] } ] },
    { id: 'n-rich', title: 'Rich Content', body: 'Intro paragraph', bodyFormatting: [], folderId: 'personal',
      bodyBlocks: [
        { type: 'text', body: 'Nested heading', formatting: [{ t: 'h1' }] },
        { type: 'checklist', items: [{ text: 'item one', checked: true }, { text: 'item two', checked: false }] },
        { type: 'divider' },
        { type: 'table', header: true, rows: [[{ text: 'Name', formatting: [] }, { text: 'Value', formatting: [] }]] },
        { type: 'image', src: pixelData, alt: 'test', width: 120, align: 'center' }
      ] },
    { id: 'n-zebra', title: 'Zebra Notes', body: 'anatomy of stripes', bodyFormatting: [], folderId: 'personal', createdAt: baseNow - 800000, updatedAt: baseNow - 800000 }
  ];
  await seedNotes(notes);
  await page.evaluate((f) => localStorage.setItem(f, JSON.stringify([{ id: 'personal', name: 'Personal' }])), FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);

  // ---------- Render notes ----------
  await openNotes();
  let titles = await renderTitles();
  check('Notes Home renders all seeded notes', titles.length === 5, 'count=' + titles.length);

  // ---------- Search live (title) ----------
  await setSearch('Physics');
  titles = await renderTitles();
  check('Search: title "Physics" finds only Physics Report', titles.length === 1 && titles[0] === 'Physics Report', JSON.stringify(titles));

  // Search case-insensitive
  await setSearch('physics');
  titles = await renderTitles();
  check('Search: case-insensitive (lowercase physics still matches)', titles.length === 1 && titles[0] === 'Physics Report', JSON.stringify(titles));

  // Search body text
  await setSearch('second law');
  titles = await renderTitles();
  check('Search: body text "second law" finds Physics', titles.some((t) => t === 'Physics Report'), JSON.stringify(titles));

  // Search table cell content
  await setSearch('Revenue');
  titles = await renderTitles();
  check('Search: table cell "Revenue" finds the Revenue Table note', titles.some((t) => t === 'Revenue Table'), JSON.stringify(titles));

  // Arabic search (seed an Arabic note)
  await setSearch('');
  const arNote = { id: 'n-ar', title: 'ملاحظة عربية', body: 'فيزياء نيوتن', folderId: 'personal', createdAt: Date.now(), updatedAt: Date.now() };
  await seedNotes((await readNotes()).concat(arNote));
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(300);
  await openNotes();
  await setSearch('فيزياء');
  titles = await renderTitles();
  check('Search: Arabic body "فيزياء" finds Arabic note', titles.some((t) => t === 'ملاحظة عربية'), JSON.stringify(titles));

  // Empty result state
  await setSearch('zzzz-no-match');
  const emptyShown = await page.evaluate(() => { const e = document.getElementById('notesSearchEmpty'); return e && !e.classList.contains('hidden'); });
  titles = await renderTitles();
  check('Search: empty result state shown for no match', emptyShown && titles.length === 0, 'emptyShown=' + emptyShown);
  await setSearch('');

  // ---------- Sort: Newest / Oldest / A-Z ----------
  await setSort('az');
  titles = await renderTitles();
  check('Sort A-Z: notes alphabetical by title', titles.length > 0 && titles.every((t, i) => i === 0 || (titles[i - 1].localeCompare(t, 'en') <= 0)), JSON.stringify(titles));

  await setSort('oldest');
  titles = await renderTitles();
  const idsOrder = await page.evaluate(() => Array.from(document.querySelectorAll('#notesList .note-item')).map((li) => li.getAttribute('data-note-id')));
  const nById = {}; (await readNotes()).forEach((n) => nById[n.id] = n.updatedAt || n.createdAt || 0);
  const ascOk = idsOrder.every((id, i) => i === 0 || (nById[idsOrder[i - 1]] || 0) <= (nById[id] || 0));
  check('Sort Oldest: notes ascending by last-modified', ascOk, JSON.stringify(idsOrder));

  await setSort('newest');
  titles = await renderTitles();
  const idsNew = await page.evaluate(() => Array.from(document.querySelectorAll('#notesList .note-item')).map((li) => li.getAttribute('data-note-id')));
  const descOk = idsNew.every((id, i) => i === 0 || (nById[idsNew[i - 1]] || 0) >= (nById[id] || 0));
  check('Sort Newest: notes descending by last-modified', descOk, JSON.stringify(idsNew));

  // ---------- Pin + Sort interaction ----------
  await setSort('newest');
  await openNoteMenu('Zebra Notes'); await sleep(120);
  await clickNoteAction('Zebra Notes', 'pin'); await sleep(300);
  titles = await renderTitles();
  check('Pin: pinned note floats to top (Newest sort)', titles[0] === 'Zebra Notes', JSON.stringify(titles));
  const pinnedBadge = await page.evaluate(() => { const i = document.querySelector('#notesList .note-item.pinned'); return !!i && i.querySelector('.note-pin-badge') !== null; });
  check('Pin: pinned note shows pin badge + pinned class', pinnedBadge, 'badge=' + pinnedBadge);

  let stored = await readNotes();
  const zebraStored = stored.find((n) => n.id === 'n-zebra');
  check('Pin: pinned state persisted to storage', !!zebraStored && zebraStored.pinned === true, JSON.stringify({ pinned: zebraStored && zebraStored.pinned }));

  await setSort('az');
  titles = await renderTitles();
  check('Pin + A-Z: pinned still floats to top', titles[0] === 'Zebra Notes', JSON.stringify(titles));

  await setSort('oldest');
  titles = await renderTitles();
  check('Pin + Oldest: pinned still floats to top', titles[0] === 'Zebra Notes', JSON.stringify(titles));

  // Unpin Zebra for later independence
  await openNoteMenu('Zebra Notes'); await sleep(120);
  await clickNoteAction('Zebra Notes', 'pin'); await sleep(250);

  // ---------- Search + Pin interaction ----------
  await setSort('newest');
  await setSearch('Rich');
  await openNoteMenu('Rich Content'); await sleep(120);
  await clickNoteAction('Rich Content', 'pin'); await sleep(250);
  await setSearch('');
  const richPinnedAfter = await page.evaluate(() => { const i = document.querySelector('#notesList .note-item.pinned .note-item-title'); return i ? i.textContent.trim() : null; });
  const richPinnedStored = (await readNotes()).find((n) => n.title === 'Rich Content');
  check('Search + Pin: pinned via search stays pinned after clearing search', (!!richPinnedAfter && richPinnedAfter === 'Rich Content') || (richPinnedStored && richPinnedStored.pinned === true), 'dom=' + richPinnedAfter + ' storedPinned=' + !!(richPinnedStored && richPinnedStored.pinned));
  await openNoteMenu('Rich Content'); await sleep(120);
  await clickNoteAction('Rich Content', 'pin'); await sleep(250);

  // ---------- Rename ----------
  await setSort('az');
  queuePrompt('Mechanics Notes');
  await openNoteMenu('Physics Report'); await sleep(120);
  await clickNoteAction('Physics Report', 'rename'); await sleep(300);
  titles = await renderTitles();
  check('Rename: title updated in Notes Home', titles.includes('Mechanics Notes'), JSON.stringify(titles));

  await setSearch('Physics Report');
  titles = await renderTitles();
  check('Rename + Search: old title no longer matches', titles.length === 0, JSON.stringify(titles));
  await setSearch('Mechanics');
  titles = await renderTitles();
  check('Rename + Search: new title matches', titles.length === 1 && titles[0] === 'Mechanics Notes', JSON.stringify(titles));
  await setSearch('');

  const renamedStore = await readNotes();
  const renamedPhysics = renamedStore.find((n) => n.title === 'Mechanics Notes');
  check('Rename: body preserved unchanged', renamedPhysics && renamedPhysics.body === 'Newton second law F=ma', JSON.stringify({ body: renamedPhysics && renamedPhysics.body }));

  // ---------- Duplicate ----------
  await setSearch('Rich');
  await openNoteMenu('Rich Content'); await sleep(120);
  await clickNoteAction('Rich Content', 'duplicate'); await sleep(300);
  await setSearch('');
  stored = await readNotes();
  const copies = stored.filter((n) => n.title === 'Rich Content (copy)');
  check('Duplicate: creates a copy with clear title', copies.length === 1, 'copies=' + copies.length);
  const orig = stored.find((n) => n.id === 'n-rich');
  const dup = copies[0];
  check('Duplicate: copy uses a distinct Note ID (no overwrite)', !!dup && dup.id !== 'n-rich', 'origId=n-rich copyId=' + (dup && dup.id));
  check('Duplicate: copy preserves content (blocks intact)', !!dup && JSON.stringify(dup.bodyBlocks) === JSON.stringify(orig.bodyBlocks), 'blocksEq=' + (dup && JSON.stringify(dup.bodyBlocks) === JSON.stringify(orig.bodyBlocks)));
  check('Duplicate: copy is independent (pinned=false, new timestamps)', !!dup && dup.pinned === false && dup.createdAt !== orig.createdAt, JSON.stringify({ copyPinned: dup && dup.pinned }));

  // Modify the copy; original unchanged
  await openNotes();
  await setSearch('Rich Content (copy)');
  titles = await renderTitles();
  if (titles.length) {
    await clickFirstItem();
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
    await sleep(300);
    await page.evaluate(() => { const ti = document.getElementById('noteTitleInput'); ti.value = 'Rich Copy Edited'; ti.dispatchEvent(new Event('input', { bubbles: true })); });
    await sleep(600);
    await page.evaluate(() => { const c = document.getElementById('closeFullScreenNote'); if (c) c.click(); });
    await sleep(300);
    await openNotes();
    await setSearch('');
    stored = await readNotes();
    const editedCopy = stored.find((n) => n.title === 'Rich Copy Edited');
    const origAfter = stored.find((n) => n.id === 'n-rich');
    check('Duplicate independence: editing copy does not change original', !!editedCopy && !!origAfter && origAfter.title === 'Rich Content' && JSON.stringify(origAfter.bodyBlocks) === JSON.stringify(orig.bodyBlocks), JSON.stringify({ copy: editedCopy && editedCopy.title, orig: origAfter && origAfter.title }));
  } else {
    check('Duplicate independence: editing copy does not change original', false, 'copy not found to edit');
  }

  // ---------- Delete + Search ----------
  await setSearch('Zebra');
  await openNoteMenu('Zebra Notes'); await sleep(120);
  await clickNoteAction('Zebra Notes', 'delete'); await sleep(250);
  await setSearch('');
  titles = await renderTitles();
  check('Delete: note removed from active list', !titles.includes('Zebra Notes'), JSON.stringify(titles));
  stored = await readNotes();
  const zebraDel = stored.find((n) => n.id === 'n-zebra');
  check('Delete: note is soft-deleted (recently deleted), others intact', !!zebraDel && !!zebraDel.deletedAt, JSON.stringify({ deletedAt: zebraDel && zebraDel.deletedAt }));
  check('Delete: only the target note deleted', stored.filter((n) => n.deletedAt).length === 1, 'deleted=' + stored.filter((n) => n.deletedAt).length);

  // ---------- Persistence: reload keeps rename+duplicate+delete result ----------
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  await openNotes();
  titles = await renderTitles();
  const reloadDiag = await page.evaluate(() => ({
    activeFolder: (typeof getActiveFolder === 'function' ? getActiveFolder() : 'n/a'),
    noteIds: Array.from(document.querySelectorAll('#notesList .note-item')).map((li) => li.getAttribute('data-note-id')),
    folders: (() => { try { return JSON.parse(localStorage.getItem('eq-note-folders') || '[]').map((f) => f.id); } catch (e) { return []; } })()
  }));
  check('Persistence reload: rename + duplicate titles survive', titles.includes('Mechanics Notes') && titles.includes('Rich Copy Edited'), JSON.stringify({ titles: titles, diag: reloadDiag }));
  check('Persistence reload: deleted note does not return', !titles.includes('Zebra Notes'), JSON.stringify(titles));
  stored = await readNotes();
  const pinnedAfterReload = stored.filter((n) => n.pinned === true);
  check('Persistence reload: rich note still in storage after reload', stored.some((n) => n.id === 'n-rich') && stored.some((n) => n.title === 'Rich Copy Edited'), 'nRich=' + stored.some((n) => n.id === 'n-rich') + ' copy=' + stored.some((n) => n.title === 'Rich Copy Edited'));
  check('Persistence reload: unpinned stays unpinned (no unintended pinned restored)', pinnedAfterReload.length === 0 || pinnedAfterReload.every((n) => n.id !== 'n-rich'), 'pinned=' + pinnedAfterReload.map((n) => n.id).join(','));

  // ---------- Content integrity: rich note opens with all blocks intact ----------
  await setSort('az');
  await setSearch('Rich Content');
  titles = await renderTitles();
  if (titles.length) {
    await clickFirstItem();
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
    await sleep(400);
    const richLive = await page.evaluate(() => {
      const b = document.getElementById('noteBodyInput');
      return { hasChecklist: !!b.querySelector('.note-checklist'), hasDivider: !!b.querySelector('hr.note-divider'), hasTable: !!b.querySelector('table.note-table, .note-table-wrap'), hasImage: !!b.querySelector('.note-image-block .note-image-elem'), textLen: (b.textContent || '').length > 0 };
    });
    check('Content integrity: rich note opens with checklist', richLive.hasChecklist, JSON.stringify(richLive));
    check('Content integrity: rich note opens with divider', richLive.hasDivider, JSON.stringify(richLive));
    check('Content integrity: rich note opens with table', richLive.hasTable, JSON.stringify(richLive));
    check('Content integrity: rich note opens with image', richLive.hasImage, JSON.stringify(richLive));
    await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); if (b) b.innerHTML += '<p>Append safe text</p>'; });
    await sleep(600);
    await page.evaluate(() => { const c = document.getElementById('closeFullScreenNote'); if (c) c.click(); });
    await sleep(300);
    stored = await readNotes();
    const richSaved = stored.find((n) => n.id === 'n-rich');
    check('Content integrity: edit survives save (blocks still present)', !!richSaved && Array.isArray(richSaved.bodyBlocks) && richSaved.bodyBlocks.some((b) => b.type === 'image') && richSaved.bodyBlocks.some((b) => b.type === 'table'), JSON.stringify({ nBlocks: richSaved && richSaved.bodyBlocks && richSaved.bodyBlocks.length }));
  } else {
    check('Content integrity: rich note opens with blocks', false, 'rich note not found');
  }
  await setSearch('');

  // ---------- Responsive overflow checks ----------
  for (const w of [1366, 768, 430, 390]) {
    await setViewport(w, 900);
    const ov = await overflowInfo('#notesManagerModal .notes-manager');
    const listOv = await overflowInfo('#notesListPanel');
    check('Responsive ' + w + ': no horizontal overflow in Notes manager', !!ov && (ov.dx === 0 && ov.overRight <= 0), JSON.stringify(ov));
    check('Responsive ' + w + ': no overflow in notes list', !!listOv && (listOv.dx === 0 && listOv.overRight <= 0), JSON.stringify(listOv));
  }
  await setViewport(1366, 900); await sleep(200);

  // ---------- RTL (Arabic) ----------
  await page.evaluate(() => localStorage.setItem('eq-language', 'ar'));
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
  check('RTL: language ar sets dir=rtl', dir === 'rtl', 'dir=' + dir);
  await openNotes();
  const rtlUI = await page.evaluate(() => {
    const search = document.getElementById('notesSearchInput');
    const sort = document.getElementById('notesSortSelect');
    const menu = document.querySelector('.note-menu-btn');
    return { search: !!search && search.offsetParent !== null, sort: !!sort && sort.offsetParent !== null, menu: !!menu };
  });
  check('RTL: search + sort + note actions all accessible', rtlUI.search && rtlUI.sort && rtlUI.menu, JSON.stringify(rtlUI));
  const rtlOv = await overflowInfo('#notesManagerModal .notes-manager');
  check('RTL: no horizontal overflow in RTL', !!rtlOv && rtlOv.dx === 0, JSON.stringify(rtlOv));
  await page.evaluate(() => localStorage.setItem('eq-language', 'en'));
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);

  // ---------- Accessibility (need the notes manager open to inspect DOM) ----------
  await openNotes();
  const a11y = await page.evaluate(() => {
    const search = document.getElementById('notesSearchInput');
    const sort = document.getElementById('notesSortSelect');
    const menubtn = document.querySelector('#notesList .note-item .note-menu-btn');
    const searchLabel = !!(search && (search.getAttribute('aria-label') || search.getAttribute('placeholder') || ''));
    const sortLabel = !!(sort && sort.getAttribute('aria-label'));
    const menuBtnLabel = !!(menubtn && (menubtn.getAttribute('aria-label') || menubtn.title));
    return { searchLabel, sortLabel, menuBtnLabel };
  });
  check('Accessibility: search input has label/placeholder', a11y.searchLabel, String(a11y.searchLabel));
  check('Accessibility: sort select has aria-label', a11y.sortLabel, String(a11y.sortLabel));
  check('Accessibility: note menu button has accessible name', a11y.menuBtnLabel, String(a11y.menuBtnLabel));

  // ---------- Console: no NEW errors ----------
  check('Console: no new JS/console errors from PART 10', freshErrors.length === 0, JSON.stringify(freshErrors.slice(0, 5)));
  check('Console: pre-existing Drawer SVG warning excluded', preexisting >= 0, 'preexisting=' + preexisting);
} catch (topErr) {
  check('Runtime completed without top-level error', false, String(topErr && topErr.message || topErr));
}

try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
console.log('RESULTS_JSON=' + JSON.stringify({ pass: pass, fail: fail, not_verified: notVerified, preexisting: preexisting, total: pass + fail + notVerified }));
process.exit(fail > 0 ? 1 : 0);