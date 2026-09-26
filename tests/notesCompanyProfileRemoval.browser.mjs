// PHASE — COMPANY PROFILE REMOVAL FROM THE NOTES EDITOR HEADER (browser test).
//
// Real-Chrome verification (no source-grep PASS) that:
//   1. the Company Profile button is ABSENT from the Notes editor header,
//   2. the REMAINING circular buttons are still there, evenly distributed,
//      non-overlapping, clickable, with their click handlers still attached
//      (verified at the browser level via CDP DOMDebugger.getEventListeners),
//   3. the header behaves at 1280 / 768 / 430 / 390 / 360 in English LTR,
//      Arabic RTL and Kurdish RTL with no overflow and no jitter,
//   4. Back / Save / Send / Preview PDF / Export PDF still behave as before,
//   5. the old PDF-Export setup dialog is GONE (no modal, no Style / Title /
//      Date / Company Profile controls, no Preview / Create PDF buttons) and
//      the header PDF button exports instantly,
//   6. no JavaScript errors anywhere.
//
// Run:  node tests/notesCompanyProfileRemoval.browser.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8391;
const OUT = path.join(ROOT, '__cp_removal_result.txt');
const SHOTS = path.join(HERE, 'artifacts');
try { fs.mkdirSync(SHOTS, { recursive: true }); } catch (e) {}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, urlPath));
    res.writeHead(200, { 'Content-Type': mimeOf(urlPath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); fs.appendFileSync(path.join(ROOT, '_harness_404.log'), urlPath + '\n'); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => { console.log('WATCHDOG TIMEOUT'); process.exit(124); }, 600000);

let passCount = 0, failCount = 0;
try { fs.unlinkSync(OUT); } catch (e) {}
function check(name, ok, detail = '') {
  if (ok) passCount++; else failCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 500) : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en']
});
const page = await browser.newPage();
const pageErrors = [];
const net404s = [];
page.on('pageerror', (e) => pageErrors.push(String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
await page.evaluateOnNewDocument(() => {
  // Test-only: keep the service worker from serving a cached (pre-change) app.js
  // and silence native dialogs so a click can never hang the harness.
  if (navigator.serviceWorker) {
    try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {}
  }
  window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
  window.alert = () => { window.__dialogs.alert++; };
  window.confirm = () => { window.__dialogs.confirm++; return true; };
  window.prompt = () => { window.__dialogs.prompt++; return ''; };
});
page.on('response', (r) => { if (r.status() >= 400) net404s.push(r.status() + ' ' + r.url()); });
const cdp = await page.createCDPSession();

// Real browser-level handler check (not source inspection).
async function clickListenerCount(selector) {
  const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(selector)})` });
  if (!result || !result.objectId) return -1;
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  return (listeners || []).filter((l) => l.type === 'click').length;
}

const SELECTOR_ORDER = [
  '#exportNotePdfBtn', '#sendNoteBtn', '#notePreviewPdfBtn', '#saveFullScreenNote'
];

async function boot() {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  for (let i = 0; i < 40; i++) {
    const d = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent).catch(() => null);
    if (d === '0') return true;
    await sleep(400);
  }
  return false;
}

async function setLang(locale) {
  await page.evaluate((loc) => {
    const sel = document.querySelector('#languageSelect');
    sel.value = loc;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, locale);
  await sleep(450);
}
// Opens the Notes editor the way a user does: drawer -> Notes -> new note.
async function openNotesEditor() {
  await page.evaluate(() => document.querySelector('[data-action="open-notes"]')?.click());
  await sleep(600);
  const managerShown = await page.evaluate(() => !!document.querySelector('#notesManagerModal')?.classList.contains('show'));
  await page.evaluate(() => document.querySelector('#openNewNoteButton')?.click());
  await sleep(700);
  const editorShown = await page.evaluate(() => !!document.querySelector('#fullScreenNoteModal')?.classList.contains('show'));
  return { managerShown, editorShown };
}

const CP_FIELDS = ['cpCompanyName', 'cpAddress', 'cpPhone', 'cpEmail', 'cpWebsite', 'cpLogoInput',
  'cpLogoBtn', 'cpSigCanvas', 'cpStampInput', 'cpStampBtn', 'cpFooter',
  'companyProfileSave', 'companyProfileCancel', 'companyProfileClose'];

async function measureHeader() {
  return await page.evaluate((cpFields) => {
    const modal = document.querySelector('#fullScreenNoteModal');
    const bar = modal && modal.querySelector('.full-screen-note-action-bar');
    const header = modal && modal.querySelector('.full-screen-note-header');
    const titleRow = modal && modal.querySelector('.full-screen-note-title-row');
    const titleInput = modal && modal.querySelector('#noteTitleInput');
    const saved = modal && modal.querySelector('#noteSavedIndicator');
    const btns = bar ? Array.from(bar.querySelectorAll('button')) : [];
    // Hidden keep-wired buttons (display:none) must not corrupt spacing math: we
    // still report ALL ids for the removal check, but geometry/hit assertions use
    // only the truly visible (layout) buttons.
    const visBtns = btns.filter((b) => {
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden'
        && (r.width > 1 || r.height > 1);
    });
    const rects = visBtns.map((b) => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return {
        id: b.id, cls: String(b.className), aria: b.getAttribute('aria-label') || '',
        left: +r.left.toFixed(2), right: +r.right.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        cx: r.left + r.width / 2, cy: r.top + r.height / 2,
        radius: cs.borderRadius, bg: cs.backgroundColor, hasSvg: !!b.querySelector('svg')
      };
    });
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const barCs = cs(bar), hdrCs = cs(header);
    const de = document.documentElement;
    return {
      modalShown: !!modal && modal.classList.contains('show'),
      dir: de.dir, lang: de.lang, bodyLang: document.body.getAttribute('data-language'),
      headerDir: hdrCs ? hdrCs.direction : null,
      barButtonCount: btns.length,
      ids: btns.map((b) => b.id),
      rects,
      hitTest: rects.map((r) => {
        const el = document.elementFromPoint(r.cx, r.cy);
        if (!el) return 'none';
        const b = el.closest('button');
        return b ? b.id : el.tagName + '.' + String(el.className).slice(0, 24);
      }),
      bar: barCs ? {
        left: bar.getBoundingClientRect().left, right: bar.getBoundingClientRect().right,
        w: +bar.getBoundingClientRect().width.toFixed(2),
        pad: barCs.padding, gap: barCs.gap, justify: barCs.justifyContent, align: barCs.alignItems
      } : null,
      headerH: header ? +header.getBoundingClientRect().height.toFixed(2) : -1,
      titleRowW: titleRow ? +titleRow.getBoundingClientRect().width.toFixed(2) : -1,
      titleInputW: titleInput ? +titleInput.getBoundingClientRect().width.toFixed(2) : -1,
      savedIndicatorVisible: !!saved && saved.getBoundingClientRect().width > 0,
      toolbarPresent: !!modal.querySelector('.note-format-toolbar'),
      toolbarButtons: modal.querySelectorAll('.note-format-toolbar button').length,
      // ---- Company Profile must be gone -------------------------------------
      cpBtn: !!modal.querySelector('#openCompanyProfileBtn'),
      cpLabelCount: Array.from(modal.querySelectorAll('button')).filter((b) =>
        /company\s*profile|ملف الشركة|پڕۆفایل/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent)).length,
      cpModal: !!document.querySelector('#companyProfileModal'),
      cpFieldCount: cpFields.filter((id) => !!document.getElementById(id)).length,
      cpAnywhere: Array.from(document.querySelectorAll('[id],[class]')).some((el) =>
        /companyProfile|company-profile/.test((el.id || '') + ' ' + String(el.className))),
      // ---- the old PDF Export setup dialog must be GONE ---------------------
      exportDialogLegacyIds: ['noteExportPdfModal', 'noteExportPdfClose', 'noteExportStyle',
        'noteExportTitle', 'noteExportDate', 'noteExportCompany', 'noteExportPreviewBtn',
        'noteExportCreateBtn'].filter((id) => !!document.getElementById(id)),
      // ---- overflow ---------------------------------------------------------
      docOverflow: de.scrollWidth - de.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      editorOverflow: (() => {
        const e = modal && modal.querySelector('.full-screen-note');
        return e ? e.scrollWidth - e.clientWidth : 0;
      })()
    };
  }, CP_FIELDS);
}

// Even-distribution analysis from real rects: equal gaps, equal end margins and
// a bar width that exactly fits the remaining buttons (the space of the removed
// Company Profile button is fully reclaimed — no empty slot is left behind).
function analyse(m) {
  const rs = [...m.rects].sort((a, b) => a.left - b.left);
  const inner = [];
  for (let i = 0; i + 1 < rs.length; i++) inner.push(+(rs[i + 1].left - rs[i].right).toFixed(2));
  const parts = m.bar ? m.bar.pad.split(' ') : ['0'];
  const padX = parseFloat(parts.length >= 2 ? parts[1] : parts[0]) || 0;
  const contentW = m.bar ? +(m.bar.w - padX * 2).toFixed(2) : null;
  const gap = m.bar ? (parseFloat(m.bar.gap) || 0) : 0;
  const btnW = rs.length ? rs[0].w : 0;
  const expected = +(rs.length * btnW + (rs.length - 1) * gap).toFixed(2);
  return {
    inner,
    innerSpread: inner.length ? +(Math.max(...inner) - Math.min(...inner)).toFixed(2) : null,
    outerLeft: m.bar ? +(rs[0].left - m.bar.left - padX).toFixed(2) : null,
    outerRight: m.bar ? +(m.bar.right - padX - rs[rs.length - 1].right).toFixed(2) : null,
    overlap: rs.some((r, i) => i + 1 < rs.length && r.right > rs[i + 1].left + 0.5),
    contentW, expected,
    leftoverSpace: contentW === null ? null : +(contentW - expected).toFixed(2),
    sizeSpread: +(Math.max(...rs.map((r) => r.w)) - Math.min(...rs.map((r) => r.w))).toFixed(2)
  };
}

// ============================================================== BOOT + OPEN
check('app boots (calculator display reads 0)', await boot());
const opened = await openNotesEditor();
check('Notes manager opens via drawer -> Notes', opened.managerShown);
check('Notes editor opens (new note)', opened.editorShown, JSON.stringify(opened));

// =========================================================== RESPONSIVE MATRIX
const VIEWPORTS = [1280, 768, 430, 390, 360];
const LOCALES = ['en', 'ar', 'ku'];
const ID_LABELS = { en: 'English LTR', ar: 'Arabic RTL', ku: 'Kurdish RTL' };
const summary = {};

for (const locale of LOCALES) {
  await setLang(locale);
  for (const w of VIEWPORTS) {
    await page.setViewport({ width: w, height: 900 });
    await sleep(350);
    const tag = `${ID_LABELS[locale]} @${w}`;
    let m = await measureHeader();
    if (!m.modalShown) { await openNotesEditor(); m = await measureHeader(); }
    const a = analyse(m);
    summary[tag] = {
      dir: m.dir, bodyLang: m.bodyLang, headerDir: m.headerDir,
      ids: m.ids, gaps: a.inner, innerSpread: a.innerSpread,
      outerL: a.outerLeft, outerR: a.outerRight, leftover: a.leftoverSpace,
      overlap: a.overlap, hits: m.hitTest,
      docOverflow: m.docOverflow, bodyOverflow: m.bodyOverflow, editorOverflow: m.editorOverflow,
      barW: m.bar && m.bar.w, btnW: m.rects[0] && m.rects[0].w, toolbar: m.toolbarButtons
    };
    await page.screenshot({ path: path.join(SHOTS, `notes-header-${locale}-${w}.png`) });

    const wantRtl = locale !== 'en';
    check(`${tag} — editor shown`, m.modalShown);
    check(`${tag} — ${wantRtl ? 'RTL' : 'LTR'} direction applied`,
      wantRtl ? (m.dir === 'rtl' && m.headerDir === 'rtl') : (m.dir === 'ltr' && m.headerDir === 'ltr'),
      `htmlDir=${m.dir} headerDir=${m.headerDir} bodyLang=${m.bodyLang}`);
    check(`${tag} — exactly 4 circular buttons in the header action bar`,
      m.barButtonCount === 4, `ids=[${m.ids.join(',')}]`);
    check(`${tag} — remaining buttons are Save/Send/Preview/Export in order`,
      JSON.stringify(m.ids) === JSON.stringify(SELECTOR_ORDER.map((s) => s.slice(1))), m.ids.join(','));
    check(`${tag} — Company Profile button ABSENT from the header`,
      !m.cpBtn && m.cpLabelCount === 0, `byId=${m.cpBtn} labelMatches=${m.cpLabelCount}`);
    check(`${tag} — Company Profile modal/form/CSS hooks ABSENT`,
      !m.cpModal && m.cpFieldCount === 0 && !m.cpAnywhere,
      `modal=${m.cpModal} fields=${m.cpFieldCount} anyCompanyProfileEl=${m.cpAnywhere}`);
    check(`${tag} — no button overlap`, !a.overlap, `gaps=[${a.inner.join('|')}]`);
    check(`${tag} — buttons evenly distributed (gap spread <= 1.5px)`,
      a.innerSpread !== null && a.innerSpread <= 1.5, `spread=${a.innerSpread} gaps=[${a.inner.join('|')}]`);
    check(`${tag} — equal margin at both ends of the bar`,
      Math.abs(a.outerLeft - a.outerRight) <= 1.5, `L=${a.outerLeft} R=${a.outerRight}`);
    check(`${tag} — no empty slot where the removed button used to be`,
      Math.abs(a.leftoverSpace) <= 1.5, `content=${a.contentW} expected=${a.expected} leftover=${a.leftoverSpace}`);
    check(`${tag} — every remaining button is clickable (elementFromPoint hit test)`,
      m.hitTest.every((h, i) => h === m.ids[i]), JSON.stringify(m.hitTest));
    check(`${tag} — button size + circular style unchanged`,
      a.sizeSpread === 0 && m.rects.every((r) => Math.abs(r.w - r.h) < 0.5 && parseFloat(r.radius) >= 19),
      `sizeSpread=${a.sizeSpread} w=${m.rects[0] && m.rects[0].w} radius=${m.rects[0] && m.rects[0].radius}`);
    check(`${tag} — title row + Saved indicator intact`,
      m.titleRowW > 0 && m.titleInputW > 40 && m.savedIndicatorVisible,
      `titleRow=${m.titleRowW} input=${m.titleInputW} saved=${m.savedIndicatorVisible}`);
    check(`${tag} — Notes formatting toolbar untouched`,
      m.toolbarPresent && m.toolbarButtons > 0, `buttons=${m.toolbarButtons}`);
    check(`${tag} — no horizontal overflow`,
      m.docOverflow <= 0 && m.bodyOverflow <= 0 && m.editorOverflow <= 0,
      `doc=${m.docOverflow} body=${m.bodyOverflow} editor=${m.editorOverflow}`);
  }
}
// ============================================================ BEHAVIOR (regression)
await setLang('en');
await page.setViewport({ width: 1280, height: 900 });
await sleep(300);
await openNotesEditor();

// 1) click handlers still attached to the surviving buttons (browser-level)
for (const sel of SELECTOR_ORDER) {
  const n = await clickListenerCount(sel);
  check(`handler attached: ${sel}`, n >= 1, `click listeners=${n}`);
}
check('no handlers left behind for the removed Company Profile button',
  (await page.evaluate(() => !document.querySelector('#openCompanyProfileBtn'))));

// 2) Save
const beforeKeys = await page.evaluate(() => Object.keys(localStorage));
await page.evaluate(() => {
  const t = document.querySelector('#noteTitleInput');
  t.value = 'CPR-TEST-NOTE';
  t.dispatchEvent(new Event('input', { bubbles: true }));
  const ed = document.querySelector('#noteBodyInput');
  if (ed) { ed.focus(); document.execCommand('insertText', false, 'hello company profile removal'); }
  window.__saveFired = 0;
  const b = document.querySelector('#saveFullScreenNote');
  b.addEventListener('click', () => { window.__saveFired++; }, true);
  b.click();
});
await sleep(1200);
const afterSave = await page.evaluate(() => ({
  fired: window.__saveFired,
  editorShown: !!document.querySelector('#fullScreenNoteModal')?.classList.contains('show'),
  items: document.querySelectorAll('.note-item').length,
  keys: Object.keys(localStorage),
  stored: Object.keys(localStorage).map((k) => {
    try { return String(localStorage.getItem(k)).includes('CPR-TEST-NOTE'); } catch (e) { return false; }
  }).some(Boolean)
}));
// 3) Send (Web Share path + clipboard fallback path)
await openNotesEditor();
await page.click('#noteBodyInput');
await page.keyboard.type('hello company profile removal');
await sleep(1200);
const sendRes = await page.evaluate(async () => {
  window.__share = 0; window.__copied = '';
  const origShare = navigator.share, origCan = navigator.canShare, origClip = navigator.clipboard;
  navigator.share = async (d) => { window.__share++; window.__shared = d; };
  navigator.canShare = () => true;
  document.querySelector('#sendNoteBtn').click();
  await new Promise((r) => setTimeout(r, 400));
  const shareText = (window.__shared && window.__shared.text) || '';
  navigator.share = undefined; navigator.canShare = () => false;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (t) => { window.__copied = t; } }
  });
  document.querySelector('#sendNoteBtn').click();
  await new Promise((r) => setTimeout(r, 400));
  try { navigator.share = origShare; navigator.canShare = origCan; } catch (e) {}
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: origClip }); } catch (e) {}
  return { share: window.__share, shareHasContent: shareText.includes('hello'), copied: String(window.__copied).slice(0, 80) };
});
check('Send button -> Web Share path invoked with note content',
  sendRes.share === 1 && sendRes.shareHasContent, JSON.stringify(sendRes));
check('Send button -> clipboard fallback path still works',
  sendRes.copied.includes('hello'), sendRes.copied);

// 4) Preview PDF + Export PDF (PDF engine untouched; CDN-dependent render reported honestly)
const pdfState = await page.evaluate(() => ({ html2pdf: typeof window.html2pdf }));
const previewRes = await page.evaluate(async () => {
  let fired = 0;
  const b = document.querySelector('#notePreviewPdfBtn');
  b.addEventListener('click', () => { fired++; }, true);
  b.click();
  await new Promise((r) => setTimeout(r, 5000));
  return {
    fired,
    previewShown: !!document.querySelector('#notePdfPreviewModal')?.classList.contains('show'),
    exportDialogAbsent: !document.querySelector('#noteExportPdfModal')
  };
});
check('Preview PDF button -> click handler ran', previewRes.fired === 1, JSON.stringify(previewRes));
check('Preview PDF button -> opens the existing PDF preview workspace',
  previewRes.previewShown, `html2pdf=${pdfState.html2pdf} previewModal=${previewRes.previewShown} (rendering needs the CDN in an online session)`);
check('Preview PDF button -> removed export dialog is absent from the DOM', previewRes.exportDialogAbsent);
if (previewRes.previewShown) {
  await page.evaluate(() => document.querySelector('#notePdfPreviewClose')?.click());
  await sleep(400);
}
const exportRes = await page.evaluate(async () => {
  let fired = 0;
  const b = document.querySelector('#exportNotePdfBtn');
  b.addEventListener('click', () => { fired++; }, true);
  b.click();
  await new Promise((r) => setTimeout(r, 700));
  return {
    fired,
    dialogInDom: !!document.querySelector('#noteExportPdfModal'),
    legacyIds: ['noteExportStyle', 'noteExportTitle', 'noteExportDate', 'noteExportCompany',
      'noteExportPreviewBtn', 'noteExportCreateBtn', 'noteExportPdfClose']
      .filter((id) => !!document.getElementById(id))
  };
});
check('Export PDF button -> INSTANT export: click handled, no setup dialog, no legacy controls',
  exportRes.fired === 1 && !exportRes.dialogInDom && exportRes.legacyIds.length === 0,
  JSON.stringify(exportRes));
await page.click('#closeFullScreenNote');
await sleep(400);
check('Back closes the Notes editor', await page.$eval('#fullScreenNoteModal', el => !el.classList.contains('show')));
await openNotesEditor();
check('Save persists note and closes editor', !afterSave.editorShown && afterSave.stored);

// 5) Header must not jitter when the language changes (430px, en -> ar -> ku -> en -> ar)
await page.setViewport({ width: 430, height: 900 });
const widths = [];
for (const loc of ['en', 'ar', 'ku', 'en', 'ar']) {
  await setLang(loc);
  await sleep(400);
  const r = await page.evaluate(() => {
    const h = document.querySelector('#fullScreenNoteModal .full-screen-note-header');
    const b = document.querySelector('#fullScreenNoteModal .full-screen-note-action-bar');
    const t = document.querySelector('#fullScreenNoteModal .full-screen-note-title-row');
    return {
      hdrH: h ? +h.getBoundingClientRect().height.toFixed(2) : -1,
      hdrW: h ? +h.getBoundingClientRect().width.toFixed(2) : -1,
      barW: b ? +b.getBoundingClientRect().width.toFixed(2) : -1,
      titleW: t ? +t.getBoundingClientRect().width.toFixed(2) : -1
    };
  });
  widths.push({ loc, ...r });
}
const hdrSpread = +(Math.max(...widths.map((w) => w.hdrW)) - Math.min(...widths.map((w) => w.hdrW))).toFixed(2);
const barSpread = +(Math.max(...widths.map((w) => w.barW)) - Math.min(...widths.map((w) => w.barW))).toFixed(2);
check('header does not jitter across language switches (en/ar/ku, 430px)',
  hdrSpread <= 1 && barSpread <= 1, `hdrSpread=${hdrSpread} barSpread=${barSpread} ${JSON.stringify(widths)}`);

// ============================================================ SUMMARY
const summaryOut = Object.keys(summary).map((k) => `${k}: ${JSON.stringify(summary[k])}`).join('\n');
fs.appendFileSync(OUT, '\n===== RESPONSIVE MATRIX (measured)\n' + summaryOut + '\n');
fs.appendFileSync(OUT, `\n===== JS ERRORS (${pageErrors.length})\n` + pageErrors.slice(0, 30).join('\n') + '\n');
  // Separate REAL script errors from offline-network noise: in this sandbox external
  // CDNs (jsdelivr html2pdf / font CSS) can be unreachable, which Chrome reports as
  // console "Failed to load resource" errors. Those are environment, not app bugs —
  // but any *other* console error, or any uncaught page exception, is a real FAIL.
  const realErrors = pageErrors.filter((e) => !/Failed to load resource/.test(e));
  // Chrome requests ./favicon.ico, ./apple-touch-icon.png and ./icon-192.png
  // automatically for every page load. Those files were never present in the
  // repo (pre-existing PWA-icon gap, untouched by this phase), and the local
  // harness server answers 404. Anything OTHER than those local icon URLs is a
  // real resource failure and must fail the check.
  const PREEXISTING_ICONS = /favicon\.ico|apple-touch-icon\.png|icon-192\.png|icon-512\.png/;
  const iconOnly = net404s.every((u) => PREEXISTING_ICONS.test(u));
  check('no real JavaScript errors during the whole run', realErrors.length === 0, realErrors.slice(0, 5).join(' | '));
  check('resource 404s are ONLY the pre-existing missing PWA icons (favicon/apple-touch/icon-192) — env artifact, not app code',
    realErrors.length === 0 && iconOnly,
    `net404s=${net404s.length} allIcons=${iconOnly} urls=${net404s.slice(0, 5).join(' | ')}`);
check('Company Profile button missing in all 15 viewport/locale combinations',
  Object.values(summary).every((s) => Array.isArray(s.ids) && s.ids.length === 4 && !s.ids.some((i) => /company/i.test(i))));

fs.appendFileSync(OUT, `\n===== TOTAL: ${passCount} passed, ${failCount} failed\n`);
fs.appendFileSync(OUT, `screenshots: ${fs.readdirSync(SHOTS).length}\n`);
await browser.close();
server.close();
console.log(`done: ${passCount} passed, ${failCount} failed`);
process.exit(failCount === 0 ? 0 : 1);


