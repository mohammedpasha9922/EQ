// Notes → PDF content-fidelity probe. Captures the EXACT PDF HTML the pipeline
// generates for a real note, by stubbing ONLY window.html2pdf at the capture
// boundary to read the element it is asked to rasterize. Everything upstream
// (editor, saveCurrentOpenNote, buildNotePdfBlob, preview flush) is REAL app
// code in REAL Chrome. Verifies title/body/table content reaches PDF HTML.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8391;
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
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
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
  await page.evaluateOnNewDocument(() => {
    window.__capturedHtml = '';
    window.html2pdf = function () {
      let src = null;
      const chain = {
        set() { return chain; }, from(el) { src = el; return chain; }, toPdf() { return chain; }, save() { return chain; },
        output() { if (src) { try { window.__capturedHtml = src.outerHTML || src.innerHTML || ''; } catch (e) { window.__capturedHtml = ''; } } return Promise.resolve(new Blob(['%PDF-1.4 stub'], { type: 'application/pdf' })); }
      };
      return chain;
    };
  });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((a, b) => { localStorage.removeItem(a); localStorage.removeItem(b); }, STORAGE_KEY, FOLDERS_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  // Open Notes, new note, type title + body.
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(200);
    await page.evaluate(() => {
    const t = document.getElementById('noteTitleInput'); t.value = 'Title مرحبا Hello 123'; t.dispatchEvent(new Event('input', { bubbles: true }));
    const b = document.getElementById('noteBodyInput'); b.textContent = 'Body text Hello مرحبا 45 + symbols @#$'; b.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  // Click 👁️ Preview. Real flush (saveCurrentOpenNote) runs first, then preview.
  await page.evaluate(() => { const b = document.getElementById('notePreviewPdfBtn'); if (b) b.click(); });
  await sleep(1600);
  const out = await page.evaluate(() => {
    const html = window.__capturedHtml || '';
    const saved = (() => { try { return JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]'); } catch { return []; } })();
    return {
      htmlLen: html.length,
      hasTitle: html.includes('Title') && html.includes('مرحبا') && html.includes('Hello') && html.includes('123'),
      hasBody: html.includes('Body text') && html.includes('Hello') && html.includes('مرحبا') && html.includes('@#$'),
      bodyFrag: html.replace(/\s+/g, ' ').slice(0, 600),
      savedTitles: saved.map((n) => n.title).join('|'),
      savedBody: saved.length ? (saved[0].body || '').slice(0, 80) : '',
      savedHasBlocks: saved.length ? !!saved[0].bodyBlocks : false,
      savedBlockKinds: saved.length && saved[0].bodyBlocks ? saved[0].bodyBlocks.map((x) => x.type).join(',') : ''
    };
  });
  check('Preview flush saved the note (title+body in storage)', !!out.savedTitles && out.savedTitles.includes('Title'), 'savedTitles=' + out.savedTitles + ' savedBody=' + out.savedBody);
  check('PDF HTML non-empty (captured element has content)', out.htmlLen > 200, 'len=' + out.htmlLen);
  check('PDF HTML contains the note TITLE (latin/arabic/number)', out.hasTitle, out.bodyFrag);
  check('PDF HTML contains the note BODY (text + mixed + symbols)', out.hasBody, out.bodyFrag);
  console.log('[diag] htmlLen=' + out.htmlLen + ' savedTitles=[' + out.savedTitles + '] savedBody=[' + out.savedBody + '] blocks=' + out.savedBlockKinds + ' (' + out.savedHasBlocks + ')');
  console.log('[diag] PDF HTML fragment: ' + out.bodyFrag);
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  fs.writeFileSync(path.join(here, 'note_pdf_content_runtime.txt'), `${pass} passed, ${fail} failed, ${results.length} total\npageErrors: ${pageErrors.join(' ;; ') || 'none'}\n`, 'utf8');
  console.log('\n==== CONTENT RUNTIME RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
  if (pageErrors.length) console.log('PAGE ERRORS: ' + pageErrors.join(' ;; '));
  process.exit(pass === results.length ? 0 : 1);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  fs.writeFileSync(path.join(here, 'note_pdf_content_runtime.txt'), 'HARNESS ERROR: ' + (err && err.message) + '\n', 'utf8');
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}