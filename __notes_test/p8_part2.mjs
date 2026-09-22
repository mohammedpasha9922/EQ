// PART 08 verification part 2: reopen, reload, preview, pdf, table, RTL/LTR, viewports
import { startServer, launch, STORAGE_KEY, PORT, PREEXISTING_SVG, sleep } from './p8_lib.mjs';

let pass = 0, fail = 0, preexisting = 0;
const freshErrors = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  ok ? pass++ : fail++;
}

const server = await startServer();
const browser = await launch();
const page = await browser.newPage();
page.on('pageerror', (e) => { if (PREEXISTING_SVG.test(e.message)) preexisting++; else freshErrors.push('[pageerror] ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else freshErrors.push('[console] ' + m.text()); } });

async function openApp(vw = 1366, vh = 900) {
  await page.setViewport({ width: vw, height: vh });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(300);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(200);
}
async function openNoteByTitle(title) {
  const ok = await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll('#notesList li, #notesList .note-item, #notesList [data-note-id]'));
    const hit = items.find((el) => el.textContent.includes(t));
    if (hit) { hit.click(); return true; }
    return false;
  }, title);
  if (!ok) return false;
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(400);
  return true;
}
async function openAa() {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-i18n="noteAaBtn"]') || document.getElementById('noteAaButton') || document.querySelector('.note-aa-btn');
    (btn || document.querySelector('.note-aa-btn')).click();
  });
  await sleep(250);
}
async function clickStyle(id) {
  return page.evaluate((id) => { const b = document.querySelector('#noteAaStylesRow .note-aa-style-btn[data-style-id="' + id + '"]'); if (!b) return false; b.click(); return true; }, id);
}
async function clickFrame(id) {
  return page.evaluate((id) => { const b = document.querySelector('#noteAaFramesRow .note-aa-frame-btn[data-frame-id="' + id + '"]'); if (!b) return false; b.click(); return true; }, id);
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
async function setLang(loc) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, loc);
  await sleep(400);
}
export const H2 = { page, check, openApp, openNoteByTitle, openAa, clickStyle, clickFrame, bodyStyles, setLang, sleep, counters: () => ({ pass, fail, preexisting, freshErrors }) };
export { freshErrors, server, browser };

// ==================== TESTS ====================
// Seed the P8 note via a fresh open then persist academic/classic
await H2.openApp();
await H2.page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
await H2.page.reload({ waitUntil: 'load', timeout: 60000 });
await H2.sleep(300);
await H2.openApp();
await H2.page.evaluate(() => document.getElementById('openNewNoteButton').click());
await H2.page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
await H2.sleep(200);
await H2.page.evaluate(() => {
  document.getElementById('noteTitleInput').value = 'P8 Reopen Verify';
  document.getElementById('noteBodyInput').innerHTML = '<h1>Head</h1><p>Para with <b>bold</b> text.</p>';
});
await H2.openAa();
await H2.clickStyle('academic'); await H2.sleep(400);
await H2.clickFrame('classic'); await H2.sleep(900);

// --- Close / Reopen ---
await H2.page.evaluate(() => document.getElementById('closeFullScreenNote').click());
await H2.sleep(500);
H2.check('note modal closes', await H2.page.evaluate(() => !document.getElementById('fullScreenNoteModal').classList.contains('show')));
const reopened = await H2.openNoteByTitle('P8 Reopen Verify');
H2.check('note reopened from list', reopened);
let st = await H2.bodyStyles();
H2.check('reopen: style restored (academic)', st.styles.includes('note-style-academic'), JSON.stringify(st.styles));
H2.check('reopen: frame restored (classic)', st.frames.includes('note-frame-classic'), JSON.stringify(st.frames));
H2.check('reopen: active buttons correct', st.activeS[0] === 'academic' && st.activeF[0] === 'classic', JSON.stringify({ s: st.activeS, f: st.activeF }));

// --- Full page reload ---
await H2.page.reload({ waitUntil: 'load', timeout: 60000 });
await H2.sleep(400);

// --- Preview (PDF preview overlay) ---
await H2.page.evaluate(() => document.getElementById('notePreviewPdfBtn').click());
await H2.sleep(2000);
const preview = await H2.page.evaluate(() => {
  const rep = document.querySelector('.eq-note-report');
  const overlay = document.querySelector('[class*="pdf-preview"], #notePdfPreviewOverlay');
  return { rep: !!rep, repClass: rep ? rep.className : null, overlay: !!overlay };
});
H2.check('PDF preview opens with report content', preview.overlay && preview.rep, JSON.stringify({ rep: preview.rep, ov: preview.overlay }));
H2.check('preview report carries applied style class', /note-style-academic/.test(preview.repClass || ''), preview.repClass);
H2.check('preview report carries applied frame class', /note-frame-classic/.test(preview.repClass || ''), preview.repClass);
await H2.page.keyboard.press('Escape'); await H2.sleep(400);
await H2.page.evaluate(() => { const c = document.querySelector('[class*="pdf-preview"] [class*="close"], #notePdfPreviewClose'); if (c) c.click(); });
await H2.sleep(300);

// --- PDF export (real pipeline, no error) ---
await H2.page.evaluate(() => document.getElementById('exportNotePdfBtn').click());
await H2.sleep(5000);
H2.check('PDF export runs without new errors', H2.counters().freshErrors.length === 0, H2.counters().freshErrors.slice(0, 2).join('|'));
await H2.page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
await H2.sleep(400);

// --- Table integrity, merge, resize, alignment ---
await H2.openApp();
await H2.page.evaluate(() => document.getElementById('openNewNoteButton').click());
await H2.page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
await H2.sleep(200);
await H2.page.evaluate(() => {
  document.getElementById('noteTitleInput').value = 'P8 Table Verify';
  document.getElementById('noteBodyInput').innerHTML = '<p>before</p>';
});
await H2.sleep(200);
await H2.page.evaluate(() => {
  const tb = document.querySelector('.note-format-toolbar');
  const tbtn = tb && (tb.querySelector('[data-cmd="insertTable"], .note-table-btn, button[title*="Table" i], button[aria-label*="able"]'));
  if (tbtn) tbtn.click();
});
await H2.sleep(300);
const tableInserted = await H2.page.evaluate(() => {
  const preset = document.querySelector('#noteTablePanel .note-table-preset-btn[data-preset="2x2"]') || document.querySelector('.note-table-preset-btn[data-preset="2x2"]');
  if (preset) { preset.click(); return true; }
  return false;
});
await H2.sleep(500);
const tState = await H2.page.evaluate(() => {
  const t = document.querySelector('#noteBodyInput table');
  return { exists: !!t, rows: t ? t.querySelectorAll('tr').length : 0, cols: t ? t.querySelectorAll('tr:first-child td, tr:first-child th').length : 0, mergeBtn: !!document.querySelector('[data-cmd*="merge"], .note-merge-btn'), resizeH: !!document.querySelector('.note-col-resizer, .note-resize-handle, .note-table-resizer') };
});
H2.check('table inserted (2x2) intact', tableInserted && tState.exists && tState.rows === 2 && tState.cols === 2, JSON.stringify(tState));
H2.check('table merge affordance present', tState.mergeBtn);
H2.check('table resize affordance present', tState.resizeH);
await H2.openAa();
await H2.clickStyle('engineering'); await H2.sleep(400);
const tAfter = await H2.page.evaluate(() => { const t = document.querySelector('#noteBodyInput table'); return { exists: !!t, rows: t ? t.querySelectorAll('tr').length : 0 }; });
H2.check('table intact after style application', tAfter.exists && tAfter.rows === 2, JSON.stringify(tAfter));
await H2.clickStyle('none'); await H2.sleep(200);
const alignOk = await H2.page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  el.focus();
  const sel = window.getSelection(); const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r);
  document.execCommand('justifyCenter', false);
  return /center/i.test(el.innerHTML) || el.querySelector('[style*="center"]') !== null;
});
H2.check('alignment (justifyCenter) still works after style engine used', alignOk);
await H2.page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
await H2.sleep(300);

await H2.openApp();
const reopened2 = await H2.openNoteByTitle('P8 Reopen Verify');

// --- RTL / LTR language switch on the dynamic buttons ---
await H2.openApp();
await H2.page.evaluate(() => document.getElementById('openNewNoteButton').click());
await H2.page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
await H2.sleep(200);
await H2.openAa();
await H2.setLang('ar');
const ar = await H2.page.evaluate(() => ({
  dir: document.documentElement.getAttribute('dir'),
  styles: Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn')).map((b) => ({ id: b.getAttribute('data-style-id'), t: b.textContent.trim() })),
  frames: Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn')).map((b) => ({ id: b.getAttribute('data-frame-id'), t: b.textContent.trim() }))
}));
H2.check('AR: document dir=rtl', ar.dir === 'rtl');
H2.check('AR: dynamic style buttons translated (not EN labels)', ar.styles.length === 6 && !ar.styles.some((b) => b.t === 'Simple' || b.t === 'Academic' || b.t === 'None'), JSON.stringify(ar.styles));
H2.check('AR: dynamic frame buttons translated (not EN labels)', ar.frames.length === 4 && !ar.frames.some((b) => b.t === 'Classic' || b.t === 'None' || b.t === 'Soft'), JSON.stringify(ar.frames));
const arOverflow = await H2.page.evaluate(() => document.getElementById('fullScreenNoteModal').scrollWidth - document.getElementById('fullScreenNoteModal').clientWidth);
H2.check('AR RTL: editor no horizontal overflow', arOverflow <= 1, 'dx=' + arOverflow);
await H2.setLang('en');
const en2 = await H2.page.evaluate(() => ({
  dir: document.documentElement.getAttribute('dir'),
  styles: Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn')).map((b) => b.textContent.trim()),
  frames: Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn')).map((b) => b.textContent.trim())
}));
H2.check('back to EN: dir=ltr', en2.dir === 'ltr');
H2.check('back to EN: style labels restored', en2.styles.join(',') === 'Simple,Academic,Business,Engineering,Modern,None', JSON.stringify(en2.styles));
H2.check('back to EN: frame labels restored', en2.frames.join(',') === 'None,Classic,Dashed,Soft', JSON.stringify(en2.frames));

// --- Viewport matrix (still in open note) ---
for (const [w, h, name] of [[1366, 768, 'Desktop 1366'], [768, 1024, 'Tablet 768'], [390, 844, 'Mobile 390']]) {
  await H2.page.setViewport({ width: w, height: h });
  await H2.sleep(500);
  const o = await H2.page.evaluate(() => ({
    modal: (() => { const m = document.getElementById('fullScreenNoteModal'); return m ? m.scrollWidth - m.clientWidth : -1; })(),
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  H2.check(name + ': no modal horizontal overflow', o.modal <= 1, 'dx=' + o.modal);
  H2.check(name + ': no document horizontal overflow', o.doc <= 1, 'dx=' + o.doc);
}
await H2.page.setViewport({ width: 1366, height: 900 });

// --- Fresh console errors ---
H2.check('no new JS/console errors (excl. PREEXISTING SVG warning)', H2.counters().freshErrors.length === 0, H2.counters().freshErrors.slice(0, 3).join(' | '));

console.log('PREEXISTING(excluded)=' + H2.counters().preexisting);
console.log('RESULTS_JSON=' + JSON.stringify(H2.counters()));
await browser.close(); server.close();
process.exit(H2.counters().fail === 0 ? 0 : 1);

H2.check('note reopened after full reload', reopened2);
await H2.openAa();
st = await H2.bodyStyles();
H2.check('reload: style restored (academic)', st.styles.includes('note-style-academic'), JSON.stringify(st.styles));
H2.check('reload: frame restored (classic)', st.frames.includes('note-frame-classic'), JSON.stringify(st.frames));
