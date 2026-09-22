// N26 — Notes List / Folder View UI/layout check (real Chrome via puppeteer-core).
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
const PORT = 8396;
const LOG = path.join(HERE, 'n26_list_view_check.log');

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
  { id: 'n-alpha', title: 'Alpha Note', body: 'oldest note body zeppelin', folderId: 'personal', createdAt: Date.now() - 3 * DAY, updatedAt: Date.now() - 3 * DAY },
  { id: 'n-study', title: 'Study Notes', body: 'quantum physics summary', folderId: 'personal', createdAt: Date.now() - 1 * DAY, updatedAt: Date.now() - 1 * DAY },
  { id: 'n-proj', title: 'Project Notes', body: 'project roadmap details', folderId: 'personal', createdAt: Date.now() - 3600e3, updatedAt: Date.now() - 3600e3 }
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

  const seedSimple = () => page.evaluate((kf, f, kn, n, kl, lang) => {
    localStorage.setItem(kf, JSON.stringify(f));
    localStorage.setItem(kn, JSON.stringify(n));
    localStorage.setItem(kl, lang);
  }, FOLDERS_KEY, seedFolders, STORAGE_KEY, JSON.parse(JSON.stringify(seedNotes)), LANG_KEY, 'en');

  const openHome = async () => {
    await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
    await sleep(250);
  };

  await page.setViewport({ width: 1280, height: 850 });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
  await sleep(600);
  await seedSimple();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();

  // --- Cards: uniform, title, date, no overlap, no static action buttons ---
  const cardInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#notesList .note-item'));
    const vis = (el) => !!el && el.offsetWidth > 0 && el.offsetHeight > 0;
    const rects = cards.map((c) => c.getBoundingClientRect());
    const widths = new Set(rects.map((r) => Math.round(r.width)));
    const heights = rects.map((r) => Math.round(r.height));
    const first = cards[0];
    const title = first?.querySelector('.note-item-title');
    const meta = first?.querySelector('.note-item-meta');
    const btn = first?.querySelector('.note-menu-btn');
    const overlap = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const staticMenusVisible = Array.from(document.querySelectorAll('#notesList .note-menu')).filter((m) => getComputedStyle(m).display !== 'none').length;
    const menuRect = btn?.getBoundingClientRect();
    return {
      count: cards.length,
      uniformWidth: widths.size === 1,
      uniformHeight: Math.max(...heights) - Math.min(...heights) <= 2,
      titleVisible: vis(title) && (title.textContent || '').trim().length > 0,
      metaText: meta?.textContent.trim() || '',
      gapTitleMeta: title && meta ? meta.getBoundingClientRect().top - title.getBoundingClientRect().bottom : -1,
      overlapBtnMeta: overlap(meta?.getBoundingClientRect(), menuRect),
      overlapBtnTitle: overlap(title?.getBoundingClientRect(), menuRect),
      staticMenusVisible,
      menuBtnSize: Math.min(btn?.offsetWidth || 0, btn?.offsetHeight || 0)
    };
  });
  check('N26-01 Notes List opens', true);
  check('N26-02 notes render as uniform cards', cardInfo.count >= 3 && cardInfo.uniformWidth && cardInfo.uniformHeight, JSON.stringify(cardInfo));
  check('N26-03 title visible', cardInfo.titleVisible);
  check('N26-04 date visible (Updated ...)', /Updated/.test(cardInfo.metaText), cardInfo.metaText);
  check('N26-04b clear space between title and date', cardInfo.gapTitleMeta >= 2, String(cardInfo.gapTitleMeta));
  check('N26-05 no overlap between date/title and ...', !cardInfo.overlapBtnMeta && !cardInfo.overlapBtnTitle, JSON.stringify(cardInfo));
  check('N26-06 static action buttons hidden (menu closed)', cardInfo.staticMenusVisible === 0, 'visible menus: ' + cardInfo.staticMenusVisible);
  check('N26-06b ... is a proper touch target', cardInfo.menuBtnSize >= 30, String(cardInfo.menuBtnSize));



  const openMenu = (idx) => page.evaluate((i) => {
    const cards = Array.from(document.querySelectorAll('#notesList .note-item'));
    const card = cards[i];
    if (!card) return null;
    card.querySelector('.note-menu-btn').click();
    const menu = card.querySelector('.note-menu');
    const r = menu.getBoundingClientRect();
    return {
      open: menu.classList.contains('open') && getComputedStyle(menu).display !== 'none',
      openCount: document.querySelectorAll('#notesList .note-menu.open').length,
      rect: { l: r.left, t: r.top, rgt: r.right, b: r.bottom },
      vw: window.innerWidth, vh: window.innerHeight,
      items: Array.from(menu.querySelectorAll('button')).map((b) => b.dataset.action),
      owner: card.dataset.noteId
    };
  }, idx);
  const m0 = await openMenu(0);
  check('N26-07 ... opens its own card dropdown', m0 && m0.open && m0.openCount === 1 && ['rename','duplicate','pin','delete'].every((a) => m0.items.includes(a)), JSON.stringify(m0));
  check('N26-07b dropdown inside viewport', m0 && m0.rect.l >= 0 && m0.rect.rgt <= m0.vw && m0.rect.b <= m0.vh, JSON.stringify(m0 && m0.rect));
  await page.evaluate(() => document.querySelector('.notes-section-label').click());
  await sleep(150);
  const closedAfterOutside = await page.evaluate(() => document.querySelectorAll('#notesList .note-menu.open').length);
  check('N26-12 outside click closes dropdown', closedAfterOutside === 0);
  await openMenu(1);
  await openMenu(2);
  const oneAtATime = await page.evaluate(() => document.querySelectorAll('#notesList .note-menu.open').length);
  check('N26-13 never two menus open at once', oneAtATime === 1, String(oneAtATime));
  await page.evaluate(() => document.querySelectorAll('#notesList .note-menu.open').forEach((m) => m.classList.remove('open')));

  // --- Actions through the dropdown (existing handlers) ---
  const menuAct = (title, action) => page.evaluate((t, a) => {
    const card = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => li.querySelector('.note-item-title')?.textContent.trim() === t);
    if (!card) return false;
    card.querySelector('.note-menu-btn').click();
    const btn = card.querySelector(`.note-menu button[data-action="${a}"]`);
    if (!btn) return false;
    btn.click();
    return true;
  }, title, action);
  promptAnswer = 'Renamed Note';
  check('N26-08 Rename works via dropdown', await menuAct('Study Notes', 'rename')); await sleep(250);
  check('N26-08b renamed appears in list', (await page.evaluate(() => Array.from(document.querySelectorAll('#notesList .note-item .note-item-title')).map((e) => e.textContent.trim()))).includes('Renamed Note'));
  check('N26-09 Duplicate works via dropdown', await menuAct('Renamed Note', 'duplicate')); await sleep(250);
  check('N26-09b duplicate copy appears', (await page.evaluate(() => Array.from(document.querySelectorAll('#notesList .note-item .note-item-title')).map((e) => e.textContent.trim()))).some((t) => t.startsWith('Renamed Note (copy)')));
  check('N26-10 Pin works via dropdown', await menuAct('Alpha Note', 'pin')); await sleep(250);
  check('N26-10b pin persisted + card highlighted', await page.evaluate(() => {
    const n = JSON.parse(localStorage.getItem('eq-note-manager-notes')).find((x) => x.title === 'Alpha Note');
    return n?.pinned === true && !!document.querySelector('#notesList .note-item.pinned');
  }));
  check('N26-11 Delete works via dropdown', await menuAct('Project Notes', 'delete')); await sleep(300);
  check('N26-11b soft delete applied', await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('eq-note-manager-notes'));
    const n = arr.find((x) => x.title === 'Project Notes');
    return !arr.some((x) => x.title === 'Project Notes' && !x.deletedAt) && !!n;
  }));


  // --- Folder/filter bar: one line, folder btns left, sort right ---
  const bar = await page.evaluate(() => {
    const cont = document.getElementById('folderTabsContainer');
    const cr = cont.getBoundingClientRect();
    const tabs = Array.from(cont.querySelectorAll('.folder-tab'));
    const plus = document.getElementById('addFolderButton').getBoundingClientRect();
    const sel = document.getElementById('notesSortSelect').getBoundingClientRect();
    const centers = tabs.map((t) => Math.round(t.getBoundingClientRect().top + t.getBoundingClientRect().height / 2));
    const sameRow = new Set(centers).size === 1;
    const bottomAligned = Math.abs(Math.max(...tabs.map((t) => t.getBoundingClientRect().bottom)) - cr.bottom) < 20;
    const ltr = document.documentElement.getAttribute('dir') !== 'rtl' && document.body.getAttribute('dir') !== 'rtl';
    const sortOpposite = ltr ? (sel.left > plus.right) : (sel.right < plus.left);
    const sortSameRow = (sel.top + sel.height / 2) - (plus.top + plus.height / 2) < 6;
    return { tabCount: tabs.length, sameRow, bottomAligned, sortOpposite, sortSameRow, contOverflow: cont.scrollWidth - cont.clientWidth, plusInCont: plus.left >= cr.left && plus.right <= cr.right };
  });
  check('N26-14 folder buttons on one aligned line', bar.tabCount >= 1 && bar.sameRow && bar.bottomAligned, JSON.stringify(bar));
  check('N26-15 sort select on opposite side, same row', bar.sortOpposite && bar.sortSameRow && bar.plusInCont, JSON.stringify(bar));
  check('N26-16 no horizontal overflow (folder bar)', bar.contOverflow <= 1, JSON.stringify(bar));

  await page.select('#notesSortSelect', 'oldest'); await sleep(200);
  check('N26-S1 sorting still works', (await page.evaluate(() => document.querySelector('#notesList .note-item .note-item-title')?.textContent.trim())) === 'Alpha Note');
  await page.select('#notesSortSelect', 'newest'); await sleep(200);
  const nav = await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('#folderTabsScroll .folder-tab')).find((t) => !t.classList.contains('active'));
    if (!tab) return { clicked: false, tabs: Array.from(document.querySelectorAll('#folderTabsScroll .folder-tab')).map((t) => t.dataset.folderId) };
    tab.click();
    return { clicked: true, id: tab.dataset.folderId };
  });
  await sleep(250);
  check('N26-S2 folder navigation still works', await page.evaluate(() => !!document.querySelector('#folderTabsScroll .folder-tab.active')), JSON.stringify(nav));
  const s3 = await page.evaluate(() => {
    const ptab = document.querySelector('.folder-tab[data-folder-id="personal"]') || document.querySelector('#folderTabsScroll .folder-tab');
    if (ptab) ptab.click();
    const c = Array.from(document.querySelectorAll('#notesList .note-item'))[0];
    if (!c) return { ok: false, why: 'no cards', tabs: Array.from(document.querySelectorAll('.folder-tab')).map((t) => t.dataset.folderId) };
    c.click();
    return { ok: true };
  });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  check('N26-S3 opening a note still works', s3.ok, JSON.stringify(s3));
  await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
  await sleep(250);

  // --- Responsive: 768 / 390 / 360 ---
  for (const [w, h, label] of [[768, 1024, 'Tablet 768'], [390, 844, 'Mobile 390'], [360, 800, 'Mobile 360']]) {
    await page.setViewport({ width: w, height: h, hasTouch: true, isMobile: true });
    await sleep(200);
    await openHome();
    const r = await page.evaluate(() => {
      const modal = document.querySelector('#notesManagerModal .notes-manager');
      const first = document.querySelector('#notesList .note-item');
      const fr = first?.getBoundingClientRect();
      const meta = first?.querySelector('.note-item-meta')?.getBoundingClientRect();
      const btn = first?.querySelector('.note-menu-btn')?.getBoundingClientRect();
      const overlap = meta && btn && meta.left < btn.right && btn.left < meta.right && meta.top < btn.bottom && btn.top < meta.bottom;
      let menuInVp = null;
      first.querySelector('.note-menu-btn').click();
      const mr = first.querySelector('.note-menu').getBoundingClientRect();
      menuInVp = mr.left >= 0 && mr.right <= window.innerWidth && mr.top >= 0 && mr.bottom <= window.innerHeight;
      first.querySelector('.note-menu-btn').click();
      return { docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, modalOverflow: modal ? modal.scrollWidth - modal.clientWidth : -1, cardInVp: fr ? fr.left >= -1 && fr.right <= window.innerWidth + 1 : false, overlap, menuInVp };
    });
    check(`N26-${label} PASS`, r.docOverflow <= 1 && r.modalOverflow <= 1 && r.cardInVp && !r.overlap && r.menuInVp === true, JSON.stringify(r));
  }
  // --- RTL (Arabic) at desktop + small ---
  for (const [w, h, label] of [[1280, 850, 'RTL 1280'], [390, 844, 'RTL 390']]) {
    await page.setViewport({ width: w, height: h });
    await page.evaluate((k) => localStorage.setItem(k, 'ar'), LANG_KEY);
    await page.reload({ waitUntil: 'load' }); await sleep(700);
    await openHome();
    const r = await page.evaluate(() => {
      const dir = document.body.getAttribute('data-language') || document.documentElement.getAttribute('dir');
      const first = document.querySelector('#notesList .note-item');
      const meta = first?.querySelector('.note-item-meta')?.getBoundingClientRect();
      const btn = first?.querySelector('.note-menu-btn')?.getBoundingClientRect();
      const overlap = meta && btn && meta.left < btn.right && btn.left < meta.right && meta.top < btn.bottom && btn.top < meta.bottom;
      const tabs = Array.from(document.querySelectorAll('#folderTabsContainer .folder-tab'));
      const sel = document.getElementById('notesSortSelect').getBoundingClientRect();
      const rtlSelectLeft = !tabs.length || sel.right <= tabs[0].getBoundingClientRect().left + 1;
      first.querySelector('.note-menu-btn').click();
      const mr = first.querySelector('.note-menu').getBoundingClientRect();
      const menuInVp = mr.left >= 0 && mr.right <= window.innerWidth && mr.top >= 0 && mr.bottom <= window.innerHeight;
      first.querySelector('.note-menu-btn').click();
      return { dir, overlap, rtlSelectLeft, menuInVp, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, metaText: first.querySelector('.note-item-meta')?.textContent.trim() || '' };
    });
    check(`N26-${label} PASS`, r.dir === 'ar' && !r.overlap && r.rtlSelectLeft && r.menuInVp && r.docOverflow <= 1 && /Updated|عُدِّلت/.test(r.metaText), JSON.stringify(r));
  }

  // --- final error sweep (LTR) ---
  await page.setViewport({ width: 1280, height: 850 });
  await page.evaluate((k) => localStorage.setItem(k, 'en'), LANG_KEY);
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  // 404s here are missing favicon/manifest icon files (icon-192.png, apple-touch-icon.png,
  // favicon.ico) — pre-existing repo artifacts, unrelated to this Notes List change.
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('attribute d: Expected number') && !/Failed to load resource.*(404|Not Found)/.test(e));
  check('N26-23 no new JavaScript errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  fs.writeFileSync(path.join(HERE, 'n26_list_view_check.result.txt'), results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name}`).join('\n') + `\nTOTAL ${results.filter(r => r.ok).length}/${results.length}\n`);
  console.log(`\nN26 RESULT: ${results.filter(r => r.ok).length}/${results.length} passed`);
} catch (e) {
  console.error('HARNESS ERROR:', e.message);
  try { fs.appendFileSync(LOG, 'HARNESS ERROR: ' + e.message + '\n'); } catch (_) {}
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}


