// Notes → PDF table+content probe. Real editor, real serializeNoteEditor, real
// exportNotePdfBtn path; ONLY window.html2pdf is stubbed at the capture boundary
// to read the element the pipeline is asked to rasterize. Verifies title, mixed
// text and a real 2x3 table (rows/cells) reach the PDF HTML.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8393;
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${(!ok && detail) ? '  -> ' + detail : ''}`); }

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    const e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
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
  const pageLogs = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { const t = m.text(); if (t && t.indexOf('[pdf') === 0) pageLogs.push(t); if (m.type() === 'error') pageErrors.push('[console] ' + t); });
  await page.evaluateOnNewDocument(() => {
    window.__capturedHtml = '';
    window.__captures = [];
    window.html2pdf = function () {
      let src = null;
      const chain = {
        set() { return chain; }, from(el) { src = el; return chain; }, toPdf() { return chain; }, save() { return chain; },
        output() {
          if (src) { try { const h = src.outerHTML || ''; window.__captures.push({ len: h.length, hasTitle: h.includes('فاتورة'), hasApple: h.includes('تفاح'), t: Date.now() }); window.__capturedHtml = h; } catch (e) {} }
          return Promise.resolve(new Blob(['%PDF-1.4 stub'], { type: 'application/pdf' }));
        }
      };
      return chain;
    };
  });

  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(200);
  // Title + mixed body text.
  await page.evaluate(() => {
    const t = document.getElementById('noteTitleInput'); t.value = 'فاتورة 2026 Invoice'; t.dispatchEvent(new Event('input', { bubbles: true }));
    const b = document.getElementById('noteBodyInput'); b.textContent = 'Hello مرحبا 1234567890 @#$%'; b.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(300);
  // Insert a REAL 2x3 table using the EXACT editor DOM structure that
  // serializeNoteEditor/parseTableBlock recognize (div.note-table-wrap >
  // table.note-table.note-table-hasheader > colgroup + tbody > td.note-cell).
  await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const wrap = document.createElement('div');
    wrap.className = 'note-table-wrap';
    wrap.setAttribute('contenteditable', 'false');
    const table = document.createElement('table');
    table.className = 'note-table note-table-hasheader';
    const colgroup = document.createElement('colgroup');
    for (let c = 0; c < 3; c++) colgroup.appendChild(document.createElement('col'));
    table.appendChild(colgroup);
    const tbody = document.createElement('tbody');
    const data = ['الاسم Name', 'الكمية Qty', 'السعر Price', 'تفاح Apple', '12', '4.50$'];
    for (let r = 0; r < 2; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < 3; c++) {
        const td = document.createElement('td');
        td.className = 'note-cell';
        td.setAttribute('contenteditable', 'true');
        td.textContent = data[r * 3 + c];
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    body.appendChild(wrap);
    body.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  // Run the REAL Export-as-PDF path (flush + buildNotePdfBlob + capture).
  await page.evaluate(() => { const b = document.getElementById('exportNotePdfBtn'); if (b) b.click(); });
  // Wait for the REAL content capture (non-empty, with title) — avoids the
  // harness timing race where only the early empty-prime capture has landed.
  try {
    await page.waitForFunction(() => { const c = window.__captures || []; return c.some((x) => x.hasTitle === true && x.len > 200); }, { timeout: 12000 });
    await sleep(400);
  } catch (e) { /* fall through; report what we have */ }
  const out = await page.evaluate(() => {
    const html = window.__capturedHtml || '';
    const saved = (() => { try { return JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]'); } catch { return []; } })();
    const n = saved[0] || {};
    return {
      htmlLen: html.length,
      hasTitle: html.includes('فاتورة 2026 Invoice'),
      hasBody: html.includes('Hello مرحبا 1234567890 @#$%'),
      hasTableTag: html.includes('eq-pdf-note-table'),
      hasThead: html.includes('<thead>'),
      hasAllCells: ['الاسم Name', 'الكمية Qty', 'السعر Price', 'تفاح Apple', '12', '4.50$'].every((c) => html.includes(c)),
      cellCount: (html.match(/eq-pdf-note-cell/g) || []).length,
      savedHasBlocks: Array.isArray(n.bodyBlocks),
      savedBlockKinds: Array.isArray(n.bodyBlocks) ? n.bodyBlocks.map((x) => x.type).join(',') : '',
      savedTableRows: Array.isArray(n.bodyBlocks) ? (n.bodyBlocks.find((x) => x.type === 'table') || {}).rows : null,
      captures: window.__captures || [],
      diag: window.__pdfDiag || [],
      frag: html.replace(/\s+/g, ' ').slice(0, 900)
    };
  });
  console.log('[diag] captures=' + JSON.stringify(out.captures) + ' htmlLen=' + out.htmlLen + '\n  [diag] pdfDiag=' + JSON.stringify(out.diag));
  check('Note saved with bodyBlocks (text + table blocks)', out.savedHasBlocks && out.savedBlockKinds.includes('table') && out.savedBlockKinds.includes('text'), 'kinds=' + out.savedBlockKinds);
  check('Saved table has 2 rows x 3 cells', Array.isArray(out.savedTableRows) && out.savedTableRows.length === 2 && out.savedTableRows.every((r) => Array.isArray(r) && r.length === 3), JSON.stringify(out.savedTableRows));
  check('PDF HTML non-empty', out.htmlLen > 200, 'len=' + out.htmlLen);
  check('PDF HTML contains the TITLE (Arabic+English+numbers)', out.hasTitle, out.frag);
  check('PDF HTML contains the BODY (Arabic+English+numbers+symbols)', out.hasBody, out.frag);
  check('PDF HTML contains the TABLE element', out.hasTableTag && out.hasThead, out.frag.slice(0, 200));
  check('PDF HTML contains ALL 6 table cells (2x3 data)', out.hasAllCells && out.cellCount >= 6, 'cells=' + out.cellCount);
  const realErrors = pageErrors.filter((e) => !e.includes('attribute d') && !e.includes('404'));
  check('No JavaScript errors from the export path', realErrors.length === 0, realErrors.join(' ;; '));
  pageLogs.forEach((l) => console.log('  [page::' + l + ']'));
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log('\n==== TABLE CONTENT RUNTIME: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
  process.exit(pass === results.length ? 0 : 1);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}

  await sleep(2000);
