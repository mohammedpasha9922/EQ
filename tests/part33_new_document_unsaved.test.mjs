// PART 33 — SMART DOCUMENTS: NEW DOCUMENT & UNSAVED CHANGES PROTECTION
// Behavioral test in REAL Chrome via Puppeteer. Covers: New Document entry
// points (home card + editor header button), clean-document fast path,
// dirty-document protection dialog ("لديك تغييرات غير محفوظة.") with
// حفظ والمتابعة / بدء مستند جديد / إلغاء, atomic Save & Continue through the
// EXISTING PART 23 IndexedDB store + PART 32 serial drafts queue, multiple
// independent drafts, storage-seam verification (IndexedDB, never localStorage),
// RTL/LTR, responsive 1280..360, zero alert/confirm/prompt, zero JS errors,
// zero horizontal overflow. No new architecture anywhere.
// Run:  node tests/part33_new_document_unsaved.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8355;
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
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URLBASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p33_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 200) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});

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
  // Clear local state through the EXISTING seam so every section is deterministic.
  await page.evaluate(() => { try { window.__smartSave.clearDraft(); } catch (e) {} });
  await sleep(150);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
async function cleanDrafts(page) {
  await page.evaluate(async () => {
    try {
      localStorage.removeItem('eq-smart-doc-meta-v1');
      localStorage.removeItem('eq-smart-doc-backend-v1');
      localStorage.removeItem('eq-smart-doc-draft-v1');
      const list = await window.__smartDrafts.list();
      for (const en of list.list) await window.__smartDrafts.remove(en.key);
      const rec = await new Promise((res) => {
        const op = indexedDB.open('eq_smart_docs_db', 1);
        op.onsuccess = () => res(op.result);
        op.onerror = () => res(null);
      });
      if (rec) {
        await new Promise((res) => {
          try {
            const tx = rec.transaction('documents', 'readwrite');
            tx.objectStore('documents').clear();
            tx.oncomplete = () => res();
            tx.onerror = () => res();
          } catch (e) { res(); }
        });
        rec.close();
      }
    } catch (e) {}
  });
  await sleep(250);
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
// Create + save a named draft, then return to Smart Documents home.
async function makeDraft(page, locale, name, body) {
  await openSmartHome(page, locale);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
  await seedText(page, body);
  await page.evaluate((n) => window.__smartDocName.set(n), name);
  await sleep(150);
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click());
  await sleep(600);
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(500);
}
const sv = (page) => page.evaluate(() => window.__smartSave.getState());
const idbKeys = (page) => page.evaluate(async () => (await window.__smartDrafts.list()).list);
const dlgState = (page) => page.evaluate(() => ({
  visible: !!document.querySelector('#smartUnsavedModal.show'),
  openBackdrops: document.querySelectorAll('.smart-unsaved-backdrop.show').length,
  mode: window.__smartNewDoc.dialogMode(),
  title: document.getElementById('smartUnsavedTitle').textContent.trim(),
  save: document.getElementById('smartUnsavedSaveBtn').textContent.trim(),
  exit: document.getElementById('smartUnsavedExitBtn').textContent.trim(),
  cancel: document.getElementById('smartUnsavedCancelBtn').textContent.trim()
}));
const editorBody = (page) => page.evaluate(() => {
  const holder = document.getElementById('smartBlankCanvasHolder');
  const cv = holder.querySelector('.smart-blank-canvas:not(.smart-page-hidden)') ||
             holder.querySelector('.smart-blank-canvas');
  const s = cv ? cv.querySelector('.smart-document-content') : null;
  return s ? s.textContent.trim() : '';
});
// Poll until cond() holds (async IndexedDB writes must settle).
async function waitFor(cond, timeout = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await cond()) return true;
    await sleep(150);
  }
  return await cond();
}
// Direct IndexedDB record read through the raw store (storage verification).
const idbGet = (page, key) => page.evaluate(async (k) => {
  return await new Promise((res) => {
    try {
      const op = indexedDB.open('eq_smart_docs_db', 1);
      op.onsuccess = () => {
        const db = op.result;
        try {
          const tx = db.transaction('documents', 'readonly');
          const rq = tx.objectStore('documents').get(k);
          let got = null;
          rq.onsuccess = () => { got = rq.result || null; };
          tx.oncomplete = () => { db.close(); res(got ? got.value : null); };
          tx.onerror = () => { try { db.close(); } catch (e2) {} res(null); };
        } catch (e) { try { db.close(); } catch (e2) {} res(null); }
      };
      op.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}, key);

// ============================================================
// A) New Document — entry points exist, exactly one each, clean fast path
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  const counts = await page.evaluate(() => ({
    homeCard: document.querySelectorAll('.smart-doc-card[data-action="smart-new-doc"]').length,
    editorBtn: document.querySelectorAll('#smartNewDocBtn').length
  }));
  check('A1) Exactly ONE home "New Document" card', counts.homeCard === 1, JSON.stringify(counts));
  check('A2) Exactly ONE editor-header "New Document" button', counts.editorBtn === 1, JSON.stringify(counts));
  let s = await sv(page);
  check('A3) Fresh document is clean', s.dirty === false && s.editorVisible === true);
  await seedText(page, 'clean baseline');
  await page.evaluate(() => document.getElementById('smartSaveDraftBtn').click());
  await sleep(500);
  check('A4) Saved baseline is clean again', (await sv(page)).dirty === false);
  // Case A — clean document: New Document starts immediately, NO dialog.
  await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
  await sleep(450);
  const st = await dlgState(page);
  check('A5) CLEAN doc: New Document starts DIRECTLY (no dialog)',
    st.visible === false && st.mode === 'leave' &&
    (await page.evaluate(() => window.__smartBlank.getState().editorVisible)) === true, JSON.stringify(st));
  check('A6) New document body EMPTY (old content not carried over)', (await editorBody(page)) === '');
  check('A7) New doc name NOT carried over + state clean',
    (await page.evaluate(() => window.__smartDocName.get())) !== 'clean baseline' && (await sv(page)).dirty === false);
  check('A8) No JS errors (clean flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// B/C) Dirty document — dialog + three options; Cancel keeps everything
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, 'en');
  await seedText(page, 'Unsaved work');
  check('B1) Editing marks the document dirty', (await sv(page)).dirty === true);
  await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
  await sleep(350);
  const d = await dlgState(page);
  check('B2) DIRTY doc: New Document shows the unsaved-changes dialog',
    d.visible === true && d.mode === 'newdoc', JSON.stringify(d));
  check('B3) Dialog asks about UNSAVED CHANGES (not exit wording)',
    d.title.toLowerCase().indexOf('unsaved changes') !== -1, d.title);
  check('B4) Three options: Save&Continue / Start new / Cancel',
    d.save === 'Save and continue' && d.exit === 'Start new document' && d.cancel === 'Cancel',
    `${d.save} | ${d.exit} | ${d.cancel}`);
  check('B5) No duplicate dialogs (exactly one backdrop open)', d.openBackdrops === 1, String(d.openBackdrops));
  check('B6) Editor stays open while the dialog waits',
    (await page.evaluate(() => window.__smartSave.getState().editorVisible)) === true);
  // ---- Case B — Cancel keeps everything ----
  const before = await editorBody(page);
  await page.evaluate(() => document.getElementById('smartUnsavedCancelBtn').click());
  await sleep(300);
  const d2 = await dlgState(page);
  check('C1) Cancel closes the dialog', d2.visible === false && d2.mode === 'leave');
  check('C2) Cancel keeps the SAME content', (await editorBody(page)) === before, before);
  check('C3) Cancel keeps dirty = true', (await sv(page)).dirty === true);
  check('C4) Cancel did NO save and NO new document (still editing)',
    (await page.evaluate(() => window.__smartSave.getState().editorVisible)) === true);
  check('B7) No JS errors (dialog flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// D) Case C — Start New: no save, no lost drafts
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Keep Me Safe', 'SAVED BODY UNIQUE');
  await openSmartHome(page, 'en');
  await page.evaluate(() => document.querySelector('#smartDraftsList .smart-draft-item-resume').click());
  await sleep(700);
  check('D0) Resumed draft is clean on open', (await sv(page)).dirty === false);
  await seedText(page, 'EDITED BUT NOT SAVED');
  check('D1) Edited resumed draft is dirty', (await sv(page)).dirty === true);
  await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
  await sleep(350);
  check('D2) Dialog shown for the dirty resumed draft', (await dlgState(page)).visible === true);
  await page.evaluate(() => document.getElementById('smartUnsavedExitBtn').click()); // Start new
  await sleep(500);
  check('D3) Start New opens a FRESH empty document',
    (await editorBody(page)) === '' && (await sv(page)).dirty === false);
  check('D4) Old NAME not carried into the new document',
    (await page.evaluate(() => window.__smartDocName.get())) !== 'Keep Me Safe');
  const keys = await idbKeys(page);
  check('D5) Previously saved draft NOT deleted by Start New',
    keys.length === 1 && keys[0].name === 'Keep Me Safe', JSON.stringify(keys));
  const rec = await idbGet(page, keys[0] ? keys[0].key : '');
  check('D6) Saved record still holds the ORIGINAL body (not the edits)',
    !!rec && Array.isArray(rec.pages) && rec.pages.join('').includes('SAVED BODY UNIQUE') &&
    !rec.pages.join('').includes('EDITED BUT NOT SAVED'));
  check('D7) No JS errors (start-new flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// E) Case D+E — Save & Continue: ATOMIC save, then new document
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await cleanDrafts(page);
  await makeDraft(page, 'en', 'Atomic Doc', 'ATOMIC ORIGINAL BODY');
  await openSmartHome(page, 'en');
  await page.evaluate(() => document.querySelector('#smartDraftsList .smart-draft-item-resume').click());
  await sleep(700);
  await seedText(page, 'ATOMIC EDITED BODY');
  await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
  await sleep(350);
  check('E1) Dialog shown before starting the new document', (await dlgState(page)).visible === true);
  await page.evaluate(() => document.getElementById('smartUnsavedSaveBtn').click()); // Save & Continue
  const done = await waitFor(async () => {
    const mirror = await idbGet(page, 'draft');
    const keys = await idbKeys(page);
    return !!mirror && Array.isArray(mirror.pages) &&
      mirror.pages.join('').includes('ATOMIC EDITED BODY') &&
      keys.some((k) => k.name === 'Atomic Doc') && (await editorBody(page)) === '';
  });
  check('E2) Save completed durably BEFORE the new document started', done === true);
  check('E3) New document is empty + clean after Save & Continue',
    (await editorBody(page)) === '' && (await sv(page)).dirty === false);
  const keys = await idbKeys(page);
  check('E4) Old document in Your Drafts exactly ONCE (no duplicate)',
    keys.filter((k) => k.name === 'Atomic Doc').length === 1, JSON.stringify(keys.map((k) => k.name)));
  const entry = keys.find((k) => k.name === 'Atomic Doc');
  const rec = await idbGet(page, entry ? entry.key : '');
  check('E5) Saved copy holds the NEW edited version (real save)',
    !!rec && rec.pages.join('').includes('ATOMIC EDITED BODY'));
  check('E6) Draft index in sync with the document record',
    !!entry && !!rec && Math.abs((entry.savedAt || 0) - (rec.savedAt || 0)) < 50);
  check('E7) Large payload lives in IndexedDB, NOT localStorage',
    (await page.evaluate(() => window.__smartStorage.backend())) === 'indexeddb' &&
    (await page.evaluate(() => window.__smartStorage.localStorageHasDoc())) === false);
  check('E8) No JS errors (atomic save flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// F) Multiple drafts — independence
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await cleanDrafts(page);
  await makeDraft(page, 'ar', 'فاتورة أحمد', 'جسم الفاتورة الأصلي');
  await makeDraft(page, 'ar', 'عقد إيجار محمد', 'جسم العقد الأصلي');
  let keys = await idbKeys(page);
  check('F1) Two independent drafts exist',
    keys.length === 2 && keys.some((k) => k.name === 'عقد إيجار محمد') &&
    keys.some((k) => k.name === 'فاتورة أحمد'), JSON.stringify(keys.map((k) => k.name)));
  const rentKey = keys.find((k) => k.name === 'عقد إيجار محمد').key;
  await openSmartHome(page, 'ar');
  await page.evaluate((k) => {
    const btn = document.querySelector('#smartDraftsList .smart-draft-item[data-key="' + k + '"] .smart-draft-item-resume');
    btn.click();
  }, rentKey);
  await sleep(700);
  await seedText(page, 'تعديل غير محفوظ على العقد');
  await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
  await sleep(350);
  check('F2) Dialog shown for the edited rent contract', (await dlgState(page)).visible === true);
  await page.evaluate(() => document.getElementById('smartUnsavedSaveBtn').click());
  const ok = await waitFor(async () => {
    const rec = await idbGet(page, rentKey);
    return !!rec && rec.pages.join('').includes('تعديل غير محفوظ على العقد');
  });
  check('F3) Rent contract saved under its OWN key (no invoice overwrite)', ok === true);
  const invEntry = (await idbKeys(page)).find((k) => k.name === 'فاتورة أحمد');
  const invRec = await idbGet(page, invEntry ? invEntry.key : '');
  check('F4) Invoice draft completely UNTOUCHED',
    !!invRec && invRec.pages.join('').includes('جسم الفاتورة الأصلي') &&
    !invRec.pages.join('').includes('تعديل غير محفوظ على العقد'));
  keys = await idbKeys(page);
  check('F5) Both drafts still listed independently after Save & Continue',
    keys.filter((k) => k.name === 'عقد إيجار محمد').length === 1 &&
    keys.filter((k) => k.name === 'فاتورة أحمد').length === 1, JSON.stringify(keys.map((k) => k.name)));
  check('F6) New current document is independent (fresh + clean)',
    (await editorBody(page)) === '' && (await sv(page)).dirty === false);
  check('F7) No JS errors (multiple-drafts flow)', errs.length === 0, errs.join(' | ').slice(0, 140));
  await page.close();
}

// ============================================================
// G) RTL / LTR — all seven languages fully localized
// ============================================================
for (const c of [
  { key: 'ar', rtl: true, titlePart: 'غير محفوظة', save: 'حفظ والمتابعة', start: 'بدء مستند جديد', cancel: 'إلغاء' },
  { key: 'en', rtl: false, titlePart: 'unsaved changes', save: 'Save and continue', start: 'Start new document', cancel: 'Cancel' },
  { key: 'fr', rtl: false, titlePart: 'non enregistrées', save: 'Enregistrer et continuer', start: 'Créer un nouveau document', cancel: 'Annuler' },
  { key: 'es', rtl: false, titlePart: 'sin guardar', save: 'Guardar y continuar', start: 'Iniciar un documento nuevo', cancel: 'Cancelar' },
  { key: 'ru', rtl: false, titlePart: 'несохранённые изменения', save: 'Сохранить и продолжить', start: 'Создать новый документ', cancel: 'Отмена' },
  { key: 'de', rtl: false, titlePart: 'nicht gespeicherte Änderungen', save: 'Speichern und fortfahren', start: 'Neues Dokument starten', cancel: 'Abbrechen' },
  { key: 'tr', rtl: false, titlePart: 'Kaydedilmemiş değişiklikleriniz', save: 'Kaydet ve devam et', start: 'Yeni belge başlat', cancel: 'İptal' }
]) {
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await openBlank(page, c.key);
  await seedText(page, 'i18n probe');
  await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
  await sleep(350);
  const d = await dlgState(page);
  const dir = await page.evaluate(() =>
    getComputedStyle(document.getElementById('smartUnsavedModal')).direction);
  check(`G-${c.key}) Dialog direction ${c.rtl ? 'RTL' : 'LTR'}`, dir === (c.rtl ? 'rtl' : 'ltr'), dir);
  check(`G-${c.key}) Title mentions unsaved changes`, d.title.indexOf(c.titlePart) !== -1, d.title);
  check(`G-${c.key}) Three options fully localized`,
    d.save === c.save && d.exit === c.start && d.cancel === c.cancel,
    `${d.save} | ${d.exit} | ${d.cancel}`);
  check(`G-${c.key}) No JS errors`, errs.length === 0, errs.join(' | ').slice(0, 120));
  await page.close();
}

// ============================================================
// H) Responsive — 1280 / 768 / 430 / 390 / 360 (RTL + LTR)
// ============================================================
for (const vp of [
  { name: 'Desktop 1280', width: 1280, height: 800 },
  { name: 'Tablet 768', width: 768, height: 1024 },
  { name: 'Mobile 430', width: 430, height: 900 },
  { name: 'iPhone 390', width: 390, height: 844 },
  { name: 'Android 360', width: 360, height: 800 }
]) {
  {
    const { page, errs } = await newPage({ width: vp.width, height: vp.height });
    await openBlank(page, 'ar'); // RTL worst case (longest labels)
    await seedText(page, 'responsive');
    await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
    await sleep(400);
    const r = await page.evaluate(() => {
      const b = document.querySelector('#smartUnsavedModal.show');
      const m = b ? b.querySelector('.smart-unsaved-modal') : null;
      const box = m ? m.getBoundingClientRect() : null;
      const btns = Array.from(document.querySelectorAll(
        '#smartUnsavedSaveBtn,#smartUnsavedExitBtn,#smartUnsavedCancelBtn')).map((x) => x.getBoundingClientRect());
      return {
        shown: !!b,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        fits: box ? (box.width <= window.innerWidth + 1 && box.height <= window.innerHeight + 1) : false,
        tapOk: btns.length === 3 && btns.every((r2) => r2.height >= 30),
        inView: btns.every((r2) => r2.left >= -1 && r2.right <= window.innerWidth + 1)
      };
    });
    check(`${vp.name} RTL) dialog shown, zero horizontal overflow`, r.shown && r.overflow <= 1, String(r.overflow));
    check(`${vp.name} RTL) dialog fits the viewport`, r.fits);
    check(`${vp.name} RTL) 3 tappable buttons fully in view`, r.tapOk && r.inView);
    check(`${vp.name} RTL) no JS errors`, errs.length === 0, errs.join(' | ').slice(0, 120));
    await page.close();
  }
  {
    const { page, errs } = await newPage({ width: vp.width, height: vp.height });
    await openBlank(page, 'en');
    await seedText(page, 'ltr responsive');
    await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
    await sleep(400);
    const shown = await page.evaluate(() => !!document.querySelector('#smartUnsavedModal.show'));
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${vp.name} LTR) dialog shown, zero horizontal overflow`, shown && ov <= 1, String(ov));
    check(`${vp.name} LTR) no JS errors`, errs.length === 0, errs.join(' | ').slice(0, 120));
    await page.close();
  }
}

// ============================================================
// I) Stability + regression guard (Calculator / Notes unaffected)
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  check('I1) No JS errors on load', errs.length === 0, errs.join(' | ').slice(0, 140));
  await openBlank(page, 'en');
  await seedText(page, 'stability probe');
  await page.evaluate(() => document.getElementById('smartNewDocBtn').click());
  await sleep(300);
  await page.evaluate(() => document.getElementById('smartUnsavedCancelBtn').click());
  await sleep(250);
  await page.evaluate(() => document.getElementById('closeSmartDocs').click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="9"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="+"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.number[data-value="1"]').click());
  await page.evaluate(() => document.querySelector('.keypad-btn.equals').click());
  await sleep(250);
  check('I2) Calculator works (9+1=10)',
    (await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim())) === '10');
  await openDrawer(page);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await sleep(400);
  check('I3) Notes still opens',
    await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));
  const dg = await page.evaluate(() => window.__dialogs);
  check('I4) alert()/confirm()/prompt() count = 0 everywhere',
    dg.alert === 0 && dg.confirm === 0 && dg.prompt === 0, JSON.stringify(dg));
  check('I5) Zero JS errors in the stability sweep', errs.length === 0, errs.join(' | ').slice(0, 160));
  await page.close();
}

await browser.close();
server.close();
const fails = results.filter((r) => !r.ok).length;
fs.appendFileSync(OUT, `DONE ${results.length - fails}/${results.length} PASS\n`);
console.log(`DONE ${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);
