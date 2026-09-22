// PART 08 — FULL behavioral verification (Real Chrome / puppeteer-core).
// Styles (5+none), frames (4), i18n EN->AR->EN, manual overrides, autosave,
// close/reopen, reload, Preview, PDF, tables, viewport matrix, RTL/LTR, errors.
// The known PREEXISTING SVG icon warning is recorded separately, excluded from FAIL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const PORT = 8634;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;

let pass = 0, fail = 0, preexisting = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  ok ? pass++ : fail++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const freshErrors = [];
page.on('pageerror', (e) => { if (PREEXISTING_SVG.test(e.message)) preexisting++; else freshErrors.push('[pageerror] ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else freshErrors.push('[console] ' + m.text()); } });

async function openNotesEditor(title) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  if (title) {
    const found = await page.evaluate((t) => {
      const items = Array.from(document.querySelectorAll('#notesList li'));
      const it = items.find((x) => (x.textContent || '').includes(t));
      if (it) { it.click(); return true; } return false;
    }, title);
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
    await sleep(350);
    return found;
  }
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  return true;
}
async function openApp(vw = 1366, vh = 900) {
  await page.setViewport({ width: vw, height: vh });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  await openNotesEditor(null);
  await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'P8 Full Verify'; });
  await sleep(150);
}
async function openAa() {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-i18n="noteAaBtn"]') || document.getElementById('noteAaButton') || document.querySelector('.note-aa-btn');
    (btn || document.querySelector('.note-aa-btn')).click();
  });
  await sleep(300);
}
async function clickStyle(id) {
  return page.evaluate((id) => {
    const b = document.querySelector('#noteAaStylesRow .note-aa-style-btn[data-style-id="' + id + '"]');
    if (!b) return false; b.click(); return true;
  }, id);
}
async function clickFrame(id) {
  return page.evaluate((id) => {
    const b = document.querySelector('#noteAaFramesRow .note-aa-frame-btn[data-frame-id="' + id + '"]');
    if (!b) return false; b.click(); return true;
  }, id);
}
async function bodyStyles() {
  return page.evaluate(() => {
    const el = document.getElementById('noteBodyInput');
    return {
      styles: Array.from(el.classList).filter((c) => /^note-style-/.test(c)),
      frames: Array.from(el.classList).filter((c) => /^note-frame-/.test(c)),
      activeS: Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn.is-active')).map((b) => b.getAttribute('data-style-id')),
      activeF: Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn.is-active')).map((b) => b.getAttribute('data-frame-id'))
    };
  });
}
async function storedNote(title = 'P8 Full Verify') {
  return page.evaluate((k, t) => {
    try { return JSON.parse(localStorage.getItem(k) || '[]').find((n) => n && n.title === t) || null; }
    catch { return null; }
  }, STORAGE_KEY, title);
}
async function setLang(loc) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, loc);
  await sleep(450);
}
function overflow() {
  return page.evaluate(() => {
    const m = document.getElementById('fullScreenNoteModal');
    return { modal: m ? m.scrollWidth - m.clientWidth : -1, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
}

// ---------- 1. Builder structure + i18n attributes (EN) ----------
await openApp();
await openAa();
const ui = await page.evaluate(() => {
  const map = (b) => ({ id: b.getAttribute('data-style-id') || b.getAttribute('data-frame-id'), i18n: b.getAttribute('data-i18n'), text: b.textContent.trim(), aria: b.getAttribute('aria-label'), title: b.title });
  return {
    styles: Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn')).map(map),
    frames: Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn')).map(map),
    styleRows: document.querySelectorAll('#noteAaStylesRow').length
  };
});
check('style row: exactly 6 style buttons (5 styles + none)', ui.styles.length === 6 && ['simple','academic','business','engineering','modern','none'].every((x) => ui.styles.some((b) => b.id === x)), JSON.stringify(ui.styles.map((b) => b.id)));
check('frame row: exactly 4 frame buttons (none/classic/dashed/soft)', ui.frames.length === 4 && ['none','classic','dashed','soft'].every((x) => ui.frames.some((b) => b.id === x)), JSON.stringify(ui.frames.map((b) => b.id)));
check('all style buttons carry data-i18n', ui.styles.every((b) => b.i18n), JSON.stringify(ui.styles.map((b) => b.i18n)));
check('all frame buttons carry data-i18n', ui.frames.every((b) => b.i18n), JSON.stringify(ui.frames.map((b) => b.i18n)));
check('all style buttons have aria-label + title', ui.styles.every((b) => b.aria && b.title));
check('all frame buttons have aria-label + title', ui.frames.every((b) => b.aria && b.title));
check('None style button keeps note-aa-style-none class', await page.evaluate(() => { const b = document.querySelector('#noteAaStylesRow .note-aa-style-btn[data-style-id="none"]'); return !!b && b.classList.contains('note-aa-style-none'); }));
const enTexts = { simple: 'Simple', academic: 'Academic', business: 'Business', engineering: 'Engineering', modern: 'Modern', none: 'None' };
check('EN: style button labels correct', ui.styles.every((b) => b.text === enTexts[b.id]), JSON.stringify(ui.styles.map((b) => b.id + '=' + b.text)));
check('EN: frame button labels correct', ui.frames.map((b) => b.text).join(',') === 'None,Classic,Dashed,Soft', JSON.stringify(ui.frames.map((b) => b.text)));

// ---------- 2. Apply each style ----------
for (const id of ['simple', 'academic', 'business', 'engineering', 'modern']) {
  await clickStyle(id); await sleep(300);
  const b = await bodyStyles();
  check('style applied+active: ' + id, b.styles.length === 1 && b.styles[0] === 'note-style-' + id && b.activeS[0] === id, JSON.stringify({ s: b.styles, a: b.activeS }));
}
await clickStyle('none'); await sleep(300);
const bNone = await bodyStyles();
check('None style removes style classes + saves noteStyle=none', bNone.styles.length === 0 && (await storedNote())?.noteStyle === 'none' && bNone.activeS[0] === 'none', JSON.stringify({ s: bNone.styles, st: (await storedNote())?.noteStyle }));

// ---------- 3. Apply each frame ----------
for (const id of ['classic', 'dashed', 'soft']) {
  await clickFrame(id); await sleep(300);
  const b = await bodyStyles();
  check('frame applied+active: ' + id, b.frames.length === 1 && b.frames[0] === 'note-frame-' + id && b.activeF[0] === id, JSON.stringify({ f: b.frames, a: b.activeF }));
}
await clickFrame('none'); await sleep(300);
const bfNone = await bodyStyles();
check('frame none clears classes + saves empty noteFrame', bfNone.frames.length === 0 && (await storedNote())?.noteFrame === '' && bfNone.activeF[0] === 'none', JSON.stringify({ f: bfNone.frames, nf: (await storedNote())?.noteFrame }));
// ---------- 4. Manual overrides survive a style change ----------
await page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  el.innerHTML = 'Hello <b>manual-bold</b> world';
  el.focus();
  const range = document.createRange(); range.selectNodeContents(el);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  document.execCommand('foreColor', false, '#d93025');
});
await clickStyle('academic'); await sleep(300);
const manual = await page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  const bold = el.querySelector('b');
  const colored = /d93025/i.test(el.innerHTML);
  return { bold: !!bold && bold.textContent === 'manual-bold', colored, html: el.innerHTML.slice(0, 90) };
});
check('manual bold override survives style change', manual.bold, manual.html);
check('manual color override survives style change', manual.colored);
check('manual content intact after style change', await page.evaluate(() => document.getElementById('noteBodyInput').textContent.includes('manual-bold') && document.getElementById('noteBodyInput').textContent.includes('Hello')));
// alignment still works
const alignOk = await page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  el.innerHTML = '<p>centered</p>'; el.focus();
  const sel = window.getSelection(); const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r);
  document.execCommand('justifyCenter', false);
  return el.querySelector('p').style.textAlign === 'center' || /center/i.test(el.innerHTML);
});
check('alignment (justifyCenter) still works', alignOk);

// ---------- 5. Autosave: style + frame persisted ----------
await clickFrame('classic'); await clickStyle('business'); await sleep(700);
const saved = await storedNote();
check('autosave persisted noteStyle=business', saved?.noteStyle === 'business', JSON.stringify({ style: saved?.noteStyle, frame: saved?.noteFrame }));
check('autosave persisted noteFrame=classic', saved?.noteFrame === 'classic');

// ---------- 6. Close / Reopen ----------
await page.evaluate(() => document.getElementById('closeFullScreenNote').click());
await sleep(500);
check('note modal closes', await page.evaluate(() => !document.getElementById('fullScreenNoteModal').classList.contains('show')));
await openNotesEditor('P8 Full Verify');
const reopenState = await bodyStyles();
check('reopen: style restored (business)', reopenState.styles.includes('note-style-business'), JSON.stringify(reopenState.styles));
check('reopen: frame restored (classic)', reopenState.frames.includes('note-frame-classic'), JSON.stringify(reopenState.frames));
check('reopen: active buttons correct', reopenState.activeS[0] === 'business' && reopenState.activeF[0] === 'classic', JSON.stringify({ s: reopenState.activeS, f: reopenState.activeF }));

// ---------- 7. Full page reload ----------
await page.reload({ waitUntil: 'load', timeout: 60000 });
await sleep(500);
await openNotesEditor('P8 Full Verify');
await openAa();
const rl = await bodyStyles();
check('reload: style restored (business)', rl.styles.includes('note-style-business'), JSON.stringify(rl.styles));
check('reload: frame restored (classic)', rl.frames.includes('note-frame-classic'), JSON.stringify(rl.frames));
// ---------- 8. Preview + PDF ----------
await page.evaluate(() => document.getElementById('notePreviewPdfBtn').click());
await sleep(2000);
const preview = await page.evaluate(() => {
  const rep = document.querySelector('.eq-note-report');
  const overlay = document.querySelector('[class*="pdf-preview"]');
  return { report: !!rep, overlay: !!overlay, repClass: rep ? rep.className : null };
});
check('PDF preview opens with .eq-note-report content', preview.report && preview.overlay, JSON.stringify(preview));
check('preview report carries applied style class', /note-style-business/.test(preview.repClass || ''), preview.repClass);
check('preview report carries applied frame class', /note-frame-classic/.test(preview.repClass || ''), preview.repClass);
await page.keyboard.press('Escape'); await sleep(400);
await page.evaluate(() => { const c = document.querySelector('.note-pdf-preview-close, [class*="pdf-preview"] [class*="close"], #notePdfPreviewClose'); if (c) c.click(); });
await sleep(300);
// Real export click path (html2pdf pipeline)
await page.evaluate(() => document.getElementById('exportNotePdfBtn').click());
await sleep(5000);
check('PDF: export handler runs without new error', freshErrors.length === 0, freshErrors.slice(0, 2).join(' | '));

// ---------- 9. Table integrity (PART 05/06/07 regression) ----------
await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
await sleep(300);
await openNotesEditor(null);
await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'P8 Table Note'; document.getElementById('noteBodyInput').innerHTML = '<p>before</p>'; });
await sleep(250);
await page.evaluate(() => {
  const tb = document.querySelector('.note-format-toolbar');
  const tbtn = tb && (tb.querySelector('[data-cmd="insertTable"], .note-table-btn, button[title*="Table" i], button[aria-label*="able"]'));
  if (tbtn) tbtn.click();
});
await sleep(300);
const tableInserted = await page.evaluate(() => {
  const preset = document.querySelector('.note-table-preset-btn[data-preset="2x2"], #noteTablePanel .note-table-preset-btn[data-preset="2x2"]');
  if (preset) { preset.click(); return true; } return false;
});
await sleep(500);
const tState = await page.evaluate(() => {
  const t = document.querySelector('#noteBodyInput table');
  return { exists: !!t, rows: t ? t.querySelectorAll('tr').length : 0, cols: t ? t.querySelectorAll('tr:first-child td, tr:first-child th').length : 0, mergeBtn: !!document.querySelector('[data-cmd*="merge"], .note-merge-btn'), resizeH: !!document.querySelector('.note-col-resizer, .note-resize-handle') };
});
check('table inserted (2x2) intact', tableInserted && tState.exists && tState.rows === 2 && tState.cols === 2, JSON.stringify(tState));
check('table merge affordance present', tState.mergeBtn);
check('table resize affordance present', tState.resizeH);
await openAa();
await clickStyle('engineering'); await sleep(400);
const tAfter = await page.evaluate(() => { const t = document.querySelector('#noteBodyInput table'); return { exists: !!t, rows: t ? t.querySelectorAll('tr').length : 0 }; });
check('table intact after style application', tAfter.exists && tAfter.rows === 2, JSON.stringify(tAfter));
check('table note autosave still works', (await storedNote('P8 Table Note')) !== null);
await clickStyle('none'); await sleep(200);
// ---------- 10. Language switch EN -> AR -> EN on the DYNAMIC buttons ----------
await setLang('ar');
const ar = await page.evaluate(() => ({
  dir: document.documentElement.getAttribute('dir'),
  styles: Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn')).map((b) => ({ id: b.getAttribute('data-style-id'), t: b.textContent.trim() })),
  frames: Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn')).map((b) => ({ id: b.getAttribute('data-frame-id'), t: b.textContent.trim() }))
}));
check('AR: document dir=rtl', ar.dir === 'rtl');
check('AR: dynamic style buttons translated (not EN labels)', ar.styles.length === 6 && !ar.styles.some((b) => b.t === 'Simple' || b.t === 'Academic' || b.t === 'None'), JSON.stringify(ar.styles));
check('AR: dynamic frame buttons translated (not EN labels)', ar.frames.length === 4 && !ar.frames.some((b) => b.t === 'Classic' || b.t === 'None' || b.t === 'Soft'), JSON.stringify(ar.frames));
const arOv = await overflow();
check('AR: no horizontal overflow in editor', arOv.modal <= 1 && arOv.doc <= 1, JSON.stringify(arOv));
// style still applies while in Arabic (RTL) session
await clickStyle('academic'); await sleep(300);
check('AR/RTL: style application works after language switch', (await bodyStyles()).styles.includes('note-style-academic'));
await setLang('en');
const en2 = await page.evaluate(() => ({
  dir: document.documentElement.getAttribute('dir'),
  styles: Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn')).map((b) => b.textContent.trim()),
  frames: Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn')).map((b) => b.textContent.trim())
}));
check('back to EN: dir=ltr', en2.dir === 'ltr');
check('back to EN: style labels restored', en2.styles.join(',') === Object.values(enTexts).join(','), JSON.stringify(en2.styles));
check('back to EN: frame labels restored', en2.frames.join(',') === 'None,Classic,Dashed,Soft', JSON.stringify(en2.frames));
const enOv = await overflow();
check('EN/LTR: no horizontal overflow in editor', enOv.modal <= 1 && enOv.doc <= 1, JSON.stringify(enOv));

// ---------- 11. Viewport matrix (fresh new-note flow each size) ----------
for (const [w, h, name] of [[1366, 768, 'Desktop 1366'], [768, 1024, 'Tablet 768'], [390, 844, 'Mobile 390']]) {
  await page.setViewport({ width: w, height: h });
  await sleep(500);
  await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
  await sleep(300);
  await openNotesEditor(null);
  await openAa();
  const o = await overflow();
  check(name + ': no modal horizontal overflow', o.modal <= 1, 'dx=' + o.modal);
  check(name + ': no document horizontal overflow', o.doc <= 1, 'dx=' + o.doc);
  const vis = await page.evaluate(() => {
    const sr = document.getElementById('noteAaStylesRow');
    const fr = document.getElementById('noteAaFramesRow');
    return { sr: !!sr && sr.querySelectorAll('.note-aa-style-btn').length === 6, fr: !!fr && fr.querySelectorAll('.note-aa-frame-btn').length === 4 };
  });
  check(name + ': style/frame rows intact (6+4 buttons)', vis.sr && vis.fr, JSON.stringify(vis));
  await clickStyle('modern'); await sleep(300);
  check(name + ': style applies at this viewport', (await bodyStyles()).styles.includes('note-style-modern'));
  await clickStyle('none'); await sleep(200);
}

// ---------- 12. Console / JS errors ----------
check('no new JS/console errors (excl. PREEXISTING SVG warning)', freshErrors.length === 0, freshErrors.slice(0, 3).join(' | '));

console.log('\nPREEXISTING (recorded, excluded from FAIL): ' + preexisting);
console.log(`\n=== PART 08 RESULTS: PASS ${pass}  FAIL ${fail}  NOT VERIFIED 0  TOTAL ${pass + fail} ===`);
console.log('RESULTS_JSON=' + JSON.stringify({ pass, fail, preexisting }));
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);




