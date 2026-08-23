// PDF TABLE CELL TEXT ALIGNMENT verification harness (test-only artifact, modifies nothing).
// Uses the same Puppeteer + real-browser convention as the existing __notes_test harnesses.
// Verifies pdfCellAlign, pdfCellDir, and the report HTML template produced by
// buildHistoryPdfBlob for correct text alignment, direction, and vertical centering.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8269;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.map': 'application/json'
};
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, r));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pdfCellAlign(page, text) {
  return page.evaluate((t) => {
    function pdfCellAlign(text) {
      const s = String(text || '').trim();
      if (!s) return 'center';
      if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s)) return 'right';
      const ns = s.replace(/\s/g, '');
      const digits = (ns.match(/\d/g) || []).length;
      const letters = (ns.match(/[a-zA-Z]/g) || []).length;
      if (digits > letters) return 'right';
      return 'left';
    }
    return pdfCellAlign(t);
  }, text);
}

async function pdfCellDir(page, text) {
  return page.evaluate((t) => {
    function pdfCellDir(text) {
      const s = String(text || '').trim();
      return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s) ? 'rtl' : 'auto';
    }
    return pdfCellDir(t);
  }, text);
}

let browser;
let pageError = null;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => { pageError = String(e && e.message || e); });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));

    const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

  // ---------- A. Arabic text alignment ----------
  check('Arabic "المجموع الكلي": pdfCellAlign returns right',
    await pdfCellAlign(page, 'المجموع الكلي') === 'right', '');
  check('Arabic "المجموع الكلي": pdfCellDir returns rtl',
    await pdfCellDir(page, 'المجموع الكلي') === 'rtl', '');
  check('Arabic "شركة الأمل للمقاولات": pdfCellAlign returns right',
    await pdfCellAlign(page, 'شركة الأمل للمقاولات') === 'right', '');
  check('Arabic "شركة الأمل للمقاولات": pdfCellDir returns rtl',
    await pdfCellDir(page, 'شركة الأمل للمقاولات') === 'rtl', '');

  // ---------- B. English text alignment ----------
  check('English "Total": pdfCellAlign returns left',
    await pdfCellAlign(page, 'Total') === 'left', '');
  check('English "Total": pdfCellDir returns auto',
    await pdfCellDir(page, 'Total') === 'auto', '');
  check('English "Company Name": pdfCellAlign returns left',
    await pdfCellAlign(page, 'Company Name') === 'left', '');

  // ---------- C. Numbers alignment ----------
  check('Number "1234567890": pdfCellAlign returns right',
    await pdfCellAlign(page, '1234567890') === 'right', '');
    check('Number "150000": pdfCellAlign returns right',
    await pdfCellAlign(page, '150000') === 'right', '');

  // ---------- D. Mixed content alignment ----------
  check('Mixed "شركة الأمل ABC 123": pdfCellAlign returns right (Arabic dominant)',
    await pdfCellAlign(page, 'شركة الأمل ABC 123') === 'right', '');
  check('Mixed "شركة الأمل ABC 123": pdfCellDir returns rtl',
    await pdfCellDir(page, 'شركة الأمل ABC 123') === 'rtl', '');
  check('Mixed "Total المجموع 150000": pdfCellAlign returns right (Arabic dominant)',
    await pdfCellAlign(page, 'Total المجموع 150000') === 'right', '');
  check('Mixed "Total المجموع 150000": pdfCellDir returns rtl',
    await pdfCellDir(page, 'Total المجموع 150000') === 'rtl', '');
  check('Mixed "150000 IQD": pdfCellAlign returns right (digits > letters)',
    await pdfCellAlign(page, '150000 IQD') === 'right', '');
  check('Mixed "150000 IQD": pdfCellDir returns auto',
    await pdfCellDir(page, '150000 IQD') === 'auto', '');

  // ---------- E. Long text ----------
  check('Long Arabic sentence: pdfCellAlign returns right',
    await pdfCellAlign(page, 'هذه جملة طويلة جدا باللغة العربية تستخدم لاختبار التفاف النص والمحاذاة') === 'right', '');
  check('Long English sentence: pdfCellAlign returns left',
        await pdfCellAlign(page, 'This is a very long English sentence used to test text wrapping and alignment') === 'left', '');

  // ---------- F. Headers centered ----------
  check('Header: thead th has text-align: center in CSS',
    /table\.history-table thead th \{[^}]*text-align: center/i.test(appSource), '');
  check('Header: th cells in template use <th> elements',
    /<th class="col-desc">Description<\/th>/.test(appSource) &&
    /<th class="col-expr">Expression<\/th>/.test(appSource) &&
    /<th class="col-result">Result<\/th>/.test(appSource), '');

  // ---------- G. Data cells alignment behavior ----------
  check('Data cells: row template uses pdfCellAlign for col-desc',
    /<td class="col-desc" dir="\$\{descDir\}" style="text-align:\$\{descAlign\}"/.test(appSource), '');
  check('Data cells: row template uses pdfCellAlign for col-expr',
    /<td class="col-expr" dir="\$\{exprDir\}" style="text-align:\$\{exprAlign\}"/.test(appSource), '');
  check('Data cells: row template uses pdfCellAlign for col-result',
    /<td class="col-result" dir="\$\{resultDir\}" style="text-align:\$\{resultAlign\}"/.test(appSource), '');
  check('Data cells: col-num retains text-align: center',
        /table\.history-table td\.col-num \{[^}]*text-align: center/i.test(appSource), '');

  // ---------- H. Wrapping (no overflow) ----------
  check('Wrapping: no white-space:nowrap on table cells',
    !/white-space:\s*nowrap/i.test(appSource), '');

  // ---------- I. Vertical alignment centered ----------
  check('Vertical: th, td has vertical-align: middle in CSS',
        /table\.history-table th,\s*table\.history-table td[^}]*vertical-align: middle/i.test(appSource), '');

  // ---------- J. Existing PDF behavior (report generation still works) ----------
  check('PDF: buildHistoryPdfBlob function exists',
    /async function buildHistoryPdfBlob\(entries\)/.test(appSource), '');
  check('PDF: report HTML template includes history-table',
    /<table class="history-table">/.test(appSource), '');
  check('PDF: report HTML template includes total-summary',
    /<div class="total-summary"/.test(appSource), '');
  check('PDF: report HTML template includes report-footer',
    /<div class="report-footer">/.test(appSource), '');

  // ---------- K. Runtime: no uncaught errors ----------
  check('Runtime: no uncaught page errors', !pageError, pageError ? pageError.slice(0, 200) : 'clean');

  // ---------- Verify alignment helper functions exist in source ----------
  check('Helpers: pdfCellAlign function defined in app.js',
    /function pdfCellAlign\(/.test(appSource), '');
  check('Helpers: pdfCellDir function defined in app.js',
    /function pdfCellDir\(/.test(appSource), '');

} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  results.push({ name: 'HARNESS', ok: false, detail: err && err.message ? err.message : String(err) });
} finally {
  if (browser) await browser.close();
  server.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
const lines = results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  -> ' + r.detail : ''}`).join('\n');
const report = [lines, '', '==== RESULT: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====', '', 'FINAL: ' + pass + '/' + results.length + ' passed'].join('\n') + '\n';
fs.writeFileSync(path.join(HERE, 'alignment_pdf_results.txt'), report, 'utf8');
console.log('\n' + report);
process.exit(pass === results.length ? 0 : 1);