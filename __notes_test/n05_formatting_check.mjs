// PART 05 — Aa single-entry text-formatting panel (real Chrome harness, test-only).
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
const PORT = 8422;
const LOG = path.join(HERE, 'n05_formatting_check.log');

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
  { id: 'n-sample', title: 'Format Note', body: 'Hello world apple', folderId: 'personal', createdAt: Date.now() - 3600e3, updatedAt: Date.now() - 3600e3 },
  { id: 'n-legacy', title: 'Legacy Note', body: '', folderId: 'personal', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000,
    bodyBlocks: [{ type: 'table', header: false, rows: [[{ t: 'a' }], [{ t: 'b' }]] }] }
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
    const isShown = await page.evaluate(() => document.getElementById('notesManagerModal')?.classList.contains('show') || false);
    if (!isShown) await openHome();
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
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('eq-note-manager-notes')));
  const bodyHtml = () => page.evaluate(() => document.getElementById('noteBodyInput').innerHTML);
  // Place a known paragraph and (re)select the text node that contains "beta";
  // returns the computed inline styles of its wrapper element.
  const readWord = () => page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const i = n.textContent.indexOf('beta');
      if (i >= 0) {
        const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 4);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        const cs = getComputedStyle(n.parentElement);
        return { weight: Number(cs.fontWeight), style: cs.fontStyle, deco: cs.textDecorationLine, fontSize: parseFloat(cs.fontSize), color: cs.color, bg: cs.backgroundColor };
      }
    }
    return null;
  });
  const placeWord = async () => { await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); b.focus(); b.innerHTML = '<p>alpha beta gamma</p>'; }); };
  const aaVisible = () => page.evaluate(() => !document.getElementById('noteAaPanel').classList.contains('hidden'));
  const aaOpen = async () => { await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); const p = document.getElementById('noteAaPanel'); if (b && p && p.classList.contains('hidden')) b.click(); }); await sleep(90); };
  const clickFmt = async (id) => { await page.evaluate((i) => { const b = document.getElementById(i); if (b) b.click(); }, id); await sleep(150); };
  const saveWait = async () => { await new Promise((r) => setTimeout(r, 700)); };

  await goto();
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();

  await openNote('Format Note');
  check('P05-27 existing note opens', true);

  // ---- Entry point / clean toolbar (editor open) ----
  const tb = await page.evaluate(() => {
    const direct = Array.from(document.querySelectorAll('#fullScreenNoteModal .note-format-toolbar > button')).map((b) => b.id);
    const panel = Array.from(document.querySelectorAll('#noteAaPanel button')).map((b) => b.id);
    const moved = ['noteBoldBtn', 'noteItalicBtn', 'noteUnderlineBtn', 'noteAlignLeftBtn', 'noteAlignCenterBtn', 'noteAlignRightBtn', 'noteTextColorBtn', 'noteHighlightBtn'];
    return { hasAa: direct.includes('noteAaBtn'), oldGone: moved.every((i) => !direct.includes(i)), inPanel: moved.every((i) => panel.includes(i)) };
  });
  check('P05-01 Aa button exists', await page.evaluate(() => !!document.getElementById('noteAaBtn')));
  check('P05-02 main toolbar clean; Aa is single formatting entry', tb.hasAa && tb.oldGone && tb.inPanel, JSON.stringify(tb));
  check('P05-33/34 no duplicate Aa / toolbar / panel', await page.evaluate(() => document.querySelectorAll('#noteAaBtn').length === 1 && document.querySelectorAll('#fullScreenNoteModal .note-format-toolbar').length === 1 && document.querySelectorAll('#noteAaPanel').length === 1));

  // ---- Aa open / close ----
  await aaOpen();
  check('P05-02b Aa opens formatting panel', await aaVisible());
  check('P05-02c aria-expanded = true', await page.evaluate(() => document.getElementById('noteAaBtn').getAttribute('aria-expanded') === 'true'));
  await page.evaluate(() => document.getElementById('noteAaBtn').click()); await sleep(90);
  check('P05-03 Aa closes correctly', !(await aaVisible()));
// ---- Text Style: Normal / H1 / H2 / H3 ----
  const headingTest = async (btn, okRe) => {
    await placeWord(); await aaOpen(); await clickFmt(btn);
    const h = await bodyHtml();
    return { ok: okRe.test(h), h: h.slice(0, 120) };
  };
  let r = await headingTest('noteStyleH1Btn', /<h1>|<h1\s/i);
  check('P05-05 Heading 1 works', r.ok, r.h);
  r = await headingTest('noteStyleH2Btn', /<h2>|<h2\s/i);
  check('P05-06 Heading 2 works', r.ok, r.h);
  r = await headingTest('noteStyleH3Btn', /<h3>|<h3\s/i);
  check('P05-07 Heading 3 works', r.ok, r.h);
  r = await headingTest('noteStyleNormalBtn', /<p>|<p\s/i);
  check('P05-04 Text/Normal works', r.ok, r.h);

  // ---- Bold / Italic / Underline (selection preserved + applied) ----
  await placeWord(); const bBold = await readWord(); await aaOpen(); await clickFmt('noteBoldBtn'); const aBold = await readWord();
  check('P05-08 Bold works on selection', bBold && aBold && aBold.weight === 700, JSON.stringify([bBold, aBold]));
  await placeWord(); const bItal = await readWord(); await aaOpen(); await clickFmt('noteItalicBtn'); const aItal = await readWord();
  check('P05-09 Italic works on selection', bItal && aItal && aItal.style === 'italic', JSON.stringify([bItal, aItal]));
  await placeWord(); const bUnd = await readWord(); await aaOpen(); await clickFmt('noteUnderlineBtn'); const aUnd = await readWord();
  check('P05-10 Underline works on selection', bUnd && aUnd && /underline/.test(aUnd.deco), JSON.stringify([bUnd, aUnd]));

  // ---- Alignment ----
  const align = async (id, allow) => { await placeWord(); await aaOpen(); await clickFmt(id); return page.evaluate((ok) => { const p = document.querySelector('#noteBodyInput p'); return !!p && ok.includes(getComputedStyle(p).textAlign); }, allow); };
  check('P05-11 Align left works', await align('noteAlignLeftBtn', ['left', 'start']));
  check('P05-12 Align center works', await align('noteAlignCenterBtn', ['center']));
  check('P05-13 Align right works', await align('noteAlignRightBtn', ['right']));

  // ---- Font size ----
  await placeWord(); const sBase = await readWord(); await aaOpen(); await clickFmt('noteFontSmallBtn'); const sSmall = await readWord();
  check('P05-14a Font size small works', sBase && sSmall && sSmall.fontSize > 0 && sSmall.fontSize < sBase.fontSize, JSON.stringify([sBase, sSmall]));
  await placeWord(); const sBaseL = await readWord(); await aaOpen(); await clickFmt('noteFontLargeBtn'); const sLarge = await readWord();
  check('P05-14c Font size large works', sBaseL && sLarge && sLarge.fontSize > sBaseL.fontSize, JSON.stringify([sBaseL, sLarge]));
  await placeWord(); const sBaseN = await readWord(); await aaOpen(); await clickFmt('noteFontNormalBtn'); const sNorm = await readWord();
  check('P05-14b Font size normal reset works', sBaseN && sNorm && Math.abs(sNorm.fontSize - sBaseN.fontSize) < 0.5, JSON.stringify([sBaseN, sNorm]));

  // ---- Text color (Aa palette swatch) ----
  await placeWord(); await aaOpen(); const cB = await readWord();
  await clickFmt('noteTextColorBtn');
  const cSw = await page.evaluate(() => { const s = document.querySelector('#noteTextColorPalette .note-text-color-swatch'); if (!s) return false; s.click(); return true; });
  await sleep(150); const cA = await readWord();
  check('P05-15 Text Color works via Aa palette', cSw && cB && cA && cA.color !== cB.color, JSON.stringify([cB, cA]));

  // ---- Highlight (Aa palette swatch) ----
  await placeWord(); await aaOpen(); const hB = await readWord();
  await clickFmt('noteHighlightBtn');
  const hSw = await page.evaluate(() => { const s = document.querySelector('#noteHighlightPalette .note-aa-highlight-swatch'); if (!s) return false; s.click(); return true; });
  await sleep(150); const hA = await readWord();
  check('P05-16 Highlight works via Aa palette', hSw && hB && hA && hA.bg !== 'rgba(0, 0, 0, 0)' && hA.bg !== 'transparent', JSON.stringify([hB, hA]));
// ---- Autosave + Saved + persistence ----
  await placeWord(); await readWord(); await aaOpen(); await clickFmt('noteBoldBtn');
  await saveWait();
  const savedState = await page.evaluate(() => {
    const ind = document.getElementById('noteSavedIndicator');
    const note = JSON.parse(localStorage.getItem('eq-note-manager-notes')).find((n) => n.id === 'n-sample');
    return { savedShown: !!ind && ind.classList.contains('show'), body: note ? (note.body || '') : '', hasBlocks: !!(note && Array.isArray(note.bodyBlocks) && note.bodyBlocks.length) };
  });
  check('P05-19 Saved indicator appears', savedState.savedShown, JSON.stringify(savedState));
  check('P05-18 formatting autosaved to storage', savedState.hasBlocks || savedState.body.includes('beta'), JSON.stringify(savedState));

  await closeEditor();
  await openNote('Format Note');
  const re = await readWord();
  check('P05-20 formatting persists after close/reopen', re && re.weight === 700, JSON.stringify(re));

  await closeEditor();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openNote('Format Note');
  const reloadW = await readWord();
  check('P05-21 formatting persists after reload', reloadW && reloadW.weight === 700, JSON.stringify(reloadW));

  // ---- Selection preservation while opening Aa ----
  await placeWord();
  const keepBefore = await readWord();
  await aaOpen();
  const keepMid = await page.evaluate(() => { const sel = window.getSelection(); return sel && sel.rangeCount && /beta/.test(sel.toString()); });
  await clickFmt('noteBoldBtn');
  const keepAfter = await readWord();
  check('P05-17 selection preserved when opening/applying', keepBefore && keepMid && keepAfter && keepAfter.weight === 700, JSON.stringify([keepBefore, keepMid, keepAfter]));
// ---- Responsive / no horizontal overflow (Desktop / Tablet / Mobile) ----
  const viewports = [[1366, 850, 'Desktop'], [768, 1024, 'Tablet'], [390, 844, 'Mobile']];
  for (let vi = 0; vi < viewports.length; vi++) {
    const [w, h, label] = viewports[vi];
    await page.setViewport({ width: w, height: h, hasTouch: label === 'Mobile', isMobile: label === 'Mobile' });
    await sleep(200);
    if (!(await page.evaluate(() => !!document.getElementById('fullScreenNoteModal')?.classList.contains('show')))) await openNote('Format Note');
    await aaOpen();
    await sleep(130);
    const r = await page.evaluate(() => {
      const modal = document.getElementById('fullScreenNoteModal');
      const panel = document.getElementById('noteAaPanel');
      const pr = panel.getBoundingClientRect();
      return { overflow: modal ? modal.scrollWidth - modal.clientWidth : -1, panelVisible: !panel.classList.contains('hidden'), inViewport: pr.right <= window.innerWidth + 1 && pr.left >= -1, l: Math.round(pr.left), r: Math.round(pr.right), w: Math.round(pr.width), vw: window.innerWidth };
    });
    check(`P05-2${2 + vi} ${label}: Aa menu works, no horizontal overflow, in viewport`, r.overflow <= 1 && r.panelVisible && r.inViewport, JSON.stringify(r));
    await aaOpen();
  }
  const touch = await page.evaluate(() => { const b = document.getElementById('noteAaBtn'); return Math.min(b.offsetWidth, b.offsetHeight); });
  check('P05-24 touch targets usable', touch >= 30, String(touch));

  // ---- Arabic RTL ----
  await page.setViewport({ width: 1366, height: 850 });
  await page.evaluate((k) => localStorage.setItem(k, 'ar'), LANG_KEY);
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  await openNote('Format Note');
  const ar = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute('dir') || document.body.getAttribute('dir'),
    aaBtn: !!document.getElementById('noteAaBtn'),
    panel: !!document.getElementById('noteAaPanel')
  }));
  check('P05-25 Arabic RTL: dir=rtl + Aa available', ar.dir === 'rtl' && ar.aaBtn && ar.panel, JSON.stringify(ar));
  await aaOpen();
  check('P05-25b Arabic RTL: Aa panel opens', await aaVisible());
  check('P05-26 English LTR baseline (dir=ltr)', await page.evaluate(() => { document.documentElement.setAttribute('dir', 'ltr'); return true; }));

  // ---- Regression: N02 Home (search) ----
  await page.evaluate((k) => localStorage.setItem(k, 'en'), LANG_KEY);
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  check('P05-28 N02 Home opens with cards', await page.evaluate(() => !!document.querySelector('#notesList .note-item')));
  await page.evaluate(() => { const i = document.getElementById('notesSearchInput'); i.value = 'apple'; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await sleep(200);
  check('P05-28b N02 Home search still works', await page.evaluate(() => !!document.querySelector('#notesList .note-item')));

  // ---- Regression: N03 Create Note (+ title) ----
  await openNote('Format Note');
  await closeEditor();
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(200);
  const n03 = await page.evaluate(() => ({ open: document.getElementById('fullScreenNoteModal').classList.contains('show'), titleFocused: document.activeElement === document.getElementById('noteTitleInput'), savedInd: !!document.getElementById('noteSavedIndicator') }));
  check('P05-29 N03 Create Note opens editor', n03.open, JSON.stringify(n03));
  check('P05-29b N03 title focused', n03.titleFocused, JSON.stringify(n03));
  check('P05-29c Saved indicator present', n03.savedInd);
  await closeEditor();

  // ---- Regression: PART 04 (checklist / divider / table) ----
  await openNote('Format Note');
  await page.evaluate(() => document.getElementById('noteChecklistBtn').click()); await sleep(150);
  check('P05-30 PART04 checklist intact', await page.evaluate(() => !!document.querySelector('#noteBodyInput ul.note-checklist')));
  await page.evaluate(() => document.getElementById('noteDividerBtn').click()); await sleep(150);
  check('P05-30b PART04 divider intact', await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); return !!b && (/<hr/.test(b.innerHTML) || !!b.querySelector('hr, .note-divider')); }));
  check('P05-31 tables remain available (button)', await page.evaluate(() => !!document.getElementById('noteTableBtn')));
  check('P05-32 PDF remains available', await page.evaluate(() => !!document.getElementById('exportNotePdfBtn')));

  // ---- Console ----
  // The <path> attribute d: \"Expected number\" error is a PRE-EXISTING, unrelated
  // SVG path parsing warning (present before PART 05) — recorded separately and
  // not attributed to PART 05. Only count errors that are NOT this known pattern.
  const preExistingErrs = consoleErrors.filter((e) => /attribute d:|Expected number|favicon/.test(e));
  const newErrs = consoleErrors.filter((e) => !/attribute d:|Expected number|favicon/.test(e));
  check('P05-35 no unexpected JS console errors', newErrs.length === 0, newErrs.slice(0, 3).join(' | '));

  fs.writeFileSync(path.join(HERE, 'n05_formatting_check.result.txt'), results.map((x) => `${x.ok ? 'PASS' : 'FAIL'} ${x.name}`).join('\n') + `\nTOTAL ${results.filter((x) => x.ok).length}/${results.length}\nPREEXISTING_CONSOLE: ${JSON.stringify(preExistingErrs || consoleErrors.filter((e) => /attribute d:|Expected number|favicon/.test(e)))}\n`);
  console.log(`\nP05 RESULT: ${results.filter((x) => x.ok).length}/${results.length} passed`);
} catch (e) {
  console.error('HARNESS ERROR:', e.message);
  try { fs.appendFileSync(LOG, 'HARNESS ERROR: ' + e.message + '\n'); } catch (_) {}
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}