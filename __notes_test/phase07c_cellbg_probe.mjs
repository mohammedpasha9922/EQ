// PHASE 07C - Cell Background Color button - focused live probe.
// Existing tests PASS because they manually dispatch 'input' on the color input,
// bypassing the real native color picker. This probe does NOT do that: it presses
// the real button and checks whether showPicker() actually runs and whether the
// native color picker opens / fires input on its own.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const PORT = 8733;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fail = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fail++;
}

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const ext = path.extname(f).toLowerCase();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': (mime[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) {
    if (!res.headersSent) { res.writeHead(404); res.end('nf'); }
  }
});
await new Promise((r) => server.listen(PORT, r));

// Instrument showPicker() BEFORE app.js loads (app.js is a module so it runs
// after this document-created script). Delegates to the real implementation so
// behavior is preserved, but records whether it is called / throws, and the
// input's layout state at call time.
const INSTRUMENT = `
  (() => {
    window.__diag = { calls: 0, threw: null, result: 'not-called', lastCall: null, inputs: [] };
    const orig = HTMLInputElement.prototype.showPicker;
    window.__diag.origType = typeof orig;
    if (typeof orig === 'function') {
      HTMLInputElement.prototype.showPicker = function () {
        window.__diag.calls++;
        const el = this;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        window.__diag.lastCall = {
          id: el.id, type: el.type,
          offsetParentNull: el.offsetParent === null,
          display: cs.display, visibility: cs.visibility,
          opacity: cs.opacity, pointerEvents: cs.pointerEvents,
          rectW: Math.round(r.width * 100) / 100, rectH: Math.round(r.height * 100) / 100,
          rectX: Math.round(r.x), rectY: Math.round(r.y)
        };
        try {
          const res = orig.call(el);
          window.__diag.result = 'ok';
          return res;
        } catch (e) {
          window.__diag.result = 'threw';
          window.__diag.threw = e.name + ': ' + e.message;
          throw e;
        }
      };
    }
    document.addEventListener('input', (e) => {
      if (e.target && e.target.id) window.__diag.inputs.push(e.target.id + '=' + e.target.value);
    }, true);
    document.addEventListener('focus', (e) => {
      if (e.target && e.target.id) window.__diag.inputs.push('focus:' + e.target.id);
    }, true);
  })();
`;

async function openNotes(page) {
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
}
async function newNote(page) {
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
}
async function insert1x2(page) {
  await page.evaluate(() => {
    const b = document.getElementById('noteBodyInput'); if (b) b.focus();
    const tb = document.getElementById('noteTableBtn');
    if (tb) tb.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  });
  await page.click('#noteTableBtn');
  await page.evaluate(() => { document.getElementById('noteTableRows').value = '1'; document.getElementById('noteTableCols').value = '2'; document.getElementById('noteTableHeader').checked = false; });
  await page.click('#noteTableInsertBtn');
  await page.waitForSelector('table.note-table', { visible: true, timeout: 3000 });
  await page.evaluate(() => {
    const cells = document.querySelectorAll('table.note-table tr td');
    if (cells[0]) cells[0].textContent = 'LEFT';
    if (cells[1]) cells[1].textContent = 'RIGHT';
  });
}
async function runScenario(label, page, mobile) {
  console.log(`\n==== ${label} ====`);
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  await openNotes(page);
  await newNote(page);
  await page.evaluate(() => { document.getElementById('noteTitleInput').value = 'CellBg Probe'; });
  await insert1x2(page);
  await sleep(300);

  // Reset diagnostics just before the interaction.
  await page.evaluate(() => { window.__diag = { calls: 0, threw: null, result: 'not-called', lastCall: null, inputs: [], origType: (window.__diag && window.__diag.origType) || '?' }; });

  // Real click on cell[0] to select it (mousedown handler -> setCellSelection).
  const cell0 = await page.$('table.note-table tr td:nth-child(1)');
  const box = await cell0.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(200);

  const buttonState = await page.evaluate(() => {
    const btn = document.getElementById('noteCellBgColorBtn');
    return { exists: !!btn, disabled: btn ? btn.disabled : null, activeSel: !!document.querySelector('.note-cell-selected') };
  });
  check(`${label}: Cell Color button exists`, buttonState.exists === true);
  check(`${label}: Cell Color button enabled after cell click`, buttonState.disabled === false, 'disabled=' + buttonState.disabled);

  const before = await page.evaluate(() => document.querySelector('table.note-table tr td').style.backgroundColor || '(none)');

  // Press the real Cell Color button.
  await page.click('#noteCellBgColorBtn');
  await sleep(400);

  const diag = await page.evaluate(() => window.__diag);
  const bgAfterClickNoPick = await page.evaluate(() => document.querySelector('table.note-table tr td').style.backgroundColor || '(none)');
  const activeEl = await page.evaluate(() => (document.activeElement && (document.activeElement.id || document.activeElement.tagName)) || 'none');

  check(`${label}: showPicker is a function on input`, diag.origType === 'function', 'origType=' + diag.origType);
  check(`${label}: showPicker() was invoked by the button`, diag.calls >= 1, 'calls=' + diag.calls);
  check(`${label}: showPicker() did NOT throw`, !diag.threw, 'threw=' + diag.threw);
  check(`${label}: showPicker() input layout rendered`, !diag.lastCall || diag.lastCall.display !== 'none', 'lastCall=' + JSON.stringify(diag.lastCall));
  console.log(`   [${label}] showPicker call detail = ${JSON.stringify(diag.lastCall)}`);

  // Control: does this Chrome require transient user activation for showPicker?
  // A deferred (no-gesture) call should throw NotAllowedError; a real click should not.
  const control = await page.evaluate(async () => {
    const input = document.getElementById('noteCellBgColorInput');
    const out = { deferred: null, syntheticClick: null };
    try {
      await new Promise((r) => setTimeout(r, 30));
      input.showPicker();
      out.deferred = 'no-throw';
    } catch (e) { out.deferred = e.name + ': ' + e.message; }
    try {
      input.click();
      out.syntheticClick = 'no-throw';
    } catch (e) { out.syntheticClick = e.name + ': ' + e.message; }
    return out;
  });
  console.log(`   [${label}] activation control (deferred / synthetic click) = ${JSON.stringify(control)}`);

  // Without a human picking a color, did the picker fire any input on its own?
  check(`${label}: native picker fired input WITHOUT manual dispatch`, diag.inputs.length > 0, 'inputs=' + JSON.stringify(diag.inputs));
  check(`${label}: color NOT applied just by opening picker (human must pick)`, bgAfterClickNoPick === '(none)', 'bg=' + bgAfterClickNoPick);
  console.log(`   [${label}] activeElement after button click = ${activeEl}`);

  // Simulate a real human picking a color (value change -> input). Isolates apply+persist from picker.
  await page.evaluate(() => {
    const i = document.getElementById('noteCellBgColorInput');
    i.value = '#00ccff';
    i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(200);
  const bgApplied = await page.evaluate(() => document.querySelector('table.note-table tr td').style.backgroundColor || '(none)');
  const bgNeighbor = await page.evaluate(() => document.querySelector('table.note-table tr td:nth-child(2)').style.backgroundColor || '(none)');
  const textLeft = await page.evaluate(() => document.querySelector('table.note-table tr td').textContent);
  check(`${label}: input event applies bg to selected cell`, bgApplied === 'rgb(0, 204, 255)', 'bg=' + bgApplied);
  check(`${label}: neighbor cell unchanged`, bgNeighbor === '(none)', 'neighbor=' + bgNeighbor);
  check(`${label}: cell text unchanged`, textLeft === 'LEFT', 'text=' + textLeft);

  // Persistence: wait for autosave, close, reopen the SAVED note from the list.
  await sleep(1200);
  await page.click('#closeFullScreenNote');
  await sleep(400);
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.note-item, [data-note-id], .notes-list-item, .note-card'));
    for (const it of items) {
      if ((it.textContent || '').indexOf('CellBg Probe') !== -1) { it.click(); return; }
    }
    // fallback: click the first note-like element
    const any = document.querySelector('.note-item, [data-note-id], .notes-list-item, .note-card');
    if (any) any.click();
  });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await sleep(500);
  const reopened = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    if (!t) return 'no-table';
    return t.querySelectorAll('tr td')[0].style.backgroundColor || '(none)';
  });
  check(`${label}: color persists after reopen`, reopened === 'rgb(0, 204, 255)', 'reopened=' + reopened);
}

let browser = null;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

  const desktop = await browser.newPage();
  await desktop.setViewport({ width: 1400, height: 1000 });
  desktop.on('pageerror', (e) => console.log(`   [Desktop PAGEERROR] ${e.message}`));
  await desktop.evaluateOnNewDocument(INSTRUMENT);
  await desktop.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await runScenario('Desktop', desktop, false);
  await desktop.close();

  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
  mob.on('pageerror', (e) => console.log(`   [Mobile PAGEERROR] ${e.message}`));
  await mob.evaluateOnNewDocument(INSTRUMENT);
  await mob.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await runScenario('Mobile(coarse-pointer)', mob, true);
  await mob.close();

  console.log('\nPHASE 07C CELLBG PROBE SUMMARY failures=' + fail);
} finally {
  await browser.close();
  server.close();
}
process.exitCode = fail ? 1 : 0;

