// PART 08 verification part 1: structure, i18n attrs, styles, frames, overrides, autosave
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
  await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(300);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(150);
}
async function openAa() {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-i18n="noteAaBtn"]') || document.getElementById('noteAaButton') || document.querySelector('.note-aa-btn');
    (btn || document.querySelector('.note-aa-btn')).click();
  });
  await sleep(250);
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
async function storedNote(title) {
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
  await sleep(400);
}
export const H = { page, check, openApp, openAa, clickStyle, clickFrame, bodyStyles, storedNote, setLang, sleep, counters: () => ({ pass, fail, preexisting, freshErrors }), addPass: () => pass++, addFail: () => fail++ };
export { fail, pass, preexisting, freshErrors, server, browser };

// ==================== TESTS ====================
await H.openApp();
await H.page.evaluate(() => { document.getElementById('noteTitleInput').value = 'P8 Full Verify'; });
await H.openAa();
const ui = await H.page.evaluate(() => {
  const s = Array.from(document.querySelectorAll('#noteAaStylesRow .note-aa-style-btn'));
  const f = Array.from(document.querySelectorAll('#noteAaFramesRow .note-aa-frame-btn'));
  const map = (b) => ({ id: b.getAttribute(b.className.includes('style') ? 'data-style-id' : 'data-frame-id'), i18n: b.getAttribute('data-i18n'), text: b.textContent.trim(), aria: b.getAttribute('aria-label'), title: b.title });
  return { styles: s.map(map), frames: f.map(map) };
});
const enTexts = { simple: 'Simple', academic: 'Academic', business: 'Business', engineering: 'Engineering', modern: 'Modern', none: 'None' };
H.check('style row: 6 style buttons (5 styles + none)', ui.styles.length === 6 && ['simple','academic','business','engineering','modern','none'].every((x) => ui.styles.some((b) => b.id === x)), JSON.stringify(ui.styles.map((b) => b.id)));
H.check('frame row: 4 frame buttons (none/classic/dashed/soft)', ui.frames.length === 4 && ['none','classic','dashed','soft'].every((x) => ui.frames.some((b) => b.id === x)), JSON.stringify(ui.frames.map((b) => b.id)));
H.check('all style buttons carry data-i18n', ui.styles.every((b) => b.i18n), JSON.stringify(ui.styles.map((b) => b.i18n)));
H.check('all frame buttons carry data-i18n', ui.frames.every((b) => b.i18n), JSON.stringify(ui.frames.map((b) => b.i18n)));
H.check('all style buttons have aria-label + title', ui.styles.every((b) => b.aria && b.title));
H.check('all frame buttons have aria-label + title', ui.frames.every((b) => b.aria && b.title));
H.check('None style button keeps note-aa-style-none class', await H.page.evaluate(() => { const b = document.querySelector('#noteAaStylesRow .note-aa-style-btn[data-style-id="none"]'); return !!b && b.classList.contains('note-aa-style-none'); }));
H.check('EN: style button labels correct via setLanguage', ui.styles.every((b) => b.text === enTexts[b.id]), JSON.stringify(ui.styles.map((b) => b.id + '=' + b.text)));

for (const id of ['simple', 'academic', 'business', 'engineering', 'modern']) {
  await H.clickStyle(id); await H.sleep(300);
  const b = await H.bodyStyles();
  H.check('style applied+active: ' + id, b.styles.length === 1 && b.styles[0] === 'note-style-' + id && b.activeS[0] === id, JSON.stringify({ s: b.styles, a: b.activeS }));
}
await H.clickStyle('none'); await H.sleep(800);
const bNone = await H.bodyStyles();
const noneNote = await H.storedNote('P8 Full Verify');
H.check('None style removes all style classes + active + saved', bNone.styles.length === 0 && noneNote?.noteStyle === 'none' && bNone.activeS[0] === 'none', JSON.stringify({ s: bNone.styles, st: noneNote?.noteStyle }));

for (const id of ['classic', 'dashed', 'soft']) {
  await H.clickFrame(id); await H.sleep(300);
  const b = await H.bodyStyles();
  H.check('frame applied+active: ' + id, b.frames.length === 1 && b.frames[0] === 'note-frame-' + id && b.activeF[0] === id, JSON.stringify({ f: b.frames, a: b.activeF }));
}
await H.clickFrame('none'); await H.sleep(800);
const bfNone = await H.bodyStyles();
const fnNote = await H.storedNote('P8 Full Verify');
H.check('frame none clears frames, noteFrame saved empty', bfNone.frames.length === 0 && fnNote?.noteFrame === '' && bfNone.activeF[0] === 'none', JSON.stringify({ f: bfNone.frames, nf: fnNote?.noteFrame }));


await H.page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  el.innerHTML = 'Hello <b>manual-bold</b> world';
  el.focus();
  const range = document.createRange(); range.selectNodeContents(el);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  document.execCommand('foreColor', false, '#d93025');
});
await H.clickStyle('academic'); await H.sleep(300);
const manual = await H.page.evaluate(() => {
  const el = document.getElementById('noteBodyInput');
  const bold = el.querySelector('b');
  const colored = Array.from(el.querySelectorAll('span[style*="d93025"], font[color]')).length > 0 || /d93025/i.test(el.innerHTML);
  return { bold: !!bold && bold.textContent === 'manual-bold', colored, html: el.innerHTML.slice(0, 100) };
});
H.check('manual bold override survives style change', manual.bold, manual.html);
H.check('manual color override survives style change', manual.colored);
H.check('manual content intact after style change', await H.page.evaluate(() => document.getElementById('noteBodyInput').textContent.includes('Hello') && document.getElementById('noteBodyInput').textContent.includes('manual-bold')));

await H.clickFrame('classic'); await H.clickStyle('business'); await H.sleep(600);
const saved = await H.storedNote('P8 Full Verify');
H.check('autosave persisted noteStyle=business', saved?.noteStyle === 'business', JSON.stringify({ style: saved?.noteStyle, frame: saved?.noteFrame }));
H.check('autosave persisted noteFrame=classic', saved?.noteFrame === 'classic');

console.log('RESULTS_JSON=' + JSON.stringify(H.counters()));
await browser.close(); server.close();
process.exit(H.counters().fail === 0 ? 0 : 1);
