// PHASE 07 — PDF EXPORT ENGINE — behavioral test in a real Chrome browser.
// Verifies that clicking Export generates a REAL PDF file (valid signature,
// correct page size/orientation, header/footer/branding/page-numbering) from
// the current report-layout state, across Desktop/Tablet/Mobile and LTR/RTL,
// with zero JS errors and no broken preview.
// Run:  node tests/phase07_pdf_export.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8311;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm', '.ttf': 'font/ttf'
};
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeOf(filePath) + '; charset=utf-8' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const URL = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 180000); // hard watchdog

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(width, height, isMobile = false) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.setViewport({ width, height, isMobile, hasTouch: isMobile });
  await sleep(1000);
  return { page, errors: errs };
}

async function openWorkspace(page) {
  await page.evaluate(() => { const b = document.getElementById('drawerToggle'); if (b) b.click(); });
  await sleep(250);
  await page.evaluate(() => {
    const b = document.querySelector('.drawer-menu-item[data-action="open-pdf-reports"]');
    if (b) b.click();
  });
  await sleep(500);
}
async function resetPdf(page) {
  await page.evaluate(() => { const b = document.querySelector('[data-pdf-action="new"]'); if (b) b.click(); });
  await sleep(250);
}
async function clickOpt(page, option, value) {
  await page.evaluate((o, v) => {
    const b = document.querySelector(`.pdf-opt[data-pdf-option="${o}"][data-value="${v}"]`);
    if (!b) throw new Error('pdf-opt not found ' + o + '=' + v);
    b.click();
  }, option, value);
  await sleep(150);
}
async function setContentInput(page, option, text) {
  await page.evaluate((o, t) => {
    const el = document.querySelector(`.pdf-opt-input[data-pdf-option="${o}"]`);
    if (!el) throw new Error('input not found ' + o);
    el.value = t;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, option, text);
  await sleep(120);
}
async function setLanguage(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}
// Load pdf.js (bundled in the project's __pdfdiag/vendor) into the page so the
// test can extract real text from the generated PDF via its ToUnicode CMap.
async function loadPdfJs(page) {
  await page.evaluate(async () => {
    if (window.pdfjsLib) { if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js'; return; }
    const s = document.createElement('script');
    s.src = '/__pdfdiag/vendor/pdf.min.js';
    await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('pdf.min.js load failed')); document.head.appendChild(s); });
    await new Promise(r => setTimeout(r, 300));
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    }
  });
}
// Build a PDF, return its base64 (for signature/size checks) AND the real text
// extracted via pdf.js (for content checks). jsPDF stores text as glyph IDs,
// so raw-byte searching does not work; pdf.js's ToUnicode CMap resolves it.
async function exportPdf(page) {
  return page.evaluate(async () => {
    const R = { ok: false };
    try {
      if (typeof window.__pdfExportToPdfBlob !== 'function') { R.error = 'pdfExportToPdfBlob not exposed'; return R; }
      const blob = await window.__pdfExportToPdfBlob();
      const buf = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      R.ok = true; R.b64 = btoa(binary); R.size = buf.byteLength; R.rawText = '';
      // Extract text via pdf.js (if available)
      try {
        if (window.pdfjsLib) {
          const pdf = await window.pdfjsLib.getDocument({ data: buf.slice() }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const pg = await pdf.getPage(i);
            const content = await pg.getTextContent();
            R.rawText += content.items.map(it => it.str).join(' ') + '\n';
          }
        }
      } catch (e) { R.rawText = 'PDFJS_ERROR:' + String(e.message || e); }
    } catch (e) { R.error = String(e.message || e); }
    return R;
  });
}
// Extract text from a PDF given as base64 (used for the downloaded file).
async function extractTextFromBase64(page, b64) {
  return page.evaluate(async (b64) => {
    const bytes = atob(b64).split('').map(c => c.charCodeAt(0));
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes[i];
    let rawText = '';
    try {
      const pdf = await window.pdfjsLib.getDocument({ data: arr }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const pg = await pdf.getPage(i);
        const content = await pg.getTextContent();
        rawText += content.items.map(it => it.str).join(' ') + '\n';
      }
    } catch (e) { rawText = 'PDFJS_ERROR:' + String(e.message || e); }
    return rawText;
  }, b64);
}
// Parse a PDF byte buffer for basic structural validation (magic/EOF/size/dimensions).
function validatePdf(buf) {
  const str = buf.toString('latin1');
  const mb = (str.match(/\/MediaBox\s*\[([^\]]*)\]/) || [])[1] || '';
  const nums = mb.trim().split(/\s+/).filter(Boolean).map(Number);
  const w = nums[2] || 0, h = nums[3] || 0;
  return {
    magic: str.indexOf('%PDF-') === 0,
    eof: str.includes('%%EOF'),
    size: buf.length,
    mb,
    w, h,
    hasRatio: w > 0 && h > 0,
    portrait: w > 0 && h > 0 && h > w,
    landscape: w > 0 && h > 0 && w > h
  };
}

const noErrors = (errors) => (errors || []).length === 0;
const SVG_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='40'><rect width='60' height='40' fill='%236c5ce7'/></svg>";

// ============================================================
// DESKTOP (1280x800) — LTR English: full export pipeline
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await loadPdfJs(page);
  await openWorkspace(page);
  await resetPdf(page);

  const btnState = await page.evaluate(() => {
    const b = document.querySelector('[data-pdf-action="export"]');
    return { exists: !!b, disabled: b ? b.disabled : null };
  });
  check('Desktop: Export button present and enabled', btnState.exists === true && btnState.disabled === false);

  // Configure header/footer/page-numbering/branding
  await clickOpt(page, 'headerEnable', 'on');
  await clickOpt(page, 'footerEnable', 'on');
  await clickOpt(page, 'pageNumbering', 'on');
  await setContentInput(page, 'headerContent', 'Q1 Financial Report');
  await setContentInput(page, 'footerContent', 'Confidential Draft');
  await setContentInput(page, 'companyName', 'Acme Corporation');
  await setContentInput(page, 'phone', '+1 555 0100');
  await setContentInput(page, 'address', '100 Main St');
  await setContentInput(page, 'email', 'reporting@acme.com');
  await setContentInput(page, 'watermarkText', 'DRAFT WATERMARK');
  await sleep(200);

  const exp = await exportPdf(page);
  check('Desktop: PDF export succeeds', exp.ok === true, JSON.stringify(exp.error || ''));
  if (exp.ok) {
    const buf = Buffer.from(exp.b64, 'base64');
    const v = validatePdf(buf);
    check('Desktop: PDF has valid signature (%PDF-)', v.magic);
    check('Desktop: PDF has EOF marker', v.eof);
    check('Desktop: PDF is a reasonable size', v.size > 1500, 'size=' + v.size);
    check('Desktop: PDF is A4 portrait', v.portrait && Math.abs(v.w - 595) < 2 && Math.abs(v.h - 842) < 2,
      `mb=${v.mb} w=${v.w} h=${v.h}`);
    check('Desktop: PDF contains header text', exp.rawText.includes('Q1 Financial Report'));
    check('Desktop: PDF contains footer text', exp.rawText.includes('Confidential Draft'));
    check('Desktop: PDF contains company name (branding)', exp.rawText.includes('Acme Corporation'));
    check('Desktop: PDF contains company email', exp.rawText.includes('reporting@acme.com'));
    check('Desktop: PDF contains page-number label', exp.rawText.includes('Page'));
  } else {
    check('Desktop: PDF has valid signature (%PDF-)', false, exp.error);
  }

  // Landscape orientation
  await clickOpt(page, 'orientation', 'landscape');
  const expLand = await exportPdf(page);
  if (expLand.ok) {
    const buf = Buffer.from(expLand.b64, 'base64');
    const v = validatePdf(buf);
    check('Desktop: PDF respects Landscape orientation', v.landscape && v.w > v.h, `mb=${v.mb}`);
  } else {
    check('Desktop: PDF respects Landscape orientation', false, JSON.stringify(expLand.error || ''));
  }

  check('Desktop: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// DESKTOP: actual Export-button click produces a downloaded file
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await loadPdfJs(page);
  await openWorkspace(page);
  await resetPdf(page);
  await clickOpt(page, 'headerEnable', 'on');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'companyName', 'Download Test Co');
  await sleep(200);

  const downloadPath = path.join(ROOT, 'test-downloads');
  fs.mkdirSync(downloadPath, { recursive: true });
  try {
    fs.readdirSync(downloadPath).forEach((f) => fs.unlinkSync(path.join(downloadPath, f)));
  } catch (e) {}
  try {
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });
  } catch (e) { /* older puppeteer */ }

  await page.evaluate(() => {
    const b = document.querySelector('[data-pdf-action="export"]');
    if (b) b.click();
  });

  let file = null;
  for (let i = 0; i < 80; i++) {
    try {
      const files = fs.readdirSync(downloadPath).filter((f) => f.endsWith('.pdf') && fs.statSync(path.join(downloadPath, f)).size > 0);
      if (files.length) { file = path.join(downloadPath, files[0]); break; }
    } catch (e) { /* dir may not exist yet */ }
    await sleep(250);
  }
  check('Desktop: clicking Export downloads a PDF file', !!file, file ? 'file=' + path.basename(file) : 'no file');
  if (file) {
    const buf = fs.readFileSync(file);
    const v = validatePdf(buf);
    check('Desktop: downloaded file is a valid PDF', v.magic && v.eof, 'size=' + buf.length + ' mb=' + v.mb);
    const dlB64 = Buffer.from(buf).toString('base64');
    const dlText = await extractTextFromBase64(page, dlB64);
    check('Desktop: downloaded file has branding', dlText.includes('Download Test Co'), 'text=' + (dlText || '').slice(0, 80));
    check('Desktop: downloaded filename is EQ8-PDF-Report*', /EQ8-PDF-Report.*\.pdf$/.test(path.basename(file)), path.basename(file));
    try { fs.unlinkSync(file); } catch (e) {}
  }
  try { fs.rmSync(downloadPath, { recursive: true, force: true }); } catch (e) {}
  check('Desktop: download flow has no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// MOBILE (390x844, 360x800) & TABLET (768x1024) — export works
// ============================================================
async function responsiveExport(width, height, isMobile, tag) {
  const { page, errors } = await newPage(width, height, isMobile);
  await setLanguage(page, 'en');
  await loadPdfJs(page);
  await openWorkspace(page);
  await resetPdf(page);
  await clickOpt(page, 'headerEnable', 'on');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'companyName', 'Responsive Brand');
  await setContentInput(page, 'footerContent', 'Responsive Footer');
  await sleep(200);
  const exp = await exportPdf(page);
  if (exp.ok) {
    const buf = Buffer.from(exp.b64, 'base64');
    const v = validatePdf(buf);
    check(`${tag}: PDF export succeeds`, v.magic && v.eof && v.size > 1500, 'size=' + buf.length);
    check(`${tag}: PDF contains branding`, exp.rawText.includes('Responsive Brand'));
  } else {
    check(`${tag}: PDF export succeeds`, false, JSON.stringify(exp.error || ''));
  }
  check(`${tag}: no JS errors`, noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}
await responsiveExport(390, 844, true, 'iPhone(390)');
await responsiveExport(360, 800, true, 'Android(360)');
await responsiveExport(768, 1024, false, 'Tablet(768)');

// ============================================================
// RTL (Arabic) — PDF export without JS errors
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'ar'); // Arabic → RTL
  await loadPdfJs(page);
  const dir = await page.evaluate(() => document.documentElement.dir || '');
  check('RTL: document direction is rtl', dir === 'rtl', 'dir=' + dir);
  await openWorkspace(page);
  await resetPdf(page);
  await clickOpt(page, 'headerEnable', 'on');
  await clickOpt(page, 'footerEnable', 'on');
  await clickOpt(page, 'pageNumbering', 'on');
  await setContentInput(page, 'companyName', 'شركة الأمل');
  await setContentInput(page, 'headerContent', 'تقرير مالي');
  await setContentInput(page, 'footerContent', 'سري');
  await sleep(200);
  const exp = await exportPdf(page);
  if (exp.ok) {
    const buf = Buffer.from(exp.b64, 'base64');
    const v = validatePdf(buf);
    check('RTL: PDF export succeeds', v.magic && v.eof && v.size > 1500, 'size=' + buf.length);
    check('RTL: PDF contains Arabic company name (data present)',
      (exp.rawText.normalize('NFKC').includes('شركة') || exp.rawText.normalize('NFKC').includes('الأمل')),
      'text=' + (exp && exp.rawText || '').slice(0, 80));
  } else {
    check('RTL: PDF export succeeds', false, JSON.stringify(exp.error || ''));
  }
  check('RTL: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// LTR (English) — PDF export without JS errors
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await loadPdfJs(page);
  const dir = await page.evaluate(() => document.documentElement.dir || '');
  check('LTR: document direction is ltr', dir === 'ltr', 'dir=' + dir);
  await openWorkspace(page);
  await resetPdf(page);
  await clickOpt(page, 'headerEnable', 'on');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'companyName', 'English Brand');
  await setContentInput(page, 'footerContent', 'Public');
  await sleep(200);
  const exp = await exportPdf(page);
  if (exp.ok) {
    const buf = Buffer.from(exp.b64, 'base64');
    const v = validatePdf(buf);
    check('LTR: PDF export succeeds', v.magic && v.eof && v.size > 1500, 'size=' + buf.length);
    check('LTR: PDF contains branding', exp.rawText.includes('English Brand'));
  } else {
    check('LTR: PDF export succeeds', false, JSON.stringify(exp.error || ''));
  }
  check('LTR: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// Error handling — invalid/missing logo does not break export
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await loadPdfJs(page);
  await openWorkspace(page);
  await resetPdf(page);
  await clickOpt(page, 'headerEnable', 'on');
  await setContentInput(page, 'companyName', 'Logo Safe Co');
  await setContentInput(page, 'logoUrl', 'data:image/broken;base64,!!!not-a-valid-image!!!');
  await sleep(200);
  const exp = await exportPdf(page);
  if (exp.ok) {
    const buf = Buffer.from(exp.b64, 'base64');
    const v = validatePdf(buf);
    check('Errors: invalid logo does not break export', v.magic && v.eof && v.size > 1500, 'size=' + buf.length);
  } else {
    check('Errors: invalid logo does not break export', false, JSON.stringify(exp.error || ''));
  }
  check('Errors: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

const failed = results.filter((r) => !r.ok);
// Persist results to a file so they survive shell-capture truncation.
try {
  fs.writeFileSync(path.join(ROOT, 'phase07_result.json'), JSON.stringify({
    passed: results.length - failed.length, total: results.length, failed
  }, null, 2));
} catch (e) { /* ignore */ }
let summary = '\n=== PHASE 07 RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===\n';
failed.forEach((f) => { summary += ' - ' + f.name + ': ' + f.detail + '\n'; });
console.log(summary);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + ': ' + f.detail));
}
try { await browser.close(); } catch (e) { /* ignore */ }
try { server.close(); } catch (e) { /* ignore */ }
process.exit(failed.length ? 1 : 0);



