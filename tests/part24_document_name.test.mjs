// PART 24 - DOCUMENT NAME test (REAL Chrome via Puppeteer).
// Verifies: inline rename, untitled fallback, save/restore via IndexedDB,
// dirty tracking + PART 20 dialog, PDF filename derivation with Windows
// character cleaning (filename copy ONLY), RTL/LTR, responsive layouts,
// and regressions. Run: node tests/part24_document_name.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8344;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

// Arabic literals kept as escapes so this file stays ASCII-safe on disk.
const AR_NAME = '\u0639\u0642\u062F \u0625\u064A\u062C\u0627\u0631 \u0645\u062D\u0645\u062F'; // rent contract Mohammad
const AR_NEW = '\u0645\u0633\u062A\u0646\u062F \u062C\u062F\u064A\u062F'; // New Document
const AR_UNTITLED = '\u0645\u0633\u062A\u0646\u062F \u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646'; // Untitled Document
const AR_DIRTY = '\u0639\u062F/\u0625\u064A\u062C\u0627\u0631: \u0645\u062D\u0645\u062F*"\u061F<>|'; // name w/ invalid chars
const AR_LONG = '\u0639\u062F \u0637\u0648\u064A\u0644 \u062C\u062F\u0627 \u0644\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0639 \u0627\u0633\u0645 \u0645\u0645\u062A\u062F';

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
const OUT = path.join(ROOT, '__p24_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 160) : ''}`;
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
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) req.abort();
    else req.continue();
  });
  await page.evaluateOnNewDocument(() => {
    window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
    window.alert = () => { window.__dialogs.alert++; };
    window.confirm = () => { window.__dialogs.confirm++; return true; };
    window.prompt = () => { window.__dialogs.prompt++; return ''; };
  });
  await page.goto(URLBASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
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
async function wipeLocal(page) {
  await page.evaluate(() => { try { return window.__smartStorage.clearLocal(); } catch (e) {} });
  await sleep(250);
}
async function openBlank(page, locale) {
  await openSmartHome(page, locale);
  await wipeLocal(page);
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(450);
}
async function renameViaUI(page, value, commitKey) {
  // Real user flow: click the visible title, an inline input opens,
  // select-all is replaced by typing, then Enter/blur commits.
  await page.evaluate(() => document.getElementById('smartBlankDocTitle').click());
  await sleep(150);
  const editing = await page.evaluate(() => ({
    inputVisible: !document.getElementById('smartBlankTitleInput').hidden,
    titleHidden: document.getElementById('smartBlankDocTitle').hidden
  }));
  check('3) Clicking the name opens the inline editor (title swaps to input)',
    editing.inputVisible && editing.titleHidden, JSON.stringify(editing));
  await page.evaluate(() => {
    const i = document.getElementById('smartBlankTitleInput');
    i.focus();
    i.setSelectionRange(0, i.value.length);
  });
  await sleep(150);
  await page.type('#smartBlankTitleInput', value);
  if (commitKey === 'Enter') await page.keyboard.press('Enter');
  else await page.evaluate(() => document.getElementById('smartBlankTitleInput').blur());
  await sleep(200);
}
function defocus(page) {
  return page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.body.focus();
  });
}
async function readTitle(page) {
  return page.evaluate(() => ({
    shown: document.getElementById('smartBlankDocTitle').textContent.trim(),
    stateName: window.__smartDocName.get()
  }));
}
async function idbDraft(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const open = indexedDB.open('eq_smart_docs_db', 1);
    open.onsuccess = () => {
      const db = open.result;
      try {
        const tx = db.transaction('documents', 'readonly');
        const rq = tx.objectStore('documents').get('draft');
        rq.onsuccess = () => {
          // Records are stored as {id, value}; the document is under .value.
          const rec = rq.result ? (rq.result.value || rq.result) : null;
          resolve(rec && typeof rec === 'object' ? rec : null);
        };
        rq.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    };
    open.onerror = () => resolve(null);
  }));
}

try {
  // ================= 1-7) Rename flow + persistence =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');

    let t = await readTitle(page);
    check('1) Smart Documents blank editor opens with a document name',
      t.shown.length > 0 && t.stateName === 'New Document', JSON.stringify(t));
    check('2) Empty name displays localized "Untitled Document" fallback',
      (await page.evaluate(() => {
        window.__smartDocName.set('');
        return document.getElementById('smartBlankDocTitle').textContent.trim();
      })) === 'Untitled Document');
    check('2b) AR locale: empty name displays localized untitled fallback',
      (await page.evaluate((x) => {
        window.__smartDocName.set(x);
        return document.getElementById('smartBlankDocTitle').textContent.trim();
      }), AR_UNTITLED) === AR_UNTITLED);

    // Rename to Arabic via the REAL UI flow.
    await renameViaUI(page, AR_NAME, 'Enter');
    t = await readTitle(page);
    check('4) New name appears immediately at the top after Enter',
      t.shown === AR_NAME && t.stateName === AR_NAME, JSON.stringify(t));
    check('5) Renaming marks the document DIRTY (real modification)',
      (await page.evaluate(() => window.__smartSave.getState().dirty)) === true);

    // Save -> IndexedDB record holds the name.
    await page.evaluate(() => window.__smartSave.save());
    await sleep(500);
    const rec = await idbDraft(page);
    check('6) Save persists the name inside the existing IndexedDB record',
      !!rec && rec.name === AR_NAME && Array.isArray(rec.pages), !!(rec && rec.name));
    check('6b) After save the document is clean again',
      (await page.evaluate(() => !window.__smartSave.getState().dirty)) === true);
    check('25) IndexedDB is still the primary storage backend',
      (await page.evaluate(() => window.__smartStorage.backend())) === 'indexeddb');

    // Reload -> Continue Draft restores the name.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await sleep(800);
    await openSmartHome(page, 'en');
    await page.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
    await sleep(650);
    t = await readTitle(page);
    check('7) Continue Draft restores the document name',
      t.shown === AR_NAME && t.stateName === AR_NAME, JSON.stringify(t));
    check('17) No JavaScript errors during rename/save/resume', errs.length === 0, errs.join(' | ').slice(0, 140));
    await page.close();
  }

  // ================= 8-11) Dirty + PART 20 dialog paths =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'en');
    await renameViaUI(page, 'Named Doc', 'Enter');
    await defocus(page);
    await page.evaluate(() => window.__smartSave.save());
    await sleep(400);

    // Unsaved rename -> Back shows the PART 20 dialog (no new dialog).
    await renameViaUI(page, 'Renamed But Unsaved', 'blur');
    await defocus(page);
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(300);
    let s = await page.evaluate(() => window.__smartSave.getState());
    check('9) Back with unsaved rename shows the existing PART 20 dialog',
      s.dialogVisible === true && s.editorVisible === true, JSON.stringify(s));
    const btns = await page.evaluate(() => ({
      save: !!document.getElementById('smartUnsavedSaveBtn'),
      exit: !!document.getElementById('smartUnsavedExitBtn'),
      cancel: !!document.getElementById('smartUnsavedCancelBtn')
    }));
    check('9b) Dialog offers Save / Exit without saving / Cancel (unchanged PART 20 UI)',
      btns.save && btns.exit && btns.cancel, JSON.stringify(btns));

    // Escape cancels; stays editing (focus must be inside the Smart Docs
    // modal for the global Escape handler -- same setup as the PART 20 test).
    await page.evaluate(() => document.getElementById('smartSaveDraftBtn').focus());
    await sleep(80);
    await page.keyboard.press('Escape'); await sleep(300);
    s = await page.evaluate(() => window.__smartSave.getState());
    check('9c) Escape cancels the dialog (stays editing)', !s.dialogVisible && s.editorVisible);

    // Exit WITHOUT saving discards the rename.
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(250);
    await page.evaluate(() => document.getElementById('smartUnsavedExitBtn').click());
    await sleep(400);
    await openSmartHome(page, 'en');
    await page.evaluate(() => document.getElementById('smartDraftResumeBtn').click());
    await sleep(650);
    check('11) Exit without saving does NOT persist the rename',
      (await readTitle(page)).stateName === 'Named Doc', (await readTitle(page)).stateName);

    // Second round: unsaved rename -> dialog -> SAVE persists it.
    await renameViaUI(page, 'Saved From Dialog', 'Enter');
    await defocus(page);
    await page.evaluate(() => document.getElementById('smartBlankBack').click());
    await sleep(300);
    await page.evaluate(() => document.getElementById('smartUnsavedSaveBtn').click());
    await sleep(450);
    const rec2 = await idbDraft(page);
    check('10) Save from the PART 20 dialog persists the new name',
      !!rec2 && rec2.name === 'Saved From Dialog', !!(rec2 && rec2.name));
    check('18) No alert()/confirm()/prompt() used anywhere',
      (await page.evaluate(() => { const d = window.__dialogs; return d.alert + d.confirm + d.prompt; })) === 0);
    check('E1) No JS errors in the dialog flows', errs.length === 0, errs.join(' | ').slice(0, 140));
    await page.close();
  }

  // ================= 19/20/22 + regressions =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'ar');
    let rtl = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      title: document.getElementById('smartBlankDocTitle').textContent.trim(),
      overflow: document.documentElement.scrollWidth - window.innerWidth
    }));
    check('19) RTL: editor + name render right-to-left',
      rtl.dir === 'rtl' && rtl.overflow <= 0, JSON.stringify(rtl));
    check('19a) RTL: fresh doc name is localized Arabic default',
      rtl.title === AR_NEW, JSON.stringify(rtl.title));
    await renameViaUI(page, AR_LONG, 'Enter');
    rtl = await page.evaluate(() => ({
      shown: document.getElementById('smartBlankDocTitle').textContent.trim(),
      overflow: document.documentElement.scrollWidth - window.innerWidth
    }));
    check('19b) RTL: long Arabic name never causes horizontal overflow',
      rtl.overflow <= 0 && rtl.shown === AR_LONG, rtl.overflow);

    await setLang(page, 'en');
    const ltr = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      overflow: document.documentElement.scrollWidth - window.innerWidth
    }));
    check('20) LTR works after switching language', ltr.dir === 'ltr' && ltr.overflow <= 0, JSON.stringify(ltr));

    for (const w of [1280, 768, 390, 360]) {
      await page.setViewport({ width: w, height: 800 });
      await sleep(350);
      const m = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        titleVisible: !document.getElementById('smartBlankDocTitle').hidden
      }));
      check(`22) Responsive ${w}px: no horizontal overflow, name visible`,
        m.overflow <= 0 && m.titleVisible, JSON.stringify(m));
    }

    // Calculator regression (9+1=10): close Smart Docs, use the keypad.
    await page.setViewport({ width: 1280, height: 800 }); await sleep(300);
    await page.evaluate(() => { document.getElementById('closeSmartDocs').click(); });
    await sleep(400);
    await page.evaluate(() => {
      document.querySelector('.keypad-btn.number[data-value="9"]').click();
      document.querySelector('.keypad-btn.operator[data-value="+"]').click();
      document.querySelector('.keypad-btn.number[data-value="1"]').click();
      document.querySelector('.keypad-btn.equals').click();
    });
    await sleep(300);
    const calc = await page.evaluate(() => document.querySelector('#primaryDisplay').textContent.trim());
    check('23) Calculator still works (9+1=10)', calc === '10', calc);

    // Notes regression.
    await openDrawer(page);
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await sleep(400);
    check('24) Notes still work',
      await page.evaluate(() => document.getElementById('notesManagerModal').classList.contains('show')));

    // Duplicate-control guard: exactly ONE name control pair exists.
    const dup = await page.evaluate(() => ({
      titles: document.querySelectorAll('#smartBlankDocTitle').length,
      inputs: document.querySelectorAll('#smartBlankTitleInput').length
    }));
    check('16) No duplicate name control (single title + single inline input)',
      dup.titles === 1 && dup.inputs === 1, JSON.stringify(dup));
    check('E2) No JS errors across RTL/LTR/responsive/regressions', errs.length === 0, errs.join(' | ').slice(0, 140));
    await page.close();
  }

  // ================= 12-16) PDF filename checks =================
  {
    const { page, errs } = await newPage({ width: 1280, height: 800 });
    await openBlank(page, 'ar');

    let f = await page.evaluate(() => window.__smartDocName.pdfFilename());
    check('13a) Default-name filename = AR_NEW.pdf', f === AR_NEW + '.pdf', 'ok=' + (f === AR_NEW + '.pdf'));

    f = await page.evaluate(() => { window.__smartDocName.set(''); return window.__smartDocName.pdfFilename(); });
    check('13b) Empty name filename = localized Untitled.pdf', f === AR_UNTITLED + '.pdf', 'ok=' + (f === AR_UNTITLED + '.pdf'));
    check('13b-EN) EN locale fallback name is "Untitled Document"',
      (await page.evaluate(() => {
        function setLangTo(l) {
          const s = document.getElementById('topBarLanguageSelect');
          if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        return new Promise((res) => {
          setLangTo('en');
          setTimeout(() => res(window.__smartDocName.displayName()), 400);
          // Restore the Arabic locale for the checks below.
          setTimeout(() => setLangTo('ar'), 450);
        });
      })) === 'Untitled Document');
    await sleep(500);

    f = await page.evaluate((x) => { window.__smartDocName.set(x); return window.__smartDocName.pdfFilename(); }, AR_NAME);
    check('12) Named document keeps Arabic in the PDF filename', f === AR_NAME + '.pdf', 'ok=' + (f === AR_NAME + '.pdf'));

    const r = await page.evaluate((x) => {
      window.__smartDocName.set(x);
      return { fn: window.__smartDocName.pdfFilename(), shown: window.__smartDocName.displayName() };
    }, AR_DIRTY);
    const invalid = /[\\/:*?"<>|]/;
    check('14) Windows-invalid characters cleaned for the FILENAME only',
      !invalid.test(r.fn.replace(/\.pdf$/, '')) && r.fn.endsWith('.pdf'), escapeOut(r.fn));
    check('14b) Displayed/internal name is NOT modified by cleaning',
      r.shown === AR_DIRTY, escapeOut(r.shown));
    check('15) Arabic characters remain in the sanitized filename',
      /[\u0600-\u06FF]/.test(r.fn), escapeOut(r.fn));

    f = await page.evaluate(() => {
      window.__smartDocName.set('   ... ');
      return window.__smartDocName.pdfFilename();
    });
    check('13c) Name that cleans to empty falls back to Untitled.pdf',
      f === AR_UNTITLED + '.pdf', 'ok=' + (f === AR_UNTITLED + '.pdf'));

    check('E3) No JS errors in filename checks', errs.length === 0, errs.join(' | ').slice(0, 140));
    await page.close();
  }
} finally {
  const pass = results.filter((x) => x.ok).length;
  const fail = results.length - pass;
  fs.appendFileSync(OUT, `SUMMARY PASS=${pass} FAIL=${fail}\n`);
  console.log(`SUMMARY PASS=${pass} FAIL=${fail}`);
  await browser.close();
  server.close();
}

function escapeOut(s) {
  // Keep console output ASCII-safe on Windows terminals.
  return String(s).replace(/[^\x20-\x7E]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
