// PHASE — COMPANY PROFILE REMOVAL FROM THE NOTES EDITOR HEADER (browser test).
//
// Real-Chrome verification (source-grep is NOT accepted as proof) that:
//   1. the Company Profile button is ABSENT from the Notes editor header,
//   2. the REMAINING circular buttons are present, evenly distributed, non
//      overlapping, clickable, and still carry their click handlers (checked in
//      the browser via CDP DOMDebugger.getEventListeners),
//   3. the header behaves at 1280 / 768 / 430 / 390 / 360 in English LTR,
//      Arabic RTL and Kurdish RTL with no overflow and a stable button bar,
//   4. Back / Save / Send / Preview PDF / Export PDF still behave as before,
//   5. the PDF-Export "Use Company Profile" checkbox is PRESERVED,
//   6. the rest of the editor (toolbar, manager, Smart Documents) is untouched,
//   7. no JavaScript errors / page exceptions are raised.
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
const PORT = 8392;
const RESULTS = path.join(HERE, 'notesCompanyProfileRemoval.results.txt');
const SHOTS = path.join(HERE, 'artifacts');
try { fs.mkdirSync(SHOTS, { recursive: true }); } catch (e) {}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (!u || u === '/') u = '/index.html';
  try {
    const data = fs.readFileSync(path.join(ROOT, u));
    res.writeHead(200, { 'Content-Type': mimeOf(u) + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => { console.log('WATCHDOG TIMEOUT'); process.exit(124); }, 900000);

let passCount = 0;
let failCount = 0;
try { fs.unlinkSync(RESULTS); } catch (e) {}
function check(name, ok, detail = '') {
  if (ok) passCount++; else failCount++;
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + String(detail).slice(0, 400) : ''}`;
  console.log(line);
  fs.appendFileSync(RESULTS, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Buttons that must remain in the Notes editor header, in DOM order.
const BUTTON_IDS = ['saveFullScreenNote', 'sendNoteBtn', 'notePreviewPdfBtn', 'exportNotePdfBtn'];
const BACK_ID = 'closeFullScreenNote';

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--lang=en', '--window-size=1280,900']
});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push('pageerror: ' + String((e && e.message) || e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
page.on('requestfailed', (r) => pageErrors.push('netfail: ' + r.url().slice(0, 90)));
await page.evaluateOnNewDocument(() => {
  // Test-only shims: stop the service worker from serving a cached pre-change
  // app.js, and keep native dialogs / layout APIs from hanging the harness.
  if (navigator.serviceWorker) {
    try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {}
  }
  window.__dialogs = { alert: 0, confirm: 0, prompt: 0 };
  window.alert = () => { window.__dialogs.alert++; };
  window.confirm = () => { window.__dialogs.confirm++; return true; };
  window.prompt = () => { window.__dialogs.prompt++; return ''; };
  window.__layoutCalls = 0;
  const origRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () { window.__layoutCalls++; return origRect.call(this); };
});
const cdp = await page.createCDPSession();

// Real browser-level handler check (not source inspection).
async function clickListeners(selector) {
  const { result } = await cdp.send('Runtime.evaluate', {
    expression: `document.querySelector(${JSON.stringify(selector)})`, returnByValue: false
  });
  if (!result || !result.objectId) return -1;
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  return (listeners || []).filter((l) => l.type === 'click').length;
}

async function boot() {
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  for (let i = 0; i < 50; i++) {
    const ready = await page.evaluate(() => document.querySelector('#primaryDisplay')?.textContent === '0').catch(() => false);
    if (ready) return true;
    await sleep(400);
  }
  return false;
}

async function setLang(locale) {
  await page.evaluate((loc) => {
    const sel = document.querySelector('#languageSelect');
    if (!sel) throw new Error('no #languageSelect');
    sel.value = loc;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, locale);
  await sleep(500);
}

// Opens the Notes editor the same way a user does: drawer → Notes → new note.
async function openNotesEditor() {
  await page.evaluate(() => document.querySelector('[data-action="open-notes"]')?.click());
  await sleep(650);
  const managerShown = await page.evaluate(() => !!document.querySelector('#notesManagerModal')?.classList.contains('show'));
  await page.evaluate(() => document.querySelector('#openNewNoteButton')?.click());
  await sleep(750);
  const editorShown = await page.evaluate(() => !!document.querySelector('#fullScreenNoteModal')?.classList.contains('show'));
  return { managerShown, editorShown };
}

async function closeNotesEditor() {
  await page.evaluate(() => document.querySelector('#closeFullScreenNote')?.click());
  await sleep(450);
  await page.evaluate(() => document.querySelector('#closeNotesManager')?.click());
  await sleep(350);
}

async function measureHeader() {
  return await page.evaluate((ids) => {
    const modal = document.querySelector('#fullScreenNoteModal');
    const q = (s) => (modal ? modal.querySelector(s) : null);
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height,
        pad: cs.padding, gap: cs.gap, flexDir: cs.flexDirection, radius: cs.borderRadius,
        bg: cs.backgroundColor, display: cs.display, visibility: cs.visibility
      };
    };
    const header = q('.full-screen-note-header');
    const bar = q('.full-screen-note-action-bar');
    const titleRow = q('.full-screen-note-title-row');
    const titleInput = q('.note-title-input');
    const saved = q('.note-saved-indicator');
    const btns = bar ? Array.from(bar.querySelectorAll('button')) : [];
    const rects = btns.map((b) => {
      const r = b.getBoundingClientRect();
      return { id: b.id, w: r.width, h: r.height, left: r.left, right: r.right, cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: getComputedStyle(b).borderRadius };
    });
    const hitTest = rects.map((r) => {
      const el = document.elementFromPoint(r.cx, r.cy);
      const b = el && el.closest ? el.closest('button') : null;
      return b ? b.id : (el ? el.tagName + '.' + String(el.className).split(' ')[0] : 'none');
    });
    const cpIds = ['cpCompanyName', 'cpAddress', 'cpPhone', 'cpEmail', 'cpWebsite', 'cpLogoInput',
      'cpSigCanvas', 'cpStampInput', 'cpFooter', 'companyProfileSave', 'companyProfileCancel',
      'openCompanyProfileBtn'];
    return {
      expectedIds: ids,
      modalShown: !!modal && modal.classList.contains('show'),
      dir: document.documentElement.dir,
      bodyLang: document.body.getAttribute('data-language'),
      headerBox: box(header), barBox: box(bar), titleRowBox: box(titleRow),
      titleInputBox: box(titleInput), savedBox: box(saved),
      savedVisible: !!saved && saved.getBoundingClientRect().width > 0,
      barButtonCount: btns.length,
      ids: btns.map((b) => b.id),
      arias: btns.map((b) => b.getAttribute('aria-label') || ''),
      rects, hitTest,
      cpBtn: !!document.querySelector('#openCompanyProfileBtn'),
      cpModal: !!document.querySelector('#companyProfileModal'),
      cpFieldCount: cpIds.filter((id) => !!document.getElementById(id)).length,
      cpAnywhere: !!document.querySelector('[id^="cp"], [class*="company-profile"]'),
      cpLabelButtons: Array.from(document.querySelectorAll('button')).filter((b) =>
        /company\s*profile|ملف الشركة|پڕۆفایلی/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent)).length,
      exportCompany: (() => {
        const c = document.querySelector('#noteExportCompany');
        if (!c) return { exists: false };
        const lab = c.closest('label');
        return { exists: true, checked: !!c.checked, type: c.type, disabled: !!c.disabled, labelText: lab ? lab.textContent.trim() : '' };
      })(),
      toolbarButtons: document.querySelectorAll('#fullScreenNoteModal .note-format-toolbar button').length,
      editorOverflow: (() => {
        const e = q('.full-screen-note');
        return e ? Math.round(e.scrollWidth - e.clientWidth) : -1;
      })(),
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth
    };
  }, BUTTON_IDS);
}

// Even-distribution analysis straight from the real rects. The bar must hug
// exactly the remaining buttons (so no empty slot is left where the removed
// button used to be), with equal gaps and equal margins at both ends.
function analyse(m) {
  const b = m.barBox;
  if (!b || !m.rects.length) return { ok: false };
  const rs = [...m.rects].sort((x, y) => x.left - y.left);
  const gaps = [];
  for (let i = 0; i + 1 < rs.length; i++) gaps.push(+(rs[i + 1].left - rs[i].right).toFixed(2));
  const parts = b.pad.split(' ').map(parseFloat).filter((n) => !isNaN(n));
  const padX = parts.length >= 2 ? parts[1] : (parts[0] || 0);
  const contentW = +(b.w - padX * 2).toFixed(2);
  const gapPx = parseFloat(b.gap) || 0;
  const needed = +(rs.length * rs[0].w + (rs.length - 1) * gapPx).toFixed(2);
  return {
    ok: true, gaps,
    gapSpread: +(Math.max(...gaps) - Math.min(...gaps)).toFixed(2),
    outerLeft: +(rs[0].left - b.left - padX).toFixed(2),
    outerRight: +(b.right - padX - rs[rs.length - 1].right).toFixed(2),
    overlap: rs.some((r, i) => i + 1 < rs.length && r.right > rs[i + 1].left + 0.5),
    contentW, needed, leftover: +(contentW - needed).toFixed(2),
    sizeSpread: +(Math.max(...rs.map((r) => r.w)) - Math.min(...rs.map((r) => r.w))).toFixed(2),
    barW: +b.w.toFixed(2), barH: +b.h.toFixed(2)
  };
}

// =============================================== open the editor for real
check('app boots (calculator display reads 0)', await boot());
const opened = await openNotesEditor();
check('Notes manager opens via drawer -> Notes', opened.managerShown, JSON.stringify(opened));
check('Notes editor opens on a new note', opened.editorShown, JSON.stringify(opened));

const VIEWPORTS = [1280, 768, 430, 390, 360];
const LOCALES = [['en', 'English LTR'], ['ar', 'Arabic RTL'], ['ku', 'Kurdish RTL']];
const geometry = {};

for (const [locale, label] of LOCALES) {
  await setLang(locale);
  for (const w of VIEWPORTS) {
    await page.setViewport({ width: w, height: 880 });
    await sleep(420);
    let m = await measureHeader();
    if (!m.modalShown) { await openNotesEditor(); m = await measureHeader(); }
    const a = analyse(m);
    const tag = `${label} @${w}`;
    geometry[tag] = {
      gapSpread: a.gapSpread, gaps: a.gaps, leftover: a.leftover, sizeSpread: a.sizeSpread,
      barW: a.barW, barH: a.barH, headerDir: m.headerBox.flexDir, doc: m.docOverflow,
      barButtonCount: m.barButtonCount, headerH: +m.headerBox.h.toFixed(1)
    };
    check(`${tag} - Notes editor is open`, m.modalShown);
    check(`${tag} - action bar holds exactly the 4 remaining buttons`,
      m.barButtonCount === 4 && JSON.stringify(m.ids) === JSON.stringify(BUTTON_IDS), m.ids.join(','));
    check(`${tag} - Company Profile button is ABSENT`,
      !m.cpBtn && m.cpLabelButtons === 0, `byId=${m.cpBtn} labelButtons=${m.cpLabelButtons}`);
    check(`${tag} - Company Profile modal / form fields ABSENT`,
      !m.cpModal && m.cpFieldCount === 0 && !m.cpAnywhere,
      `modal=${m.cpModal} cpFields=${m.cpFieldCount} cpNodes=${m.cpAnywhere}`);
    check(`${tag} - no button overlap`, !a.overlap, `gaps=${a.gaps.join('|')}`);
    check(`${tag} - buttons evenly distributed (equal gaps)`,
      a.gapSpread <= 1.5, `spread=${a.gapSpread} gaps=${a.gaps.join('|')}`);
    check(`${tag} - equal margin at both bar ends`,
      Math.abs(a.outerLeft - a.outerRight) <= 1.5, `L=${a.outerLeft} R=${a.outerRight}`);
    check(`${tag} - no empty slot where the removed button used to be`,
      Math.abs(a.leftover) <= 1.5, `content=${a.contentW} needed=${a.needed} leftover=${a.leftover}`);
    check(`${tag} - every remaining button is hit-testable (clickable)`,
      m.hitTest.every((h, i) => h === m.ids[i]), JSON.stringify(m.hitTest));
    check(`${tag} - circular size/style preserved (equal w/h, round, uniform)`,
      a.sizeSpread === 0 && m.rects.every((r) => r.w === r.h) && parseFloat(m.rects[0].radius) >= 19,
      `sizeSpread=${a.sizeSpread} radius=${m.rects[0] && m.rects[0].radius} w=${m.rects[0] && m.rects[0].w}`);
    check(`${tag} - title row + Saved indicator intact`,
      m.titleRowBox.h > 20 && m.titleInputBox.w > 40 && m.savedVisible,
      `titleRowH=${m.titleRowBox.h} inputW=${m.titleInputBox.w} saved=${m.savedVisible}`);
    check(`${tag} - Notes formatting toolbar untouched`,
      m.toolbarButtons > 0, `toolbarButtons=${m.toolbarButtons}`);
    check(`${tag} - no horizontal overflow`,
      m.docOverflow <= 0 && m.bodyOverflow <= 0 && m.editorOverflow <= 0,
      `doc=${m.docOverflow} body=${m.bodyOverflow} editor=${m.editorOverflow}`);
  }
  await page.screenshot({ path: path.join(SHOTS, `notes-header-1280-${locale}.png`) }).catch(() => {});
}
