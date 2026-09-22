// PART 06 — FOCUSED RESIZE PROBE (test-only, does not touch production code).
// Disambiguate P06-10b: does a genuine PointerEvent drag on the real resize handle
// persist colWidths through save + reload?
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
const PORT = 8461;
const OUT = path.join(HERE, 'n06_resize_probe.txt');

const resultLines = [];
function rec(name, ok, detail = '') { resultLines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`); }

const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((res) => server.listen(PORT, res));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const seedNotes = [
  { id: 'n-res', title: 'Resize Probe', body: 'table here', folderId: 'personal', createdAt: Date.now() - 3600e3, updatedAt: Date.now() - 3600e3 }
];
const seedFolders = [{ id: 'personal', name: 'Personal', createdAt: Date.now() }];

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => resultLines.push('PAGEERROR: ' + e.message));

  const goto = async () => { await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 }); await sleep(700); };
  const seed = async () => { await page.evaluate((kf, f, kn, n) => { localStorage.setItem(kf, JSON.stringify(f)); localStorage.setItem(kn, JSON.stringify(n)); }, FOLDERS_KEY, seedFolders, STORAGE_KEY, JSON.parse(JSON.stringify(seedNotes))); };
  const openHome = async () => {
    await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
    await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
    await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 5000 });
    await sleep(200);
  };
  const openNote = async () => {
    await page.evaluate(() => { const c = document.querySelector('#notesList .note-item'); if (c) c.click(); });
    await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 5000 });
    await sleep(300);
  };
  const insertTable = async (r, c) => {
    await page.evaluate((rr, cc) => {
      const btn = document.getElementById('noteTableBtn'); if (btn) btn.click();
      document.getElementById('noteTableRows').value = rr;
      document.getElementById('noteTableCols').value = cc;
      document.getElementById('noteTableInsertBtn').click();
    }, r, c);
    await sleep(250);
  };

  await goto();
  await seed();
  await page.reload({ waitUntil: 'load' }); await sleep(700);
  await openHome();
  await openNote();
  await insertTable(3, 3);
// ---- Locate the real resize handle from the DOM, verify in viewport ----
  const handleInfo = await page.evaluate(() => {
    const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
    const layer = w && w.querySelector('.note-table-resize');
    const handle = layer && layer.querySelector('.note-col-handle');
    if (!w || !layer || !handle) return { ok: false, why: 'missing wrap/layer/handle' };
    const r = handle.getBoundingClientRect();
    const table = w.querySelector('table.note-table');
    return {
      ok: true,
      tableFixed: table.className.includes('note-table-fixed'),
      layerClass: layer.className,
      handle: { x: r.x + r.width / 2, y: r.y + r.height / 2, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) },
      vw: window.innerWidth, vh: window.innerHeight,
      inViewport: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight
    };
  });
  rec('P06-R1 handle located in DOM', handleInfo.ok, JSON.stringify(handleInfo));
  if (handleInfo.ok) rec('P06-R2 handle is inside viewport', handleInfo.inViewport, 'handle=' + JSON.stringify(handleInfo.handle) + ' vw=' + handleInfo.vw + ' vh=' + handleInfo.vh);

  const col0Before = await page.evaluate(() => {
    const w = document.querySelectorAll('.note-table-wrap')[document.querySelectorAll('.note-table-wrap').length - 1];
    const c = w.querySelector('col');
    return { styleW: c && c.style.width, off: c && Math.round(c.getBoundingClientRect().width), tableFixed: w.querySelector('table').className.includes('note-table-fixed') };
  });
  rec('R3 initial col0 width', true, JSON.stringify(col0Before));

  if (handleInfo.ok) {
    // Real handle coords captured in-page; dispatch genuine PointerEvent drag.
    const dragResult = await page.evaluate(() => {
      const ws = document.querySelectorAll('.note-table-wrap'); const w = ws[ws.length - 1];
      const handle = w.querySelector('.note-table-resize .note-col-handle');
      if (!handle) return { ok: false, why: 'handle missing at drag time' };
      const r = handle.getBoundingClientRect();
      const startX = r.x + r.width / 2;
      const startY = r.y + r.height / 2;
      const endX = startX + 90;
      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: startX, clientY: startY, pointerType: 'mouse', button: 0 }));
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: endX, clientY: startY, pointerType: 'mouse' }));
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: endX, clientY: startY, pointerType: 'mouse', button: 0 }));
      return { ok: true, startX, startY, endX };
    });
    rec('R4 pointer drag dispatched on real handle', dragResult && dragResult.ok, JSON.stringify(dragResult));

    const afterDom = await page.evaluate(() => {
      const w = document.querySelectorAll('.note-table-wrap')[document.querySelectorAll('.note-table-wrap').length - 1];
      const table = w.querySelector('table.note-table');
      const cols = Array.from(table.querySelectorAll('col'));
      return { fixed: table.className.includes('note-table-fixed'), colStyles: cols.map((c) => c.style.width || ''), colOffs: cols.map((c) => Math.round(c.getBoundingClientRect().width)) };
    });
    rec('R5 DOM width changed + note-table-fixed', afterDom.fixed && afterDom.colStyles.some((s) => !!s), JSON.stringify(afterDom));

    // Save via closing the editor (flush -> serialize -> parseNoteTableColWidths -> block.colWidths)
    await page.evaluate(() => { const f = document.getElementById('closeFullScreenNote'); if (f) f.click(); });
    await sleep(400);
    const stored = await page.evaluate(() => {
      const arr = JSON.parse(localStorage.getItem('eq-note-manager-notes')) || [];
      const n = arr.find((x) => x.id === 'n-res');
      const blk = n && Array.isArray(n.bodyBlocks) ? n.bodyBlocks.find((b) => b.type === 'table') : null;
      return { hasBlocks: !!n && Array.isArray(n.bodyBlocks), colWidths: blk ? blk.colWidths : null };
    });
    rec('R6 colWidths stored after save', !!stored.colWidths && stored.colWidths.length >= 3, JSON.stringify(stored));

    // Reload + reopen, verify restored
    await page.reload({ waitUntil: 'load' }); await sleep(700);
    await openHome();
    await openNote();
    const restored = await page.evaluate(() => {
      const w = document.querySelectorAll('.note-table-wrap')[document.querySelectorAll('.note-table-wrap').length - 1];
      if (!w) return null;
      const table = w.querySelector('table.note-table');
      const col = table.querySelector('col');
      const n = JSON.parse(localStorage.getItem('eq-note-manager-notes')).find((x) => x.id === 'n-res');
      const blk = n.bodyBlocks.find((b) => b.type === 'table');
      return { fixed: table.className.includes('note-table-fixed'), colStyle: col && col.style.width, hasStoredWidth: !!blk.colWidths };
    });
    rec('R7 width restored after reload', !!(restored && (restored.fixed || restored.colStyle || restored.hasStoredWidth)), JSON.stringify(restored));
  }

  const pass = resultLines.filter((l) => l.startsWith('PASS')).length;
  const fail = resultLines.filter((l) => l.startsWith('FAIL')).length;
  fs.writeFileSync(OUT, resultLines.join('\n') + `\nTOTAL PASS=${pass} FAIL=${fail}\n`);
  console.log(`\nPROBE RESULT: PASS=${pass} FAIL=${fail}`);
} catch (e) {
  console.error('PROBE HARNESS ERROR:', e.message);
  try { fs.appendFileSync(OUT, 'HARNESS ERROR: ' + e.message + '\n'); } catch (_) {}
  process.exitCode = 1;
} finally {
  try { await browser?.close(); } catch (_) {}
  server.close();
}