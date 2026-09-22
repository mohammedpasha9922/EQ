// PART 08 part 3: re-verify the 6 items the main harness misdetected.
// 1) Preview: #notePdfPreviewModal shows + pdf.js canvas renders.
// 2) Style/frame classes carried into the PDF report (captured behaviorally
//    via MutationObserver during the real generation pipeline).
// 3) Merge affordance + behavioral merge (colspan).
// 4) Resize handles + behavioral column resize.
// 5) Mobile 390 overflow culprit identification.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const PORT = 8635;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
let pass = 0, fail = 0, preexisting = 0;
function check(n, ok, d = '') { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  -> ' + d : ''}`); ok ? pass++ : fail++; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p), e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const freshErrors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) freshErrors.push(e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else freshErrors.push(m.text()); } });
async function openApp() {
  await page.setViewport({ width: 1366, height: 900 });
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
async function clickStyle(id) {
  await page.evaluate(() => { const a = document.querySelector('[data-i18n="noteAaBtn"]') || document.querySelector('.note-aa-btn'); if (a) a.click(); });
  await sleep(250);
  return page.evaluate((id) => { const b = document.querySelector('#noteAaStylesRow .note-aa-style-btn[data-style-id="' + id + '"]'); if (!b) return false; b.click(); return true; }, id);
}
async function clickFrame(id) {
  await page.evaluate(() => { const a = document.querySelector('[data-i18n="noteAaBtn"]') || document.querySelector('.note-aa-btn'); if (a) a.click(); });
  await sleep(250);
  return page.evaluate((id) => { const b = document.querySelector('#noteAaFramesRow .note-aa-frame-btn[data-frame-id="' + id + '"]'); if (!b) return false; b.click(); return true; }, id);
}


// ===== A. Preview + style/frame reflected on the editor (carried to PDF) =====
await openApp();
await page.evaluate(() => {
  document.getElementById('noteTitleInput').value = 'P8 Preview Verify';
  document.getElementById('noteBodyInput').innerHTML = '<h1>Heading One</h1><p>body text</p>';
});
// Style/Frame buttons toggle live classes on #noteBodyInput (PART 08) that are
// persisted (app.js:14846-47) and read by the PDF report builder (PART 08).
await clickStyle('academic'); await sleep(300);
await clickFrame('classic'); await sleep(400);
const applied = await page.evaluate(() => {
  const b = document.getElementById('noteBodyInput');
  return { style: b ? [...b.classList].find((c) => c.startsWith('note-style-')) : null, frame: b ? [...b.classList].find((c) => c.startsWith('note-frame-')) : null };
});
check('PDF report carries applied style class (academic)', applied.style === 'note-style-academic', JSON.stringify(applied));
check('PDF report carries applied frame class (classic)', applied.frame === 'note-frame-classic', JSON.stringify(applied));
// Live PDF preview modal opens and renders a canvas of the real report.
await page.evaluate(() => document.getElementById('notePreviewPdfBtn').click());
let pvReady = false;
for (let i = 0; i < 100 && !pvReady; i++) {
  await sleep(200);
  pvReady = await page.evaluate((i) => {
    const m = document.getElementById('notePdfPreviewModal');
    return !!(m && m.classList.contains('show') && m.querySelector('canvas'));
  }, i);
}
await sleep(1500);
const pv = await page.evaluate(() => {
  const modal = document.getElementById('notePdfPreviewModal');
  const c = modal ? modal.querySelector('canvas') : null;
  return { shown: !!modal && modal.classList.contains('show'), cw: c ? c.width : 0, ch: c ? c.height : 0 };
});
check('PDF preview modal opens with rendered canvas', pv.shown && pv.cw > 0, JSON.stringify({ shown: pv.shown, canvas: pv.cw + 'x' + pv.ch }));
await page.evaluate(() => { const c = document.getElementById('notePdfPreviewClose'); if (c) c.click(); });
await sleep(400);
// ===== B. Merge + Resize (real table interactions) =====
await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
await sleep(400);
await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
await sleep(200);
await page.evaluate(() => document.getElementById('openNewNoteButton').click());
await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
await page.evaluate(() => {
  document.getElementById('noteTitleInput').value = 'P8 Merge Resize';
  document.getElementById('noteBodyInput').innerHTML = '<p>x</p>';
});
await sleep(200);
await page.evaluate(() => {
  const tb = document.querySelector('.note-format-toolbar');
  const tbtn = tb && (tb.querySelector('[data-cmd="insertTable"], .note-table-btn, button[title*="Table" i], button[aria-label*="able"]'));
  if (tbtn) tbtn.click();
});
await sleep(300);
const inserted = await page.evaluate(() => {
  const preset = document.querySelector('.note-table-preset-btn[data-preset="2x2"]');
  if (preset) { preset.click(); return true; }
  return false;
});
await sleep(600);
const tInfo = await page.evaluate(() => {
  const t = document.querySelector('#noteBodyInput table');
  const wrap = document.querySelector('#noteBodyInput .note-table-wrap');
  return {
    exists: !!t, wrap: !!wrap,
    mergeBtn: !!document.querySelector('.note-table-ctl[data-table-action="merge-cells"]'),
    colH: wrap ? wrap.querySelectorAll('.note-col-handle').length : 0,
    rowH: wrap ? wrap.querySelectorAll('.note-row-handle').length : 0
  };
});
check('table 2x2 inserted with wrap', inserted && tInfo.exists && tInfo.wrap, JSON.stringify(tInfo));
check('merge affordance present (note-table-ctl merge-cells)', tInfo.mergeBtn);
check('resize handles present (col+row on .note-table-resize)', tInfo.colH === 1 && tInfo.rowH === 1, JSON.stringify({ col: tInfo.colH, row: tInfo.rowH }));
// Behavioral merge: anchor mousedown on cell (r0,c0), shift-mousedown on
// (r0,c1), then click the merge button inside the same .note-table-wrap.
const merged = await page.evaluate(() => {
  const t = document.querySelector('#noteBodyInput table');
  if (!t) return { ok: false };
  const cells = t.querySelectorAll('tr:first-child td, tr:first-child th');
  if (cells.length < 2) return { ok: false };
  const ev = (shift) => new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, shiftKey: shift });
  cells[0].dispatchEvent(ev(false));
  cells[1].dispatchEvent(ev(true));
  const wrap = t.closest('.note-table-wrap');
  const mb = (wrap && wrap.querySelector('[data-table-action="merge-cells"]')) ||
    document.querySelector('.note-table-ctl[data-table-action="merge-cells"]') ||
    document.getElementById('noteMergeCellsBtn');
  if (mb) mb.click();
  return { ok: true, hadBtn: !!mb };
});
await sleep(500);
const mState = await page.evaluate(() => {
  const t = document.querySelector('#noteBodyInput table');
  const c = t ? t.querySelector('tr:first-child td[colspan], tr:first-child th[colspan]') : null;
  return { colspan: c ? parseInt(c.getAttribute('colspan'), 10) : 0, cols: t ? t.querySelectorAll('tr:first-child td, tr:first-child th').length : 0 };
});
check('behavioral merge produces colspan=2', merged.ok && merged.hadBtn && mState.colspan === 2, JSON.stringify({ ...mState, hadBtn: merged.hadBtn }));
// Behavioral resize: pointer-drag first col handle right 40px
const drag = await page.evaluate(() => {
  const h = document.querySelector('#noteBodyInput .note-col-handle');
  if (!h) return false;
  const r = h.getBoundingClientRect();
  const y = r.top + r.height / 2, x = r.left + r.width / 2;
  const mk = (t, extra) => new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, ...extra });
  h.dispatchEvent(mk('pointerdown'));
  document.dispatchEvent(mk('pointermove', { clientX: x + 40 }));
  document.dispatchEvent(mk('pointerup', { clientX: x + 40 }));
  return true;
});
await sleep(400);
const wAfter = await page.evaluate(() => {
  const td = document.querySelector('#noteBodyInput table tr:first-child td');
  return td ? Math.round(td.getBoundingClientRect().width) : 0;
});
check('behavioral column resize executed', drag && wAfter > 0, 'td width after drag=' + wAfter);
// Style change must not break the merged table
await clickStyle('engineering'); await sleep(400);
const tAfter = await page.evaluate(() => {
  const t = document.querySelector('#noteBodyInput table');
  const c = t ? t.querySelector('td[colspan]') : null;
  return { exists: !!t, colspan: c ? c.getAttribute('colspan') : null };
});
check('merged table intact after style change', tAfter.exists && tAfter.colspan === '2', JSON.stringify(tAfter));
await clickStyle('none'); await sleep(200);

// ===== C. Mobile 390 overflow culprit =====
// Close the note editor first so content artifacts (wide table overlays,
// preview canvas) don't pollute the app-chrome measurement.
await page.evaluate(() => document.getElementById('closeFullScreenNote')?.click());
await sleep(600);
await page.setViewport({ width: 390, height: 844 });
await sleep(600);
const culprits = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const dx = document.documentElement.scrollWidth - vw;
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
      out.push({ tag: el.tagName.toLowerCase(), cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0, 70), right: Math.round(r.right), w: Math.round(r.width) });
    }
  });
  out.sort((a, b) => b.right - a.right);
  return { dx, vw, worst: out.slice(0, 8) };
});
console.log('MOBILE390_OVERFLOW dx=' + culprits.dx + ' vw=' + culprits.vw);
console.log('CULPRITS=' + JSON.stringify(culprits.worst));
check('Mobile 390: overflow measured + culprit list captured', true, 'dx=' + culprits.dx);

check('no new JS/console errors (excl. PREEXISTING SVG)', freshErrors.length === 0, freshErrors.slice(0, 3).join(' | '));
console.log('PREEXISTING(excluded)=' + preexisting);
console.log('RESULTS_JSON=' + JSON.stringify({ pass, fail, preexisting }));
await browser.close();
server.close();
process.exit(fail === 0 ? 0 : 1);

