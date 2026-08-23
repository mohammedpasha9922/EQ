// NOTES TABLE CONTROL LABELS — localization verification harness (test-only artifact).
// Verifies the rendered table toolbar + border/alignment selects follow the
// app's CURRENT selected language, for EVERY supported locale, plus live switching.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const LANG_KEY = 'eq-language';
const PORT = 8255;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const fp = path.join(ROOT, p);
  const ext = path.extname(p).toLowerCase();
  const mm = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json' };
  try { res.writeHead(200, { 'Content-Type': (mm[ext] || 'application/octet-stream') + '; charset=utf-8' }); res.end(fs.readFileSync(fp)); }
  catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pageError = null;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
page.on('pageerror', (e) => { pageError = (pageError || '') + e.message + '\n'; });
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 25000 });
await page.evaluate((a, b, c) => { localStorage.removeItem(a); localStorage.removeItem(b); localStorage.removeItem(c); }, STORAGE_KEY, FOLDERS_KEY, LANG_KEY);
await page.reload({ waitUntil: 'load', timeout: 25000 });
await sleep(400);

async function setLang(loc) {
  await page.evaluate((l) => {
    const sel = document.getElementById('topBarLanguageSelect');
    if (sel) { sel.value = l; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }, loc);
  await sleep(350);
}
async function openNotes() {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 6000 });
}
async function newNote() {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 6000 });
}
async function closeEditor() { await page.click('#closeFullScreenNote').catch(() => {}); await sleep(180); }
async function closeManager() { await page.click('#closeNotesManager').catch(() => {}); await sleep(180); }
async function clickTableBtn() {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput'); if (b) b.focus();
    const tb = document.getElementById('noteTableBtn'); if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
}
async function insertTable(r, c, header) {
  await page.evaluate((rr, cc, h) => {
    const ri = document.getElementById('noteTableRows'); if (ri) ri.value = rr;
    const ci = document.getElementById('noteTableCols'); if (ci) ci.value = cc;
    const hi = document.getElementById('noteTableHeader'); if (hi) hi.checked = h;
  }, r, c, !!header);
  await page.click('#noteTableInsertBtn');
  await page.waitForFunction(() => !document.getElementById('noteTablePanel') || document.getElementById('noteTablePanel').classList.contains('hidden'), { timeout: 4000 });
  await sleep(250);
}
async function readToolbarLabels() {
  return page.evaluate(() => {
    const g = (a) => { const el = document.querySelector('.note-table-ctl[data-table-action="' + a + '"]'); return el ? el.textContent.trim() : null; };
    const opt = (sel, v) => { const o = document.querySelector(sel + ' option[value="' + v + '"]'); return o ? o.textContent.trim() : null; };
    return {
      addRow: g('add-row'), addCol: g('add-col'), delRow: g('del-row'), delCol: g('del-col'), merge: g('merge-cells'),
      borderAll: opt('[data-table-border-select]', 'all'), borderOutside: opt('[data-table-border-select]', 'outside'),
      borderInside: opt('[data-table-border-select]', 'inside'), borderNone: opt('[data-table-border-select]', 'none'),
      hLeft: opt('[data-table-h-align-select]', 'left'), hCenter: opt('[data-table-h-align-select]', 'center'), hRight: opt('[data-table-h-align-select]', 'right'),
      vTop: opt('[data-table-v-align-select]', 'top'), vMiddle: opt('[data-table-v-align-select]', 'middle'), vBottom: opt('[data-table-v-align-select]', 'bottom')
    };
  });
}
const EXPECT = {
  en: { addRow: '+ Row', addCol: '+ Col', delRow: '- Row', delCol: '- Col', merge: 'Merge Cells', borderAll: 'All Borders', borderOutside: 'Outside Borders', borderInside: 'Inside Borders', borderNone: 'No Borders', hLeft: 'Left', hCenter: 'Center', hRight: 'Right', vTop: 'Top', vMiddle: 'Middle', vBottom: 'Bottom' },
  es: { addRow: '+ Fila', addCol: '+ Columna', delRow: '- Fila', delCol: '- Columna', merge: 'Combinar celdas', borderAll: 'Todos los bordes', borderOutside: 'Fuera de los bordes', borderInside: 'Dentro de los bordes', borderNone: 'Sin bordes', hLeft: 'Izquierda', hCenter: 'Centro', hRight: 'Derecha', vTop: 'Arriba', vMiddle: 'Medio', vBottom: 'Abajo' },
  ar: { addRow: '+ صف', addCol: '+ عمود', delRow: '- صف', delCol: '- عمود', merge: 'دمج الخلايا', borderAll: 'جميع الحدود', borderOutside: 'حدود خارجية', borderInside: 'حدود داخلية', borderNone: 'لا يوجد حد', hLeft: 'يسار', hCenter: 'مركز', hRight: 'يمين', vTop: 'أعلى', vMiddle: 'وسط', vBottom: 'أسفل' },
  fr: { addRow: '+ Ligne', addCol: '+ Colonne', delRow: '- Ligne', delCol: '- Colonne', merge: 'Fusionner les cellules', borderAll: 'Toutes les bordures', borderOutside: 'Bords extérieurs', borderInside: 'Bords intérieurs', borderNone: 'Aucun bord', hLeft: 'Gauche', hCenter: 'Centre', hRight: 'Droite', vTop: 'Top', vMiddle: 'Moyen', vBottom: 'Bas' },
  ru: { addRow: '+ Строка', addCol: '+ Столбец', delRow: '- Строка', delCol: '- Столбец', merge: 'Объединить ячейки', borderAll: 'Все границы', borderOutside: 'Внешние границы', borderInside: 'Внутренние границы', borderNone: 'Без границ', hLeft: 'Лево', hCenter: 'Центр', hRight: 'Право', vTop: 'Верх', vMiddle: 'Средний', vBottom: 'Низ' },
  de: { addRow: '+ Zeile', addCol: '+ Spalte', delRow: '- Zeile', delCol: '- Spalte', merge: 'Zellen zusammenführen', borderAll: 'Alle Ränder', borderOutside: 'Äußere Ränder', borderInside: 'Innere Ränder', borderNone: 'Keine Ränder', hLeft: 'Links', hCenter: 'Mitte', hRight: 'Rechts', vTop: 'Oben', vMiddle: 'Mittig', vBottom: 'Unten' },
  tr: { addRow: '+ Satır', addCol: '+ Sütun', delRow: '- Satır', delCol: '- Sütun', merge: 'Hucreleri Birleştir', borderAll: 'Tüm Sınırlar', borderOutside: 'Dış Sınırlar', borderInside: 'İç Sınırlar', borderNone: 'Sınır Yok', hLeft: 'Sol', hCenter: 'Orta', hRight: 'Sağ', vTop: 'Üst', vMiddle: 'Orta', vBottom: 'Alt' }
};
const LOCALES = ['en', 'es', 'ar', 'fr', 'ru', 'de', 'tr'];
const FIELDS = Object.keys(EXPECT.en);
const FIELD_NAMES = { addRow: '+Row', addCol: '+Col', delRow: '-Row', delCol: '-Col', merge: 'Merge', borderAll: 'BrdAll', borderOutside: 'BrdOut', borderInside: 'BrdIn', borderNone: 'BrdNone', hLeft: 'HLeft', hCenter: 'HCenter', hRight: 'HRight', vTop: 'VTop', vMiddle: 'VMiddle', vBottom: 'VBottom' };
// ---- Per-locale build-time labels ----
for (const loc of LOCALES) {
  await setLang(loc);
  await openNotes();
  await newNote();
  await clickTableBtn();
  await insertTable(2, 2, false);
  const got = await readToolbarLabels();
  const exp = EXPECT[loc];
  let allOk = true;
  for (const f of FIELDS) {
    const ok = got[f] === exp[f];
    if (!ok) allOk = false;
    check(`${loc}: ${FIELD_NAMES[f]} = ${JSON.stringify(exp[f])}`, ok, ok ? '' : `got=${JSON.stringify(got[f])}`);
  }
  check(`${loc}: ALL 15 table control labels localized`, allOk);
  await closeEditor();
  await closeManager();
}

// ---- Live switching (no re-insert / no reload) ----
await setLang('en');
await sleep(200);
await openNotes();
await newNote();
await clickTableBtn();
await insertTable(2, 2, false);
let gotEn = await readToolbarLabels();
check('LIVE: initial EN addRow = "+ Row"', gotEn.addRow === '+ Row', gotEn.addRow);
await setLang('ar');
let gotAr = await readToolbarLabels();
check('LIVE: AR after switch addRow = "+ صف"', gotAr.addRow === '+ صف', gotAr.addRow);
check('LIVE: AR after switch merge = "دمج الخلايا"', gotAr.merge === 'دمج الخلايا', gotAr.merge);
check('LIVE: AR after switch borderAll = "جميع الحدود"', gotAr.borderAll === 'جميع الحدود', gotAr.borderAll);
check('LIVE: AR after switch hCenter = "مركز"', gotAr.hCenter === 'مركز', gotAr.hCenter);
check('LIVE: AR after switch vBottom = "أسفل"', gotAr.vBottom === 'أسفل', gotAr.vBottom);
await setLang('fr');
let gotFr = await readToolbarLabels();
check('LIVE: FR after switch addRow = "+ Ligne"', gotFr.addRow === '+ Ligne', gotFr.addRow);
check('LIVE: FR after switch borderNone = "Aucun bord"', gotFr.borderNone === 'Aucun bord', gotFr.borderNone);
await setLang('en');
let gotEn2 = await readToolbarLabels();
check('LIVE: switch back to EN addRow = "+ Row"', gotEn2.addRow === '+ Row', gotEn2.addRow);

// ---- stored logic values + user content untouched ----
const stored = await page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }, STORAGE_KEY);
let dataOk = true;
for (const n of stored) {
  for (const bb of (n.bodyBlocks || [])) {
    if (bb.type === 'table') {
      const bs = String(bb.borderStyle !== undefined ? bb.borderStyle : 'all');
      const logicOk = ['all', 'outside', 'inside', 'none'].includes(bs);
      if (!logicOk) dataOk = false;
      const ha = JSON.stringify(bb.rows);
      if (ha.includes('جميع الحدود') || ha.includes('All Borders') || ha.includes('Alle') || ha.includes('Todos')) dataOk = false;
    }
  }
}
check('DATA: stored borderStyle values remain logic values (never localized)', dataOk, 'stored=' + JSON.stringify(stored.map((x) => x.bodyBlocks).filter(Boolean).slice(0, 1)));

check('LOC: no JS errors during localization flow', !pageError, 'errors=' + (pageError || 'none'));

console.log('\nTABLE LABELS LOCALIZATION CHECK SUMMARY');
const totals = { pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length };
console.log(JSON.stringify({ totals }, null, 2));
process.exitCode = totals.fail ? 1 : 0;
await page.evaluate((a, b, c) => { localStorage.removeItem(a); localStorage.removeItem(b); localStorage.removeItem(c); }, STORAGE_KEY, FOLDERS_KEY, LANG_KEY);
await browser.close();
server.close();