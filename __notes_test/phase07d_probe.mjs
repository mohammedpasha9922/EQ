// PHASE 07D — Text Color (A) button — focused live probe.
// Reproduces the real-world flow where the native color picker steals focus and
// collapses the editor selection, then verifies the color is applied ONLY to the
// exact selected text (never the whole note / unrelated cell), and persists.
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
const PORT = 8617;

let fail = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!ok) fail++;
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!urlPath || urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(ROOT, urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': (mime[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(filePath));
  } catch (e) {
    if (!res.headersSent) { res.writeHead(404); res.end('not found'); }
  }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pageErrors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

async function runScenario(label, page) {
  console.log(`\n==== ${label} ====`);
  const cid = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    const cell = t.querySelectorAll('tr')[0].querySelectorAll('td')[0];
    cell.innerHTML = 'HelloWorld';
    const textNode = cell.firstChild;
    const rng = document.createRange();
    rng.setStart(textNode, 0);
    rng.setEnd(textNode, 5); // "Hello"
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rng);
    return sel.toString();
  });
  check(`${label}: 'Hello' is selected`, cid === 'Hello', 'got=' + cid);

  // Press the A button. The click handler calls preserveActiveSelectionRange()
  // BEFORE showPicker, so the range is captured before the picker steals focus.
  await page.evaluate(() => {
    const btn = document.getElementById('noteTextColorBtn');
    const input = document.getElementById('noteTextColorInput');
    input.showPicker = () => { window.__showPickerCalled = true; };
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    btn.click();
  });
  const pickerCalled = await page.evaluate(() => window.__showPickerCalled === true);
  check(`${label}: button opened color picker (showPicker)`, pickerCalled, 'showPicker not invoked');

  const cellBgBefore = await page.evaluate(() => getComputedStyle(document.querySelector('table.note-table tr td')).backgroundColor);

  // Simulate the native picker stealing focus and collapsing the editor selection.
  await page.evaluate(() => { window.getSelection().removeAllRanges(); });
  const selAfter = await page.evaluate(() => window.getSelection().toString());
  check(`${label}: picker collapsed the selection (focus stolen)`, selAfter === '', 'got=' + selAfter);

  // User picks a color in the native picker -> the input 'input' event fires.
  await page.evaluate(() => {
    const input = document.getElementById('noteTextColorInput');
    input.value = '#ff0000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);

  const textContent = await page.evaluate(() => document.querySelector('table.note-table tr td').textContent);
  check(`${label}: text content unchanged 'HelloWorld'`, String(textContent).replace(/\u200b/g, '') === 'HelloWorld', 'got=' + textContent);

  const colored = await page.evaluate(() => {
    const cell = document.querySelector('table.note-table tr td');
    return Array.from(cell.querySelectorAll('span, font')).filter((el) => {
      const c = getComputedStyle(el).color;
      return /255,\s*0,\s*0/.test(c);
    }).map((el) => el.textContent);
  });
  check(`${label}: red applied ONLY to 'Hello'`, colored.length === 1 && colored[0] === 'Hello', 'got=' + JSON.stringify(colored));
  const worldRed = await page.evaluate(() => {
    const cell = document.querySelector('table.note-table tr td');
    return Array.from(cell.querySelectorAll('span, font')).some((el) => /255,\s*0,\s*0/.test(getComputedStyle(el).color) && /World/.test(el.textContent));
  });
  check(`${label}: 'World' NOT recolored`, !worldRed, 'World red?');

  const notes = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]'), STORAGE_KEY);
  const stored = notes.some((n) => n.bodyBlocks && n.bodyBlocks.some((b) =>
    b.type === 'table' && b.rows && b.rows[0][0] && Array.isArray(b.rows[0][0].formatting) && b.rows[0][0].formatting.some((r) => r.color === '#ff0000')));
  check(`${label}: color persisted in formatting model`, stored, 'notes=' + notes.length);

  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('table.note-table tr td')).backgroundColor);
  check(`${label}: cell background unchanged`, bg === cellBgBefore, 'bg=' + bg + ' before=' + cellBgBefore);
}

async function runFallbackScenario(label, page) {
  // Simulates a browser WITHOUT showPicker() (e.g. older Safari/iOS): the A
  // button must open the REAL native picker via a programmatic click on the
  // color input, and must NEVER apply a default color automatically.
  console.log(`\n==== ${label} (fallback: no showPicker) ====`);
  const cid = await page.evaluate(() => {
    const t = document.querySelector('table.note-table');
    const cell = t.querySelectorAll('tr')[0].querySelectorAll('td')[0];
    cell.innerHTML = 'HelloWorld';
    const textNode = cell.firstChild;
    const rng = document.createRange();
    rng.setStart(textNode, 0);
    rng.setEnd(textNode, 5);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rng);
    return sel.toString();
  });
  check(`${label}: 'Hello' selected before A`, cid === 'Hello', 'got=' + cid);

  // Force the fallback path and instrument the input's real click().
  await page.evaluate(() => {
    const input = document.getElementById('noteTextColorInput');
    input.showPicker = undefined;
    window.__inputClickedForA = false;
    input.addEventListener('click', () => { window.__inputClickedForA = true; }, { capture: true });
  });

  const codeBefore = await page.evaluate(() => document.querySelector('table.note-table tr td').innerHTML);

  await page.evaluate(() => {
    const btn = document.getElementById('noteTextColorBtn');
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    btn.click();
  });
  await sleep(200);

  const codeAfter = await page.evaluate(() => document.querySelector('table.note-table tr td').innerHTML);
  check(`${label}: pressing A did NOT apply any default color`, codeAfter === codeBefore, 'changed: ' + codeAfter);

  const inputClicked = await page.evaluate(() => window.__inputClickedForA === true);
  check(`${label}: fallback attempted to open the real color input`, inputClicked, 'input click not seen');

  // Headless cannot operate the OS-native picker. Simulate the user's choice.
  await page.evaluate(() => {
    const input = document.getElementById('noteTextColorInput');
    input.value = '#ff0000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(300);

  const colored = await page.evaluate(() => {
    const cell = document.querySelector('table.note-table tr td');
    return Array.from(cell.querySelectorAll('span, font')).filter((el) =>
      /255,\s*0,\s*0/.test(getComputedStyle(el).color)).map((el) => el.textContent);
  });
  check(`${label}: red applied ONLY to 'Hello' via fallback`, colored.length === 1 && colored[0] === 'Hello', 'got=' + JSON.stringify(colored));

  const textContent = await page.evaluate(() => document.querySelector('table.note-table tr td').textContent);
  check(`${label}: text content unchanged 'HelloWorld'`, String(textContent).replace(/\u200b/g, '') === 'HelloWorld', 'got=' + textContent);
}


try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.error('[PAGEERROR]', 'Desktop', e.message); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(300);

  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); if (b) b.focus(); });
  await page.click('#noteTableBtn');
  await page.evaluate(() => {
    const r = document.getElementById('noteTableRows'); if (r) r.value = '2';
    const c = document.getElementById('noteTableCols'); if (c) c.value = '2';
  });
  await page.click('#noteTableInsertBtn');
  await page.waitForSelector('table.note-table', { visible: true, timeout: 5000 });
  await sleep(300);

  await runScenario('Desktop', page);
  await runFallbackScenario('Desktop', page);
  await page.close();

  const mob = await browser.newPage();
  await mob.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
    mob.on('pageerror', (e) => { pageErrors.push(e.message); console.error('[PAGEERROR]', 'Mobile(coarse-pointer)', e.message); });
  await mob.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await mob.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await mob.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(300);
  await mob.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await mob.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
  await mob.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await mob.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
  await mob.evaluate(() => { document.getElementById('noteBodyInput').focus(); });
  await mob.click('#noteTableBtn');
  await mob.evaluate(() => { document.getElementById('noteTableRows').value = '2'; document.getElementById('noteTableCols').value = '2'; });
  await mob.click('#noteTableInsertBtn');
  await mob.waitForSelector('table.note-table', { visible: true, timeout: 5000 });
  await sleep(300);
  await runScenario('Mobile(coarse-pointer)', mob);

  await runFallbackScenario('Mobile(coarse-pointer)', mob);
  check('No page/JS errors', pageErrors.length === 0, pageErrors.join(' | '));
  console.log('\nPHASE 07D SUMMARY failures=' + fail);
} finally {
  if (browser) await browser.close();
  server.close();
}
process.exitCode = fail ? 1 : 0;