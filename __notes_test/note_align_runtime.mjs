// Notes text-alignment runtime probe: buttons exist/clickable, justifyLeft/
// Center/Right visually align the paragraph, and the alignment SURVIVES
// save → close → reopen (extract→storage→buildNoteBodyHTML round-trip).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8412;
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${(!ok && detail) ? '  -> ' + detail : ''}`); }

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (err) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(250);

  // 1-2. Buttons exist in the EXISTING toolbar, styled like the others.
  const btns = await page.evaluate(() => {
    const ids = ['noteAlignLeftBtn', 'noteAlignCenterBtn', 'noteAlignRightBtn'];
    const bold = document.getElementById('noteBoldBtn');
    return ids.map((id) => {
      const b = document.getElementById(id);
      if (!b) return { id, ok: false };
      const r = b.getBoundingClientRect();
      return { id, ok: r.width > 0 && r.height > 0 && !b.disabled, dataFormat: b.dataset.format, sameClass: b.className === bold.className, inToolbar: !!b.closest('.note-format-toolbar') };
    });
  });
  check('Three align buttons present, visible, enabled', btns.length === 3 && btns.every((b) => b.ok), JSON.stringify(btns));
  check('Buttons reuse the existing toolbar + .note-format-btn styling', btns.every((b) => b.sameClass && b.inToolbar && /^(justifyLeft|justifyCenter|justifyRight)$/.test(b.dataFormat)), JSON.stringify(btns.map((b) => [b.dataFormat, b.sameClass, b.inToolbar])));

  // Type a paragraph and select it.
  await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    body.innerHTML = '<div>مرحبا Hello 1234567890 mixed @#$</div>';
    body.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(body);
    sel.removeAllRanges();
    sel.addRange(range);
  });
  await sleep(120);
  const clickFormat = async (id) => { await page.evaluate((i) => { document.getElementById(i).click(); }, id); await sleep(200); };

  // 3-4. Center alignment applied visually, text unchanged.
  await clickFormat('noteAlignCenterBtn');
  const afterCenter = await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const cs = getComputedStyle(body.firstElementChild || body);
    return { align: cs.textAlign, text: body.textContent };
  });
  check('Align Center visually applied', /^(center)$/.test(afterCenter.align), afterCenter.align);
  check('Center alignment did not delete the text', afterCenter.text.indexOf('مرحبا Hello 1234567890 mixed @#$') !== -1, afterCenter.text);

  // 5. Save → storage run carries align.
  await page.evaluate(() => { if (typeof saveCurrentOpenNote === 'function') saveCurrentOpenNote(); });
  await sleep(700);
  const stored = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]');
    const notes = Array.isArray(raw) ? raw : (raw.notes || []);
    const withAlign = notes.filter((n) => (JSON.stringify(n.formatting || '') + JSON.stringify(n.bodyFormatting || '') + JSON.stringify(n.bodyBlocks || '')).includes('align'));
    return { anyAlign: withAlign.length > 0, count: notes.length };
  });
  check('Stored formatting run carries align:center', stored.anyAlign, JSON.stringify(stored));

  // 6. Close + reopen → alignment survives the round-trip.
  await page.evaluate(() => { if (typeof closeFullScreenNote === 'function') closeFullScreenNote(); });
  await sleep(600);
  await page.evaluate(() => {
    const row = document.querySelector('#notesManagerModal .note-item, #notesManagerModal [data-note-id], #notesManagerModal .notes-list-item');
    if (row) row.click();
  });
  await sleep(700);
  const reopened = await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const el = body.firstElementChild || body;
    const cs = getComputedStyle(el);
    return { open: document.getElementById('fullScreenNoteModal').classList.contains('show'), align: cs.textAlign, text: body.textContent };
  });
  check('Note reopened', !!reopened.open, String(reopened.open));
  check('Alignment SURVIVES save → close → reopen', /^(center)$/.test(reopened.align), JSON.stringify(reopened));

  // RTL/LTR physical alignment + no errors.
  await clickFormat('noteAlignRightBtn');
  const afterRight = await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const el = body.firstElementChild || body;
    return { dir: getComputedStyle(body).direction, align: getComputedStyle(el).textAlign, text: body.textContent };
  });
  check('Align Right works (physical right, Arabic intact)', /^(right)$/.test(afterRight.align) && afterRight.text.indexOf('مرحبا') !== -1, JSON.stringify(afterRight));
  await clickFormat('noteAlignLeftBtn');
  const afterLeft = await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const el = body.firstElementChild || body;
    return getComputedStyle(el).textAlign;
  });
  check('Align Left restores left', /^(left|start)$/.test(afterLeft), afterLeft);

  const newErrs = pageErrors.filter((e) => !/favicon|net::ERR_|404|<path> attribute d/i.test(e));
  check('No JavaScript errors', newErrs.length === 0, JSON.stringify(newErrs).slice(0, 300));
  console.log('SUMMARY ' + JSON.stringify({ pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length }));
} finally {
  if (browser) { try { await browser.close(); } catch (e) {} }
  try { server.close(); } catch (e) {}
}

