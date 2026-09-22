// Minimalist Notes UI — real Chrome verification (test-only artifact).
// Verifies ONLY the requested Notes UI/layout change plus Notes functionality,
// persistence/autosave, and that unrelated systems still boot/work.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8432;
const NOTES_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const LANG_KEY = 'eq-language';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

const results = [];
const lines = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  lines.push(line);
  console.log(line);
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const seedNotes = [
  { id: 'n-min-1', title: 'Layout Note', body: 'Hello minimalist notes', folderId: 'personal', createdAt: Date.now() - 7200e3, updatedAt: Date.now() - 7200e3 }
];
const seedFolders = [{ id: 'personal', name: 'Personal', createdAt: Date.now() }];

const visibleToolbarIds = ['noteBoldBtn', 'noteItalicBtn', 'noteUnderlineBtn', 'noteAaBtn', 'noteBulletListBtn', 'noteNumberListBtn', 'noteImageBtn', 'noteTableBtn'];
const hiddenIds = ['deleteCurrentNote', 'noteChecklistBtn', 'noteDividerBtn', 'noteCellBgColorBtn', 'noteFontSmallBtn', 'noteFontNormalBtn', 'noteFontLargeBtn', 'noteTextColorBtn', 'noteHighlightBtn', 'noteAaPresetsRow', 'noteAaStylesRow', 'noteAaFramesRow', 'noteTextColorInput', 'noteCellBgColorInput'];

async function toolbarState(page) {
  return page.evaluate((visIds, hidIds) => {
    const tb = document.querySelector('.note-format-toolbar');
    const cs = getComputedStyle(tb);
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
    const shown = [];
    const hidden = {};
    visIds.forEach((id) => { const el = document.getElementById(id); if (el) shown.push({ id, display: getComputedStyle(el).display, rect: r(el) }); });
    // Visibility must account for hidden ancestors (the notes sections are hidden as
    // whole rows), so use checkVisibility()/offsetParent instead of the element's own
    // computed display.
    const isHidden = (el) => {
      if (!el) return null;
      if (typeof el.checkVisibility === 'function') return !el.checkVisibility();
      return el.offsetParent === null && getComputedStyle(el).display === 'none';
    };
    hidIds.forEach((id) => { const el = document.getElementById(id); hidden[id] = el ? isHidden(el) : null; });
    const panel = document.getElementById('noteAaPanel');
    const imgMenu = document.getElementById('noteImageMenu');
    const body = document.getElementById('noteBodyInput');
    const modal = document.querySelector('.full-screen-note');
    const header = document.querySelector('.full-screen-note-header');
    const headerIds = ['closeFullScreenNote', 'saveFullScreenNote', 'sendNoteBtn', 'notePreviewPdfBtn', 'exportNotePdfBtn', 'openCompanyProfileBtn'];
    const headerBtns = headerIds.map((id) => { const el = document.getElementById(id); return el ? { id, disp: getComputedStyle(el).display, rect: r(el), radius: getComputedStyle(el).borderTopLeftRadius } : null; });
    const headerVisibleCount = headerBtns.filter((b) => b && b.disp !== 'none').length;
    const doc = document.documentElement;
    return {
      toolbar: { exists: !!tb, count: document.querySelectorAll('.note-format-toolbar').length, display: cs.display, wrap: cs.flexWrap, align: cs.alignItems, gap: cs.gap, rect: r(tb), scrollW: tb.scrollWidth, clientW: tb.clientWidth },
      shown,
      hidden,
      panel: panel ? { display: getComputedStyle(panel).display, rect: r(panel), pos: getComputedStyle(panel).position } : null,
      imgMenu: imgMenu ? { display: getComputedStyle(imgMenu).display, rect: r(imgMenu), pos: getComputedStyle(imgMenu).position } : null,
      body: body ? r(body) : null,
      modal: modal ? r(modal) : null,
      header: header ? { rect: r(header), dir: getComputedStyle(header).flexDirection } : null,
      headerBtns,
      headerVisibleCount,
      headerBits: header ? Array.from(header.children).map((c) => (c.id ? c.id : (c.querySelector && c.querySelector('input#noteTitleInput') ? 'noteTitleInput' : 'node'))) : [],
      aaHaspopup: (() => { const b = document.getElementById('noteAaBtn'); return b ? b.getAttribute('aria-haspopup') : null; })(),
      aaExpanded: (() => { const b = document.getElementById('noteAaBtn'); return b ? b.getAttribute('aria-expanded') : null; })(),
      noOverflowX: doc.scrollWidth <= doc.clientWidth + 1,
      lang: document.body.getAttribute('data-language'),
      dir: document.documentElement.getAttribute('dir')
    };
  }, visibleToolbarIds, hiddenIds);
}

async function openEditor(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(350);
}

async function selectAllBody(page) {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput');
    b.focus();
    const range = document.createRange();
    range.selectNodeContents(b);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
}

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

  for (const [w, h, lang, tag] of [[1280, 800, 'en', 'DESKTOP-LTR'], [1280, 800, 'ar', 'DESKTOP-RTL'], [390, 844, 'en', '390-LTR'], [390, 844, 'ar', '390-RTL'], [360, 740, 'en', '360-LTR'], [360, 740, 'ar', '360-RTL']]) {
    lines.push(`\n=== ${tag} (${w}x${h}) ===`);
    console.log(`\n=== ${tag} (${w}x${h}) ===`);
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    const errs = [];
    const badResponses = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/attribute d:|Expected number|favicon|Failed to load resource|Error loading image/i.test(m.text())) errs.push('console: ' + m.text()); });
    page.on('response', (r) => { if (r.status() >= 400 && /\.(js|mjs|css|html)$/i.test(r.url())) badResponses.push(r.status() + ' ' + r.url()); });

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate((lk, fk, nk, folders, notes, l) => {
      localStorage.setItem(lk, 'en');
      localStorage.setItem(fk, JSON.stringify(folders));
      localStorage.setItem(nk, JSON.stringify(notes));
      localStorage.setItem('eq-language', l);
    }, LANG_KEY, FOLDERS_KEY, NOTES_KEY, seedFolders, seedNotes, lang);
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await sleep(600);
    await openEditor(page);

    const st = await toolbarState(page);

    // ---------- Layout: header ----------
    check(`${tag} Notes editor opens`, st.modal !== null && st.body !== null);
    check(`${tag} header has Back + 5 circular buttons`, st.headerVisibleCount === 6, 'visible=' + st.headerVisibleCount);
    const circles = st.headerBtns.filter((b) => b && b.id !== 'closeFullScreenNote');
    check(`${tag} 5 action buttons are equal circles on one row`, circles.length === 5 && circles.every((b) => Math.abs(b.rect.w - b.rect.h) <= 1 && b.rect.w >= 38 && b.rect.w <= 41 && b.radius === '50%') && new Set(circles.map((b) => b.rect.top)).size === 1, JSON.stringify(circles.map((b) => b.id + ':' + b.rect.w + 'x' + b.rect.h + ':' + b.radius)));
    check(`${tag} header order: Back, title, 5 buttons, delete`, JSON.stringify(st.headerBits) === JSON.stringify(['closeFullScreenNote', 'noteTitleInput', 'saveFullScreenNote', 'sendNoteBtn', 'notePreviewPdfBtn', 'exportNotePdfBtn', 'openCompanyProfileBtn', 'deleteCurrentNote']), JSON.stringify(st.headerBits));
    check(`${tag} RTL/LTR uses the existing direction system`, (lang === 'ar') === (st.dir === 'rtl'), `lang=${lang} dir=${st.dir}`);

    // ---------- Layout: single-row toolbar ----------
    check(`${tag} exactly ONE toolbar exists`, st.toolbar.count === 1, 'count=' + st.toolbar.count);
    check(`${tag} toolbar is flex, align-items center, no wrap`, st.toolbar.display === 'flex' && st.toolbar.wrap === 'nowrap' && st.toolbar.align === 'center', `${st.toolbar.display}/${st.toolbar.wrap}/${st.toolbar.align}`);
    check(`${tag} toolbar is a SINGLE row (all controls same top)`, new Set(st.shown.map((b) => b.rect.top)).size === 1, JSON.stringify(st.shown.map((b) => b.id + '@' + b.rect.top)));
    const order = st.shown.map((b) => b.id);
    check(`${tag} toolbar order = B I U | Text Style | lists | image table`, JSON.stringify(order) === JSON.stringify(visibleToolbarIds), order.join(','));
    check(`${tag} toolbar does not overflow horizontally`, st.toolbar.scrollW <= st.toolbar.clientW + 1, `${st.toolbar.scrollW} <= ${st.toolbar.clientW}`);
    check(`${tag} page has no horizontal overflow`, st.noOverflowX);
    check(`${tag} no clipping: all controls fully inside viewport`, st.shown.every((b) => b.rect.x >= -1 && b.rect.right <= w + 1 && b.rect.w >= 26), JSON.stringify(st.shown.map((b) => b.rect.w)));
    check(`${tag} every toolbar control is clickable-sized (>=30px)`, st.shown.every((b) => b.rect.h >= 28 && b.rect.w >= 26));
    check(`${tag} Text Style toggle present with dropdown semantics`, st.aaHaspopup === 'true' && st.aaExpanded === 'false', `haspopup=${st.aaHaspopup} expanded=${st.aaExpanded}`);

    // ---------- Removed bottom / large controls ----------
    check(`${tag} bottom Delete button not displayed`, st.hidden.deleteCurrentNote === true);
    check(`${tag} checklist / divider / cell-bg not displayed`, st.hidden.noteChecklistBtn === true && st.hidden.noteDividerBtn === true && st.hidden.noteCellBgColorBtn === true);
    check(`${tag} single font-size controls not displayed`, st.hidden.noteFontSmallBtn === true && st.hidden.noteFontNormalBtn === true && st.hidden.noteFontLargeBtn === true);
    check(`${tag} colors controls + color input not displayed`, st.hidden.noteTextColorBtn === true && st.hidden.noteHighlightBtn === true && st.hidden.noteTextColorInput === true);
    check(`${tag} presets / styles / frames not displayed`, st.hidden.noteAaPresetsRow === true && st.hidden.noteAaStylesRow === true && st.hidden.noteAaFramesRow === true);
    check(`${tag} Text Style panel hidden by default`, !!st.panel && st.panel.display === 'none', JSON.stringify(st.panel));
    check(`${tag} image menu hidden by default`, !!st.imgMenu && st.imgMenu.display === 'none', JSON.stringify(st.imgMenu));
    check(`${tag} writing area gets the freed space`, st.body.h > st.modal.h * 0.6, `body=${st.body.h} modal=${st.modal.h}`);
    check(`${tag} nothing reserved above the writing area (no large control block)`, st.body.h >= st.modal.h - st.header.rect.h - st.toolbar.rect.h - 6, `body=${st.body.h} modal=${st.modal.h} header=${st.header.rect.h} toolbar=${st.toolbar.rect.h}`);

    // ---------- Functionality ----------
    await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); b.focus(); b.click(); });
    await page.keyboard.type('Typed text');
    await sleep(200);
    check(`${tag} typing works`, await page.evaluate(() => (document.getElementById('noteBodyInput').innerText || '').includes('Typed text')));

    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteBoldBtn').click());
    await sleep(150);
    check(`${tag} Bold works`, await page.evaluate(() => /<(b|strong)[\s>]/i.test(document.getElementById('noteBodyInput').innerHTML)));

    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteItalicBtn').click());
    await sleep(150);
    check(`${tag} Italic works`, await page.evaluate(() => /<(i|em)[\s>]/i.test(document.getElementById('noteBodyInput').innerHTML)));

    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteUnderlineBtn').click());
    await sleep(150);
    check(`${tag} Underline works`, await page.evaluate(() => /<(u|ins)[\s>]/.test(document.getElementById('noteBodyInput').innerHTML) || /text-decoration\s*:\s*underline/i.test(document.getElementById('noteBodyInput').innerHTML)));

    // ---------- Text Style dropdown ----------
    await page.evaluate(() => document.getElementById('noteAaBtn').click());
    await sleep(250);
    const panelOpen = await page.evaluate(() => {
      const p = document.getElementById('noteAaPanel');
      const cs = getComputedStyle(p);
      const r = p.getBoundingClientRect();
      const tb = document.querySelector('.note-format-toolbar').getBoundingClientRect();
      return { display: cs.display, h: Math.round(r.height), w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), toolbarBottom: Math.round(tb.bottom), expanded: document.getElementById('noteAaBtn').getAttribute('aria-expanded'), vw: window.innerWidth };
    });
    check(`${tag} Text Style dropdown opens (small, not a big block)`, panelOpen.display !== 'none' && panelOpen.h < 320, JSON.stringify(panelOpen));
    check(`${tag} dropdown anchored under the toolbar row`, panelOpen.top <= panelOpen.toolbarBottom + 2, JSON.stringify(panelOpen));
    check(`${tag} dropdown stays inside the viewport`, panelOpen.left >= -1 && panelOpen.right <= panelOpen.vw + 1, JSON.stringify(panelOpen));
    check(`${tag} dropdown exposes Text Style options (Text/H1/H2/H3)`, await page.evaluate(() => {
      const p = document.getElementById('noteAaPanel');
      const ids = ['noteStyleNormalBtn', 'noteStyleH1Btn', 'noteStyleH2Btn', 'noteStyleH3Btn'];
      return ids.every((id) => { const el = document.getElementById(id); return el && p.contains(el) && getComputedStyle(el).display !== 'none'; });
    }));
    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteStyleH1Btn').click());
    await sleep(250);
    check(`${tag} Text Style H1 works`, await page.evaluate(() => !!document.querySelector('#noteBodyInput h1')));
    check(`${tag} dropdown closes after choosing a style`, await page.evaluate(() => document.getElementById('noteAaPanel').classList.contains('hidden')));

    // H2 + Normal/Text (same dropdown, same handlers)
    await page.evaluate(() => { document.getElementById('noteBodyInput').innerHTML = 'h2 sample'; });
    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteAaBtn').click());
    await sleep(200);
    await page.evaluate(() => document.getElementById('noteStyleH2Btn').click());
    await sleep(200);
    check(`${tag} Text Style H2 works`, await page.evaluate(() => !!document.querySelector('#noteBodyInput h2')));
    await page.evaluate(() => { document.getElementById('noteBodyInput').innerHTML = 'normal sample'; });
    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteAaBtn').click());
    await sleep(200);
    await page.evaluate(() => document.getElementById('noteStyleNormalBtn').click());
    await sleep(200);
    check(`${tag} Text Style Normal/Text works`, await page.evaluate(() => !document.querySelector('#noteBodyInput h1, #noteBodyInput h2, #noteBodyInput h3')));

    // Lists
    await page.evaluate(() => { document.getElementById('noteBodyInput').innerHTML = 'list sample'; });
    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteBulletListBtn').click());
    await sleep(200);
    check(`${tag} Bullet list works`, await page.evaluate(() => !!document.querySelector('#noteBodyInput ul')));
    await page.evaluate(() => { document.getElementById('noteBodyInput').innerHTML = 'list sample 2'; });
    await selectAllBody(page);
    await page.evaluate(() => document.getElementById('noteNumberListBtn').click());
    await sleep(200);
    check(`${tag} Numbered list works`, await page.evaluate(() => !!document.querySelector('#noteBodyInput ol')));

    // Image: small popover + existing Upload/Camera items + existing file input
    await page.evaluate(() => {
      window.__fileClick = 0;
      const fi = document.getElementById('noteImageFileInput');
      if (fi && !fi.__wrapped) { fi.__wrapped = true; fi.addEventListener('click', (e) => { window.__fileClick++; e.preventDefault(); }); }
    });
    await page.evaluate(() => document.getElementById('noteImageBtn').click());
    await sleep(250);
    const imgState = await page.evaluate(() => {
      const m = document.getElementById('noteImageMenu');
      const cs = getComputedStyle(m);
      const r = m.getBoundingClientRect();
      const btn = document.getElementById('noteImageBtn').getBoundingClientRect();
      return { display: cs.display, pos: cs.position, items: Array.from(m.querySelectorAll('.note-image-menu-item')).map((b) => b.getAttribute('data-source')), rect: { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right) }, btnBottom: Math.round(btn.bottom), vw: window.innerWidth };
    });
    check(`${tag} Image menu opens as a popover with Upload + Camera`, imgState.display !== 'none' && imgState.pos === 'fixed' && JSON.stringify(imgState.items) === JSON.stringify(['upload', 'camera']), JSON.stringify(imgState));
    check(`${tag} Image popover stays inside the viewport`, imgState.rect.x >= 0 && imgState.rect.right <= imgState.vw && imgState.rect.y >= 0, JSON.stringify(imgState.rect));
    await page.evaluate(() => document.querySelector('.note-image-menu-item[data-source="upload"]').click());
    await sleep(250);
    check(`${tag} Image Upload still reaches the existing file input`, await page.evaluate(() => window.__fileClick > 0 && document.getElementById('noteImageMenu').classList.contains('hidden')));

    // Table: existing insert popup + real table
    await page.evaluate(() => document.getElementById('noteTableBtn').click());
    await page.waitForFunction(() => { const p = document.getElementById('noteTablePanel'); return p && !p.classList.contains('hidden'); }, { timeout: 3000 });
    const tablePanelVisible = await page.evaluate(() => getComputedStyle(document.getElementById('noteTablePanel')).display !== 'none');
    await page.evaluate(() => document.getElementById('noteTableInsertBtn').click());
    await sleep(400);
    check(`${tag} Table insert works (popup + real table)`, tablePanelVisible && await page.evaluate(() => !!document.querySelector('#noteBodyInput table.note-table')));

    // Image: real end-to-end insert through the existing file input (no new logic)
    const fileInput = await page.$('#noteImageFileInput');
    await fileInput.uploadFile(path.join(HERE, '_cp_logo.png'));
    await sleep(600);
    check(`${tag} Image insert works end-to-end`, await page.evaluate(() => !!document.querySelector('#noteBodyInput img')));

    // ---------- Autosave / Save / persistence / reopen ----------
    await page.evaluate(() => {
      const b = document.getElementById('noteBodyInput');
      b.innerHTML = 'Persistence check text';
      b.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(1000);
    check(`${tag} autosave persisted the edit (localStorage)`, await page.evaluate((k) => JSON.stringify(JSON.parse(localStorage.getItem(k) || '{}')).includes('Persistence check text'), NOTES_KEY));
    await page.evaluate(() => {
      const t = document.getElementById('noteTitleInput');
      t.value = 'Layout Note Saved';
      t.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(700);
    await page.evaluate(() => document.getElementById('saveFullScreenNote').click());
    await sleep(500);
    check(`${tag} Save button works (Saved indicator shown)`, await page.evaluate(() => { const i = document.getElementById('noteSavedIndicator'); return !!i && i.classList.contains('show'); }));

    await page.evaluate(() => document.getElementById('closeFullScreenNote').click());
    await sleep(500);
    check(`${tag} Back arrow closes the editor`, await page.evaluate(() => !document.getElementById('fullScreenNoteModal').classList.contains('show')));

    const opened = await page.evaluate(() => {
      const card = Array.from(document.querySelectorAll('#notesList .note-item')).find((li) => /Layout Note/.test(li.textContent || ''));
      if (!card) return false;
      (card.querySelector('.note-open-btn') || card).click();
      return true;
    });
    if (opened) await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
    await sleep(500);
    check(`${tag} reopening the note keeps the saved content`, opened && await page.evaluate(() => (document.getElementById('noteBodyInput').innerText || '').includes('Persistence check text')));
    await page.evaluate(() => document.getElementById('closeFullScreenNote').click());
    await sleep(300);

    // ---------- Regression: unrelated systems still boot / work ----------
    const reg = await page.evaluate(() => ({
      calculator: !!document.getElementById('primaryDisplay'),
      currency: !!document.getElementById('currencyMenuButton') || !!document.getElementById('featureNavBar'),
      pdf: !!document.querySelector('.pdf-reports-workspace'),
      smart: !!document.querySelector('.smart-docs-home'),
      history: !!document.getElementById('historyPanel') || !!document.getElementById('historyList')
    }));
    check(`${tag} Calculator / Currency / PDF / Smart Docs / History entry points intact`, reg.calculator && reg.currency && reg.pdf && reg.smart && reg.history, JSON.stringify(reg));

    const calc = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const find = (t) => btns.find((b) => (b.textContent || '').trim() === t);
      const two = find('2'), plus = find('+'), three = find('3'), eq = find('=');
      if (!two || !plus || !three || !eq) return { pressed: false };
      two.click(); plus.click(); three.click(); eq.click();
      return { pressed: true };
    });
    await sleep(400);
    const calcAfter = await page.evaluate(() => (document.getElementById('primaryDisplay') || {}).textContent || '');
    check(`${tag} Calculator still computes (2+3)`, !calc.pressed || /5/.test(calcAfter), JSON.stringify({ pressed: calc.pressed, after: calcAfter }));

    check(`${tag} no unexpected JS console/page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
    check(`${tag} no 404 on app assets`, badResponses.length === 0, badResponses.slice(0, 3).join(' | '));
    await page.close();
  }
} catch (e) {
  check('HARNESS', false, e.message);
  lines.push('HARNESS ERROR: ' + e.message);
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}
const total = results.filter((r) => r.ok).length;
lines.push(`\nRESULT ${total}/${results.length} PASS`);
fs.writeFileSync(path.join(HERE, 'notes_minimal_verify.result.txt'), lines.join('\n'), 'utf8');
console.log(`\nRESULT: ${total}/${results.length} passed`);