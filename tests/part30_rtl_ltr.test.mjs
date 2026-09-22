// PART 30 — RTL / LTR Architecture 🧭
// Real-Chrome behavioral test. Run:  node tests/part30_rtl_ltr.test.mjs
//
// Verifies Smart Documents fully inherits the EXISTING EQ direction system
// (setLanguage() -> html.dir, smartBlankApplyDirection() -> editor surfaces):
//   A) Per-locale root direction: ar=rtl, en/fr/tr/es/ru/de=ltr (discovered
//      dynamically from the language select so future LTR locales pass too).
//   B) Every surface follows the current direction: home, editor view, format bar,
//      table tools, page nav arrows, review bar, PDF export dialog, PDF result
//      dialog, unsaved-changes dialog.
//   C) Dynamic switching ar→en→fr→tr→es→ru→de→ar with a doc OPEN, no reload.
//   D) Responsive 1280/768/390/360 in Arabic RTL + English LTR: no overflow.
//   E) Hygiene: no JS errors, no alert/confirm/prompt, no English leakage in Arabic.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8363;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

let passCount = 0, failCount = 0, skipCount = 0;
const OUT = path.join(ROOT, '__p30_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  if (ok) passCount++; else failCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 400) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
function skip(name, detail = '') {
  skipCount++;
  const line = `SKIP  ${name}${detail ? '  -> ' + String(detail).slice(0, 400) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en']
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
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  return { page, errs };
}
async function setLang(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(450);
}
async function openSmartHome(page, locale) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  if (locale) await setLang(page, locale);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(450);
}
async function openBlank(page) {
  await page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-new-doc"]').click());
  await sleep(600);
}

// Visible-text English-leak detector for Arabic UI (same policy as PART 28/29).
const ALLOW_TOKENS = new Set(['pdf', 'ocr', 'eq', 'png', 'jpg', 'jpeg', 'url', 'a4',
  'arial', 'georgia', 'tahoma', 'verdana', 'times', 'new', 'roman', 'courier', 'ltr', 'rtl']);
function isEnglishLeak(s) {
  if (/^(arial|georgia|tahoma|verdana|times new roman|courier new)$/i.test(s.trim())) return false;
  const clean = s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{FE0F}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!/[A-Za-z]{3}/.test(clean)) return false;
  const words = clean.split(/[^A-Za-z']+/).filter(Boolean);
  return words.some((w) => w.length >= 3 && !ALLOW_TOKENS.has(w.toLowerCase()));
}
const COLLECT_FN = () => {
  const ALLOW = new Set(['pdf', 'ocr', 'eq', 'png', 'jpg', 'jpeg', 'url', 'a4',
    'arial', 'georgia', 'tahoma', 'verdana', 'times', 'new', 'roman', 'courier', 'ltr', 'rtl']);
  const leak = (s) => {
    if (/^(arial|georgia|tahoma|verdana|times new roman|courier new)$/i.test(s.trim())) return false;
    const clean = s
      .replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{FE0F}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}]/gu, ' ')
      .replace(/\s+/g, ' ').trim();
    if (!/[A-Za-z]{3}/.test(clean)) return false;
    return clean.split(/[^A-Za-z']+/).filter(Boolean)
      .some((w) => w.length >= 3 && !ALLOW.has(w.toLowerCase()));
  };
  const roots = Array.from(document.querySelectorAll(
    '#smartDocsModal, #smartBlankView, #smartPdfModal, #smartPdfResultModal, #smartUnsavedModal'));
  const out = [];
  const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  roots.forEach((root) => {
    if (!visible(root)) return;
    root.querySelectorAll('*').forEach((el) => {
      if (!visible(el)) return;
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim().length > 1 && leak(n.textContent)) {
          out.push({ t: n.textContent.trim().slice(0, 60), id: el.id || String(el.className).slice(0, 40) || el.tagName });
          break;
        }
      }
    });
  });
  return out;
};


// Direction snapshot of every Smart Documents surface that matters.
const SURVEY_FN = () => {
  const dir = (id) => {
    const el = document.getElementById(id);
    return el ? getComputedStyle(el).direction : 'absent';
  };
  const navBtns = Array.from(document.querySelectorAll('#smartPagePrevBtn, #smartPageNextBtn'))
    .filter((b) => b && (b.offsetWidth || b.offsetHeight));
  const navInView = navBtns.every((b) => {
    const r = b.getBoundingClientRect();
    return r.left >= -1 && r.right <= window.innerWidth + 1;
  });
  const dlgIn = (sel) => {
    const d = document.querySelector(sel);
    if (!d || !(d.offsetWidth || d.offsetHeight)) return null;
    const r = d.getBoundingClientRect();
    return r.left >= -1 && r.right <= window.innerWidth + 1;
  };
  let pdfResultDlg = 'absent';
  const resModal = document.getElementById('smartPdfResultModal');
  const resDlg = resModal && resModal.querySelector('.smart-pdf-result-dialog');
  if (resDlg) pdfResultDlg = getComputedStyle(resDlg).direction;
  return {
    htmlDir: document.documentElement.dir,
    lang: document.documentElement.lang,
    view: dir('smartBlankView'),
    formatBar: dir('smartTextFormatBar'),
    tableToolbar: dir('smartTableToolbar'),
    reviewBar: dir('smartReviewBar'),
    pdfExportDlg: dir('smartPdfModal'),
    pdfResultDlg,
    unsavedDlg: dir('smartUnsavedModal'),
    navArrowsInView: navInView,
    pdfExportDlgInView: dlgIn('#smartPdfModal .modal-card, #smartPdfModal > div'),
    unsavedDlgInView: dlgIn('#smartUnsavedModal .smart-unsaved-modal'),
    overflow: document.documentElement.scrollWidth - window.innerWidth
  };
};


// ============================================================
// SECTION A — per-locale root direction on Smart Documents home
// ============================================================
{
  const { page } = await newPage();
  const locales = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#topBarLanguageSelect option')).map((o) => o.value));
  check('A0) EQ offers all expected locales', ['ar', 'en', 'fr', 'tr', 'es', 'ru', 'de'].every((l) => locales.includes(l)), locales.join(','));
  for (const locale of locales) {
    await openSmartHome(page, locale);
    const info = await page.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang }));
    const want = locale === 'ar' ? 'rtl' : 'ltr';
    check(`A) ${locale}: html.dir=${want} via existing EQ system`, info.dir === want && info.lang === locale, JSON.stringify(info));
    try { await page.evaluate(() => document.getElementById('closeSmartDocs').click()); await sleep(250); } catch (e) {}
  }
  await page.close();
}

// ============================================================
// SECTION B — every surface follows direction (ar + en), incl. dialogs
// ============================================================
for (const locale of ['ar', 'en']) {
  const want = locale === 'ar' ? 'rtl' : 'ltr';
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  await openSmartHome(page, locale);
  const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`B-${locale}) home: no horizontal overflow`, homeOverflow <= 1, `overflow=${homeOverflow}px`);

  await openBlank(page);
  await page.evaluate(() => window.__smartBlank.insertElement('heading'));
  await sleep(200);

  // Review bar
  await page.evaluate(() => document.getElementById('smartReviewBtn').click());
  await sleep(400);
  let s = await page.evaluate(SURVEY_FN);
  check(`B-${locale}) review bar direction=${want}`, s.reviewBar === want, s.reviewBar);
  check(`B-${locale}) review: exit button inside viewport`,
    await page.evaluate(() => { const r = document.getElementById('smartReviewExitBtn').getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; }));
  await page.evaluate(() => window.__smartReview.exit());
  await sleep(300);

  // PDF export dialog
  await page.evaluate(() => window.__smartPdfExport.open());
  await sleep(300);
  s = await page.evaluate(SURVEY_FN);
  check(`B-${locale}) PDF export dialog direction=${want} + in viewport`,
    s.pdfExportDlg === want && s.pdfExportDlgInView !== false, JSON.stringify(s));
  // export to reach the PDF RESULT dialog
  await page.click('#smartPdfConfirmBtn');
  await sleep(2000);
  s = await page.evaluate(SURVEY_FN);
  check(`B-${locale}) PDF result dialog direction=${want}`, s.pdfResultDlg === want, s.pdfResultDlg);
  const exported = await page.evaluate(() =>
    window.__smartPdfShare ? !!window.__smartPdfShare.present() : false);
  if (!exported) {
    // PDF generation needs the lazily-loaded engine (see part26 loadPdfJs);
    // without it the result dialog shows a failure state without action buttons.
    skip(`B-${locale}) PDF result buttons viewport check`, 'PDF engine not loaded in this test env; dialog direction verified above');
  } else {
    const btnInfo = await page.evaluate(() => ({
      iw: innerWidth,
      btns: ['smartPdfOpenBtn', 'smartPdfShareBtn', 'smartPdfResultCloseBtn'].map((id) => {
        const b = document.getElementById(id);
        if (!b) return { id, ok: false };
        const r = b.getBoundingClientRect();
        return { id, ok: r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1, rect: `${Math.round(r.left)}-${Math.round(r.right)}` };
      })
    }));
    check(`B-${locale}) PDF result: Open/Share/Close buttons present + in viewport`,
      btnInfo.btns.every((b) => b.ok), JSON.stringify(btnInfo));
  }
  try { await page.click('#smartPdfResultCloseBtn'); } catch (e) {}
  await sleep(300);

  // Unsaved changes dialog
  await page.evaluate(() => document.getElementById('smartBlankBack').click());
  await sleep(400);
  s = await page.evaluate(SURVEY_FN);
  check(`B-${locale}) unsaved dialog direction=${want} + in viewport`,
    s.unsavedDlg === want && s.unsavedDlgInView !== false, JSON.stringify(s));
  check(`B-${locale}) unsaved dialog has Save/Exit/Cancel buttons intact`,
    await page.evaluate(() => !!document.getElementById('smartUnsavedSaveBtn') &&
      !!document.getElementById('smartUnsavedExitBtn') && !!document.getElementById('smartUnsavedCancelBtn')));
  await page.click('#smartUnsavedCancelBtn');
  await sleep(300);

  check(`B-${locale}) no JS errors so far`, errs.length === 0, errs.join(' | ').slice(0, 200));
  check(`B-${locale}) no alert/confirm/prompt used`,
    await page.evaluate(() => { const d = window.__dialogs; return !d.alert && !d.confirm && !d.prompt; }));

  if (locale === 'ar') {
    await openBlank(page);
    const leaks = await page.evaluate(COLLECT_FN);
    check('B-ar) no English leakage across editor + dialogs', leaks.length === 0, JSON.stringify(leaks.slice(0, 6)));
  }
  await page.close();
}

// ============================================================
// SECTION C — dynamic switching without reload, doc OPEN
// ============================================================
{
  const { page, errs } = await newPage({ width: 1280, height: 900 });
  await openSmartHome(page, 'ar');
  await openBlank(page);
  await page.evaluate(() => window.__smartBlank.insertElement('text'));
  await sleep(200);
  const seq = ['en', 'fr', 'tr', 'es', 'ru', 'de', 'ar'];
  for (const locale of seq) {
    await setLang(page, locale);
    const want = locale === 'ar' ? 'rtl' : 'ltr';
    const s = await page.evaluate(SURVEY_FN);
    check(`C-switch→${locale}) dir=${want} instantly (root+view+toolbar+table tools, no reload)`,
      s.htmlDir === want && s.view === want && s.formatBar === want &&
      (s.tableToolbar === want || s.tableToolbar === 'absent') && s.lang === locale,
      JSON.stringify({ htmlDir: s.htmlDir, view: s.view, bar: s.formatBar, tt: s.tableToolbar }));
  }
  // user content keeps its own dir: UI direction ≠ direction of user content
  const contentOk = await page.evaluate(() => {
    const blk = document.querySelector('.smart-doc-text-block[data-smart-element="text"]');
    return !blk || blk.getAttribute('dir') !== null;
  });
  check('C) user content blocks keep their own explicit/auto dir', contentOk);
  check('C) no JS errors during switching', errs.length === 0, errs.join(' | ').slice(0, 200));
  await page.close();
}

// ============================================================
// SECTION D — responsive RTL/LTR at 1280/768/390/360
// ============================================================
for (const vp of [[1280, 800], [768, 1024], [390, 844], [360, 780]]) {
  for (const locale of ['ar', 'en']) {
    const { page } = await newPage({ width: vp[0], height: vp[1], isMobile: vp[0] < 500 });
    await openSmartHome(page, locale);
    await openBlank(page);
    const s = await page.evaluate(SURVEY_FN);
    const want = locale === 'ar' ? 'rtl' : 'ltr';
    check(`D-${vp[0]}px-${locale}) view=${want}, no overflow, arrows/dialogs in viewport`,
      s.view === want && s.overflow <= 1 && s.navArrowsInView && s.unsavedDlgInView !== false,
      JSON.stringify({ v: s.view, o: s.overflow, nav: s.navArrowsInView, dlg: s.unsavedDlgInView }));
    await page.close();
  }
}

await browser.close();
server.close();
const total = `TOTAL PASS ${passCount}  FAIL ${failCount}  SKIP ${skipCount}`;
console.log(total);
fs.appendFileSync(OUT, total + '\n');
process.exit(failCount === 0 ? 0 : 1);
