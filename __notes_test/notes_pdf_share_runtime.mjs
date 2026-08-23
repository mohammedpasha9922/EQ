// PHASE 07E — Notes PDF Export: real-browser (Puppeteer) verification of the
// mobile SHARE path (navigator.share with files). Mirrors
// notes_pdf_runtime_check.mjs for server/puppetry.
//
// Verifies:
//   #8  Capture the PDF Blob/File produced by the export button.
//   #9  MIME application/pdf, filename ends with .pdf, bytes %PDF-, size>0.
//   #10/#11 Note content (title, Arabic, English, numbers, table cells) is in
//        the rendered PDF source (captured pre-rasterization).
//   #12 Editor content unchanged after export (read-only export).
//   #13 No duplicate Note created (note-list count stable after export).
//   #15 No uncaught JS errors.
//   #16 Mobile / coarse-pointer emulation.
//   #17 navigator.share({files}) receives the ACTUAL PDF File (not note text).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8275;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${(!ok && detail) ? '  -> ' + detail : ''}`);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const fp = path.join(ROOT, p);
  try {
    const d = fs.readFileSync(fp);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(d);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, r));

let browser;
let out = null;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  const uncaughtErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => uncaughtErrors.push(String((e && e.message) || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push('[console.error] ' + msg.text()); });

  // --- #16 Mobile / coarse-pointer emulation ---
  await page.setViewport({ width: 390, height: 844, isMobile: true, isTouchScreen: true });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  try {
    if (page.emulateMediaFeatures) await page.emulateMediaFeatures([{ name: 'pointer', value: 'coarse' }, { name: 'prefers-color-scheme', value: 'light' }]);
    else if (page.emulateMedia) await page.emulateMedia({ colorScheme: 'light' });
  } catch (e) { /* non-fatal */ }
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2000));

  out = await page.evaluate(async () => {
    const captured = { shared: null, downloadBlob: null, renderedHtml: null };

    // --- #17 Mock the Share API so we can capture the File handed to share ---
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (opts) => {
        captured.shared = { files: Array.isArray(opts.files) ? opts.files.slice() : [], title: opts.title, text: opts.text };
        return Promise.resolve();
      }
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (opts) => !!(opts && Array.isArray(opts.files) && opts.files.length && opts.files.every((f) => f instanceof Blob))
    });
    window.URL.createObjectURL = (obj) => { captured.downloadBlob = obj; return 'blob:eq-test'; };

    // --- Hook createElement so we can capture the off-screen iframe that
    //     buildNotePdfBlob writes the note HTML into, then read its #note-report
    //     content (before cleanup) to verify the Note content reaches the PDF.
    //     (Patching Document#write does NOT work here: the iframe is a separate
    //     browsing-context realm with its own Document prototype.)
    const capturedIframes = [];
    const origCreateEl = Document.prototype.createElement;
    Document.prototype.createElement = function (tag, options) {
      const el = origCreateEl.call(this, tag, options);
      try { if (el && tag && String(tag).toLowerCase() === 'iframe') capturedIframes.push(el); } catch (e) {}
      return el;
    };

    // --- #2-#7 Open a note with Arabic + English + numbers, plus a table ---
    const open = document.getElementById('openNewNoteButton');
    if (open) open.click();
    await new Promise((r) => setTimeout(r, 500));
    const titleInput = document.getElementById('noteTitleInput');
    const bodyInput = document.getElementById('noteBodyInput');
    if (titleInput) { titleInput.value = 'مرحبا Share Note 123'; titleInput.dispatchEvent(new Event('input', { bubbles: true })); }
    if (bodyInput) {
      bodyInput.textContent = 'Arabic: مرحبا | English: Hello | Number: 987654321';
      bodyInput.insertAdjacentHTML('beforeend',
        '<table class="note-table note-table-hasheader" data-border-style="all">' +
        '<colgroup><col style="width:50%"><col style="width:50%"></colgroup><tbody>' +
        '<tr><th>Name</th><th>Value</th></tr>' +
        '<tr><td>مرحبا Arabic</td><td>42</td></tr>' +
        '<tr><td>English</td><td>مزيج 99</td></tr>' +
        '</tbody></table>');
      bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Allow the 350ms autosave debounce to settle and persist the note.
    await new Promise((r) => setTimeout(r, 1200));

    // --- Snapshots proving the export is read-only (no dup / no delete) ---
    const beforeNoteCount = document.querySelectorAll('#notesList .note-item').length || 0;
    const beforeTitle = titleInput ? titleInput.value : null;
    const beforeBody = bodyInput ? bodyInput.textContent : null;
    const beforeTables = bodyInput ? bodyInput.querySelectorAll('table.note-table').length : 0;

    // Preload html2pdf (same library buildNotePdfBlob uses) so the render + share
    // complete within the wait window below (avoids a CDN fetch on the click path).
    const loadHtml2Pdf = () => new Promise((res, rej) => {
      if (window.html2pdf) return res();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      s.onload = () => res();
      s.onerror = () => rej(new Error('html2pdf CDN load failed'));
      document.head.appendChild(s);
    });
    await loadHtml2Pdf();

    // --- #7 Press the EXISTING PDF button ---
    const btn = document.getElementById('exportNotePdfBtn');
    if (btn) btn.click();
    // Let the export run: capture the #note-report HTML from the rendered iframe
    // (content verification), and wait for navigator.share to be invoked with the
    // PDF File. Capped at 9s so a slow first render still completes.
    const start = Date.now();
    while (Date.now() - start < 9000 && !(captured.renderedHtml && captured.shared && captured.shared.files.length)) {
      if (!captured.renderedHtml) {
        for (const f of capturedIframes) {
          try {
            const el = f.contentDocument && f.contentDocument.getElementById('note-report');
            if (el && el.innerHTML) { captured.renderedHtml = el.innerHTML; break; }
          } catch (e) { /* ignore */ }
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    const afterNoteCount = document.querySelectorAll('#notesList .note-item').length || 0;
    const afterTitle = titleInput ? titleInput.value : null;
    const afterBody = bodyInput ? bodyInput.textContent : null;
    const afterTables = bodyInput ? bodyInput.querySelectorAll('table.note-table').length : 0;

    // --- Inspect the File handed to navigator.share (a REAL PDF?) ---
    let fileInfo = null;
    if (captured.shared && captured.shared.files.length) {
      const f = captured.shared.files[0];
      let sig = '';
      try {
        const buf = new Uint8Array(await f.slice(0, 5).arrayBuffer());
        for (let i = 0; i < 5; i++) sig += String.fromCharCode(buf[i]);
      } catch (e) { /* ignore */ }
      fileInfo = { isFile: f instanceof File, type: f.type, name: f.name, size: f.size, sig };
    }
    return {
      btnPresent: !!btn,
      shareCalled: !!captured.shared,
      shareHasFiles: !!(captured.shared && captured.shared.files.length),
      sharedTitle: captured.shared && captured.shared.title,
      sharedText: captured.shared && captured.shared.text,
      fileInfo,
      renderedHtml: captured.renderedHtml,
      beforeNoteCount, afterNoteCount,
      beforeTitle, afterTitle,
      beforeBody, afterBody,
             beforeTables, afterTables
    };
  });

  // --- Assertions ---
  check('PDF Export button is present', out.btnPresent, 'button missing');
  check('#17 navigator.share invoked with files', out.shareCalled && out.shareHasFiles, 'share not called with files');
  check('#17 navigator.share received an actual File object', out.fileInfo && out.fileInfo.isFile, 'not a File');
  check('#9/#17 PDF File MIME type is application/pdf', out.fileInfo && out.fileInfo.type === 'application/pdf', 'type=' + (out.fileInfo && out.fileInfo.type));
  check('#9/#17 PDF File name ends with .pdf', out.fileInfo && /\.pdf$/i.test(out.fileInfo.name), 'name=' + (out.fileInfo && out.fileInfo.name));
  check('#9/#17 PDF File name reflects the note title (real file, not text)', out.fileInfo && /Share Note/.test(out.fileInfo.name) && /مرحبا/.test(out.fileInfo.name), 'name=' + (out.fileInfo && out.fileInfo.name));
  check('#9/#17 PDF File size > 0', out.fileInfo && out.fileInfo.size > 0, 'size=' + (out.fileInfo && out.fileInfo.size));
  check('#9/#17 PDF File bytes start with %PDF-', out.fileInfo && out.fileInfo.sig === '%PDF-', 'sig=' + (out.fileInfo && out.fileInfo.sig));
  check('#17 Shared title is the note title', out.sharedTitle && /Share Note/.test(out.sharedTitle), 'title=' + out.sharedTitle);
  check('#17 Shared text is generic (NOT the note body)', out.sharedText === 'Exported from EQ Calculator', 'text=' + out.sharedText);
  check('#10/#11 Note title present in rendered PDF HTML', out.renderedHtml && /مرحبا Share Note 123/.test(out.renderedHtml), 'title missing');
  check('#10/#11 Arabic content present in rendered PDF HTML', out.renderedHtml && /مرحبا/.test(out.renderedHtml), 'arabic missing');
  check('#10/#11 English content present in rendered PDF HTML', out.renderedHtml && /Hello/.test(out.renderedHtml), 'english missing');
  check('#10/#11 Numeric content present in rendered PDF HTML', out.renderedHtml && /987654321/.test(out.renderedHtml), 'number missing');
  check('#11 Table present in rendered PDF HTML', out.renderedHtml && /<table/.test(out.renderedHtml), 'no table');
  check('#11 Table cell content present in rendered PDF HTML', out.renderedHtml && /مرحبا Arabic/.test(out.renderedHtml) && /مزيج 99/.test(out.renderedHtml), 'cell content missing');
  check('#12 Editor title unchanged after export', out.beforeTitle === out.afterTitle, 'title changed');
  check('#12 Editor body unchanged after export', out.beforeBody === out.afterBody, 'body changed');
  check('#12 Table count unchanged after export', out.beforeTables === out.afterTables, 'table count changed');
  check('#13 No duplicate Note created (count stable)', out.beforeNoteCount === out.afterNoteCount, 'count ' + out.beforeNoteCount + '->' + out.afterNoteCount);
  check('#15 No uncaught JavaScript errors during export', uncaughtErrors.length === 0, uncaughtErrors.join(' | '));
} catch (err) {
  check('harness ran without throwing', false, err && err.stack ? err.stack : err);
} finally {
  if (browser) await browser.close();
  server.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
fs.writeFileSync(path.join(HERE, 'notes_pdf_share_runtime.txt'), `${pass} passed, ${fail} failed, ${results.length} total\n`, 'utf8');
console.log('\n==== RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
console.log('File info:', JSON.stringify(out && out.fileInfo, null, 2));
console.log('Shared title:', JSON.stringify(out && out.sharedTitle));
console.log('Rendered HTML length:', out && out.renderedHtml ? out.renderedHtml.length : 0);
process.exit(pass === results.length ? 0 : 1);


