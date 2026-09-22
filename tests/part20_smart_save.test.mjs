// PART 20 — SMART DOCUMENTS: Saving Work (حفظ العمل)
// Behavioral test in real Chrome via Puppeteer. Covers: Save / save-draft
// persisted locally (localStorage V1), toast confirmation, dirty tracking,
// unsaved-changes dialog (حفظ / خروج بدون حفظ / إلغاء) on Back/Escape/close,
// draft banner + resume, no alert/confirm/prompt, RTL/LTR locales,
// responsive layouts, no JS errors, other EQ features unaffected.
// Run:  node tests/part20_smart_save.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8291;
const DRAFT_KEY = 'eq-smart-doc-draft-v1';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm'
};
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
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URLBASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p20_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(URLBASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
async function openDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
async function openSmartHome(page, locale) {
  await openDrawer(page);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(400);
}
async function openBlank(page, locale) {
  await openSmartHome(page, locale);
  // PART 23 — clear BOTH the IndexedDB draft and any legacy localStorage draft
  // so every section starts from a clean local state (awaited, deterministic).
  await page.evaluate(() => { try { return window.__smartSave.clearDraft(); } catch (e) {} });
  await sleep(150);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
async function seedText(page, txt) {
  await page.evaluate((t) => {
    window.__smartBlank.insertElement('text');
    const holder = document.getElementById('smartBlankCanvasHolder');
    const cv = Array.from(holder.querySelectorAll('.smart-blank-canvas'))
      .find((c) => !c.classList.contains('smart-page-hidden')) ||
      Array.from(holder.querySelectorAll('.smart-blank-canvas')).pop();
    const surface = cv.querySelector('.smart-document-content');
    const p = surface.querySelector('.smart-doc-text-block:last-child');
    if (p) p.textContent = t;
  }, txt);
  await sleep(250);
}
const sv = (page) => page.evaluate(() => window.__smartSave.getState());
// ============================================================
// A) Clean exit needs NO confirmation; dirty state needs it
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  let s = await sv(page);
  check('1) Fresh document is not dirty', s.dirty === false && s.dialogVisible === false, JSON.stringify(s));
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(350);
  const home = await page.evaluate(() => !document.getElementById('smartBlankView').classList.contains('blank-visible'));
  check('2) Pristine Back returns home WITHOUT dialog', home && !(await sv(page)).dialogVisible);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(400);
  await seedText(page, 'Unsaved work');
  s = await sv(page);
  check('3) Typing marks the document dirty', s.dirty === true, JSON.stringify(s));
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(300);
  s = await sv(page);
  check('4) Dirty Back shows unsaved-changes dialog', s.dialogVisible === true && s.editorVisible === true, JSON.stringify(s));
  const title = await page.evaluate(() => document.getElementById('smartUnsavedTitle').textContent.trim());
  check('5) Dialog asks about saving before exit', title.length > 3, title);
  const btns = await page.evaluate(() => ({
    save: !!document.getElementById('smartUnsavedSaveBtn'),
    exit: !!document.getElementById('smartUnsavedExitBtn'),
    cancel: !!document.getElementById('smartUnsavedCancelBtn')
  }));
  check('6) Dialog has Save / Exit without saving / Cancel', btns.save && btns.exit && btns.cancel, JSON.stringify(btns));
  await page.evaluate(() => document.getElementById('smartUnsavedCancelBtn').click());
  await sleep(300);
  const kept = await page.evaluate(() =>
    document.querySelector('#smartBlankCanvasHolder .smart-document-content').textContent.includes('Unsaved work'));
  s = await sv(page);
  check('7) Cancel stays in the editor, content intact', kept && s.editorVisible && !s.dialogVisible, JSON.stringify(s));
  check('A) No JS errors (basic flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// B) Save persists locally (V1) — content, pages, name
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'Quarterly report body');
  await page.evaluate(() => window.__smartPages.add()); await sleep(300);
  await seedText(page, 'Second page body');
  await page.evaluate(() => {
    document.getElementById('smartSaveDraftBtn').click();
    window.__toastAtSave = (document.getElementById('toast') || { textContent: '' }).textContent.trim();
  });
  await sleep(400);
  let s = await sv(page);
  check('8) Save clears the dirty flag', s.dirty === false, JSON.stringify(s));
  check('9) Draft exists locally', s.hasDraft === true);
  const draft = await page.evaluate(() => window.__smartSave.readDraft());
  check('10) Draft stores both pages', draft && draft.pageCount === 2 && draft.pages.length === 2, JSON.stringify({ pc: draft && draft.pageCount }));
  check('11) Draft stores page 1 text', draft.pages[0].includes('Quarterly report body'));
  check('12) Draft stores page 2 text', draft.pages[1].includes('Second page body'));
  check('13) Draft stores name + savedAt + version', typeof draft.savedAt === 'number' && draft.v === 1 && !!draft.name, JSON.stringify({ n: draft.name }));
  const toast = await page.evaluate(() => window.__toastAtSave);
  check('14) Save shows a localized toast', toast.length > 0 && /saved|registr|guard|speicher|kaydet|enregistr|сохран/i.test(toast), toast);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(350);
  s = await sv(page);
  check('15) Leaving right after save needs no dialog', !s.dialogVisible && !s.editorVisible, JSON.stringify(s));
  check('B) No JS errors (save flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// C) Dialog: حفظ exits AND saves; خروج بدون حفظ discards
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'Dialog save path');
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(300);
  await page.evaluate(() => document.getElementById('smartUnsavedSaveBtn').click());
  await sleep(400);
  let s = await sv(page);
  const stored = await page.evaluate(() => {
    const d = window.__smartSave.readDraft();
    return d ? JSON.stringify(d.pages) : '';
  });
  check('16) Dialog SAVE writes the draft', !!stored && stored.includes('Dialog save path'));
  check('17) Dialog SAVE returns to Smart Documents home', !s.editorVisible && !s.dialogVisible, JSON.stringify(s));
  await page.evaluate(() => { try { return window.__smartSave.clearDraft(); } catch (e) {} });
  await sleep(150);
  await openSmartHome(page);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(400);
  await seedText(page, 'Doomed edits');
  await page.evaluate(() => document.getElementById('closeSmartDocs').click());
  await sleep(300);
  s = await sv(page);
  check('18) Closing Smart Docs while dirty shows the dialog', s.dialogVisible === true, JSON.stringify(s));
  await page.evaluate(() => document.getElementById('smartUnsavedExitBtn').click());
  await sleep(400);
  s = await sv(page);
  const modalClosed = await page.evaluate(() => !document.getElementById('smartDocsModal').classList.contains('show'));
  check('19) Exit without saving closes everything', modalClosed && !s.editorVisible && !s.dialogVisible, JSON.stringify({ m: modalClosed, ...s }));
  const lostDraft = await page.evaluate(() => {
    const d = window.__smartSave.readDraft();
    return d ? JSON.stringify(d.pages) : '';
  });
  check('20) Discarded edits were NOT saved', !lostDraft || !lostDraft.includes('Doomed edits'));
  check('C) No JS errors (dialog decisions)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// D) Escape behaves like Back (guard); Escape on dialog cancels
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'Escape guard');
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').focus());
  await sleep(50);
  await page.keyboard.press('Escape'); await sleep(350);
  let s = await sv(page);
  check('21) Escape while dirty opens the dialog', s.dialogVisible === true, JSON.stringify(s));
  await page.keyboard.press('Escape'); await sleep(350);
  s = await sv(page);
  check('22) Escape on the dialog cancels it (stays editing)', !s.dialogVisible && s.editorVisible, JSON.stringify(s));
  await page.keyboard.press('Escape'); await sleep(250);
  await page.evaluate(() => document.getElementById('smartUnsavedCancelBtn').click());
  await sleep(200);
  check('23) Cancel button also reachable after second Escape', (await sv(page)).editorVisible === true);
  check('D) No JS errors (escape flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// E) Draft banner + resume restores every page
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await page.evaluate((k) => {
    localStorage.setItem(k, JSON.stringify({
      v: 1, app: 'EQ', name: 'Resume me', savedAt: Date.now(), locale: 'en',
      designPreset: 'formal', pageCount: 2,
      pages: [
        '<p class="smart-doc-text-block" contenteditable="true">First restored page</p>',
        '<h2 class="smart-doc-heading" contenteditable="true">Second restored heading</h2>'
      ]
    }));
  }, DRAFT_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(500);
  await openSmartHome(page, 'en');
  let banner = await page.evaluate(() => ({
    visible: !document.getElementById('smartDraftBanner').hidden,
    info: document.getElementById('smartDraftInfo').textContent
  }));
  check('24) Draft banner appears on home when a draft exists', banner.visible, JSON.stringify(banner));
  check('25) Banner shows the draft name', banner.info.includes('Resume me'), banner.info);
  await page.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
  await sleep(600);
  const s = await sv(page);
  check('26) Resume opens the editor (clean state)', s.editorVisible === true && !s.dirty, JSON.stringify(s));
  const desc = await page.evaluate(() => window.__smartPages.describe());
  check('27) Resume rebuilds BOTH pages', desc.length === 2, JSON.stringify(desc.map((d) => ({ h: d.headings, t: d.text }))));
  check('28) Page 1 content restored', (desc[0].text.join(' ') + desc[0].headings.join(' ')).includes('First restored page'), JSON.stringify(desc[0]));
  check('29) Page 2 content restored', (desc[1].text.join(' ') + desc[1].headings.join(' ')).includes('Second restored heading'), JSON.stringify(desc[1]));
  const preset = await page.evaluate(() => window.__smartPageDesign.getState().preset);
  check('30) Design preset restored', preset === 'formal', preset);
  await page.evaluate(() => window.__smartSave.clearDraft());
  await sleep(200);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(350);
  banner = await page.evaluate(() => document.getElementById('smartDraftBanner').hidden);
  check('31) Banner hidden again after clearing the draft', banner === true);
  check('E) No JS errors (resume flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// F) Page operations mark dirty; navigation does NOT
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click()); await sleep(300);
  check('32) Saved baseline is clean', (await sv(page)).dirty === false);
  await page.evaluate(() => window.__smartPages.go(1)); await sleep(200);
  check('33) Page NAVIGATION never marks dirty', (await sv(page)).dirty === false);
  await page.evaluate(() => window.__smartPages.add()); await sleep(300);
  check('34) Adding a page marks dirty', (await sv(page)).dirty === true);
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click()); await sleep(300);
  await page.evaluate(() => window.__smartPages.copy()); await sleep(300);
  check('35) Copying a page marks dirty', (await sv(page)).dirty === true);
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click()); await sleep(300);
  await page.evaluate(() => window.__smartPages.move(-1)); await sleep(300);
  check('36) Reordering pages marks dirty', (await sv(page)).dirty === true);
  const draft = await page.evaluate(() => window.__smartSave.readDraft());
  check('37) Re-save captures the new/reordered pages', draft && draft.pageCount === 3, 'pc=' + (draft && draft.pageCount));
  check('F) No JS errors (dirty tracking)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}
// ============================================================
// G) Locales — dialog + save button translated (RTL/LTR)
// ============================================================
{
  const cases = [
    { key: 'ar', rtl: true, save: 'حفظ', titlePart: 'هل تريد حفظ التغييرات قبل الخروج', exit: 'خروج بدون حفظ', cancel: 'إلغاء' },
    { key: 'en', rtl: false, save: 'Save', titlePart: 'save your changes before exiting', exit: 'Exit without saving', cancel: 'Cancel' },
    { key: 'es', rtl: false, save: 'Guardar', titlePart: 'antes de salir', exit: 'Salir sin guardar', cancel: 'Cancelar' },
    { key: 'fr', rtl: false, save: 'Enregistrer', titlePart: 'avant de quitter', exit: 'Quitter sans enregistrer', cancel: 'Annuler' },
    { key: 'ru', rtl: false, save: 'Сохранить', titlePart: 'перед выходом', exit: 'Выйти без сохранения', cancel: 'Отмена' },
    { key: 'de', rtl: false, save: 'Speichern', titlePart: 'vor dem Beenden speichern', exit: 'Beenden ohne Speichern', cancel: 'Abbrechen' },
    { key: 'tr', rtl: false, save: 'Kaydet', titlePart: 'değişiklikleri kaydetmek', exit: 'Kaydetmeden çık', cancel: 'İptal' }
  ];
  for (const c of cases) {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, c.key);
    const saveTxt = await page.evaluate(() =>
      document.querySelector('.smart-save-btn span[data-i18n]').textContent.trim());
    check(c.key + ') Save button localized "' + c.save + '"', saveTxt === c.save, saveTxt);
    await seedText(page, 'x');
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(300);
    const d = await page.evaluate(() => ({
      dir: getComputedStyle(document.getElementById('smartUnsavedModal')).direction,
      title: document.getElementById('smartUnsavedTitle').textContent.trim(),
      exit: document.getElementById('smartUnsavedExitBtn').textContent.trim(),
      cancel: document.getElementById('smartUnsavedCancelBtn').textContent.trim()
    }));
    check(c.key + ') Dialog title localized', d.title.indexOf(c.titlePart) !== -1, d.title);
    check(c.key + ') Exit/Cancel localized', d.exit === c.exit && d.cancel === c.cancel, d.exit + '/' + d.cancel);
    check(c.key + ') Dialog direction ' + (c.rtl ? 'rtl' : 'ltr'), d.dir === (c.rtl ? 'rtl' : 'ltr'), d.dir);
    check(c.key + ') no JS errors', errs.length === 0, errs.join(' | ').slice(0, 120));
    await page.close();
  }
}
// ============================================================
// H) Responsive — dialog fits without overflow
// ============================================================
for (const vp of [
  { name: 'Desktop 1280', width: 1280, height: 800 },
  { name: 'Tablet 768', width: 768, height: 1024 },
  { name: 'iPhone 390', width: 390, height: 844 },
  { name: 'Android 360', width: 360, height: 800 }
]) {
  const { page, errs } = await newPage({ width: vp.width, height: vp.height });
  await openBlank(page, 'en');
  await seedText(page, 'resp');
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(300);
  const r = await page.evaluate(() => {
    const b = document.querySelector('#smartUnsavedModal.show');
    const m = b ? b.querySelector('.smart-unsaved-modal') : null;
    return {
      shown: !!b,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      fits: m ? (m.getBoundingClientRect().width <= window.innerWidth + 1 &&
                 m.getBoundingClientRect().height <= window.innerHeight + 1) : false
    };
  });
  check(vp.name + ') dialog shown, zero horizontal overflow', r.shown && r.overflow <= 1, JSON.stringify(r));
  check(vp.name + ') dialog fits the viewport', r.fits);
  check(vp.name + ') no JS errors', errs.length === 0, errs.join(' | ').slice(0, 120));
  await page.close();
}
// ============================================================
// I) Safety + regression — native dialogs banned, app unaffected
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  check('46) No JS errors on load', errs.length === 0, errs.join(' | ').slice(0, 120));
  await openBlank(page, 'en');
  await seedText(page, 'safe');
  await page.evaluate(() => document.getElementById('smartBlankBack').click()); // dialog
  await sleep(250);
  await page.evaluate(() => document.getElementById('smartUnsavedSaveBtn').click());
  await sleep(350);
  await page.evaluate(() => document.getElementById('closeSmartDocs').click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="9"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="+"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="1"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
  await sleep(250);
  const calc = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
  check('47) Calculator works (9+1=10)', calc === '10', calc);
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(400);
  check('48) Notes still works', await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));
  const dg = await page.evaluate(() => window.__dialogs);
  check('49) No alert()/confirm()/prompt() anywhere', dg.alert === 0 && dg.confirm === 0 && dg.prompt === 0, JSON.stringify(dg));
  check('50) Zero JS errors in the safety run', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

// ============================================================
const failed = results.filter((r) => !r.ok);
fs.appendFileSync(OUT, `\nTOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}\n`);
console.log(`\nPART 20 RESULT: TOTAL=${results.length} PASS=${results.length - failed.length} FAIL=${failed.length}`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);





