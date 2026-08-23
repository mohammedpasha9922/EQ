// PHASE 06 — PDF REPORTS BRANDING — behavioral test in a real Chrome browser.
// Verifies that the Branding panel (company name, logo upload/removal, brand
// color, phone/address/email/website, watermark) drives the LIVE preview
// through the single central report-layout state, persists across close/reopen,
// resets on "New", respects Header/Footer + page numbering, and works in RTL/LTR
// and across Desktop/Tablet/Mobile with zero JS errors and no overflow.
// Run:  node tests/phase06_pdf_branding.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8296;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain'
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
setTimeout(() => process.exit(124), 180000);

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
  await sleep(800);
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
async function closeWorkspace(page) {
  await page.evaluate(() => { const b = document.getElementById('closePdfReports'); if (b) b.click(); });
  await sleep(300);
}
async function resetPdf(page) {
  await page.evaluate(() => document.querySelector('[data-pdf-action="new"]').click());
  await sleep(250);
}
async function openPanel(page, toggleId) {
  await page.evaluate((id) => document.getElementById(id).click(), toggleId);
  await sleep(150);
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
  await sleep(80);
}
async function setColor(page, hex) {
  await page.evaluate((v) => {
    const el = document.querySelector('.pdf-opt-color[data-pdf-option="brandColor"]');
    if (!el) throw new Error('color input not found');
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, hex);
  await sleep(80);
}
async function setLanguage(page, locale) {
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, locale);
  await sleep(400);
}

const stateOf = (page) => page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const byId = (id) => document.getElementById(id);
  const pageEl = byId('pdfPreviewPage');
  const header = byId('pdfPreviewHeader');
  const footer = byId('pdfPreviewFooter');
  const logo = byId('pdfPreviewLogo');
  const wm = byId('pdfPreviewWatermark');
  return {
    brandingOpen: !!byId('pdfBrandingPanel')?.classList.contains('open'),
    headerHidden: !!(header && header.hidden),
    headerText: byId('pdfPreviewHeaderText')?.textContent ?? null,
    headerCompany: byId('pdfPreviewCompanyName')?.textContent ?? null,
    logoHidden: !!(logo && logo.hidden),
    logoSrc: logo ? (logo.getAttribute('src') || '') : '',
    logoObjectFit: logo ? getComputedStyle(logo).objectFit : '',
    logoW: logo ? logo.clientWidth : 0,
    logoH: logo ? logo.clientHeight : 0,
    footerHidden: !!(footer && footer.hidden),
    footerText: byId('pdfPreviewFooterText')?.textContent ?? null,
    companyInfoHidden: !!(byId('pdfPreviewCompanyInfo') && byId('pdfPreviewCompanyInfo').hidden),
    companyInfoName: byId('pdfPreviewCompanyNameF')?.textContent ?? null,
    companyInfoAddr: byId('pdfPreviewCompanyAddr')?.textContent ?? null,
    pageNumHidden: !!(byId('pdfPreviewPageNum') && byId('pdfPreviewPageNum').hidden),
    pageNumText: byId('pdfPreviewPageNum')?.textContent ?? null,
    watermarkHidden: !!(wm && wm.hidden),
    watermarkText: byId('pdfPreviewWatermarkText')?.textContent ?? null,
    brandVar: pageEl ? (getComputedStyle(pageEl).getPropertyValue('--brand-color').trim()) : '',
    appBrandVar: document.documentElement.style.getPropertyValue('--brand-color'),
    inputCompany: q('.pdf-opt-input[data-pdf-option="companyName"]')?.value ?? '',
    inputPhone: q('.pdf-opt-input[data-pdf-option="phone"]')?.value ?? '',
    inputAddress: q('.pdf-opt-input[data-pdf-option="address"]')?.value ?? '',
    inputEmail: q('.pdf-opt-input[data-pdf-option="email"]')?.value ?? '',
    inputWebsite: q('.pdf-opt-input[data-pdf-option="website"]')?.value ?? '',
    inputWatermark: q('.pdf-opt-input[data-pdf-option="watermarkText"]')?.value ?? '',
    inputLogo: q('.pdf-opt-input[data-pdf-option="logoUrl"]')?.value ?? '',
    colorVal: q('.pdf-opt-color[data-pdf-option="brandColor"]')?.value ?? '',
    dir: document.documentElement.dir || '',
    overflowX: document.documentElement.scrollWidth - window.innerWidth
  };
});
const noErrors = (errors) => (errors || []).length === 0;
const SVG_LOGO = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%236c5ce7'/></svg>";
// ============================================================
// Desktop (1280x800) — LTR English: full Branding behavior
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);

  const opened = await page.evaluate(() =>
    document.getElementById('pdfReportsModal').classList.contains('show'));
  check('Desktop LTR: workspace open', opened === true);

  await openPanel(page, 'pdfBrandingToggle');
  let s = await stateOf(page);
  check('Desktop LTR: Branding panel opens', s.brandingOpen === true);
  check('Desktop LTR: Branding defaults brand color', s.brandVar === '#6c5ce7', 'var=' + s.brandVar);

  // Header integration — enable header so the branding header is visible.
  await clickOpt(page, 'headerEnable', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Header enable shows region', s.headerHidden === false);

  await setContentInput(page, 'companyName', 'Acme Corp');
  s = await stateOf(page);
  check('Desktop LTR: Company name updates preview', s.headerCompany === 'Acme Corp', 'text=' + s.headerCompany);
  check('Desktop LTR: Company name synced to input', s.inputCompany === 'Acme Corp', 'input=' + s.inputCompany);

  await setContentInput(page, 'logoUrl', SVG_LOGO);
  await sleep(200);
  s = await stateOf(page);
  check('Desktop LTR: Logo appears in preview', s.logoHidden === false, 'hidden=' + s.logoHidden);
  check('Desktop LTR: Logo src is a data URL', s.logoSrc.startsWith('data:image/'), 'src=' + s.logoSrc.substring(0, 30));
  check('Desktop LTR: Logo object-fit contain (no distortion)', s.logoObjectFit === 'contain', 'fit=' + s.logoObjectFit);
  const ratioOk = s.logoW > 0 && Math.abs(s.logoW - s.logoH) <= 3;
  check('Desktop LTR: Logo box keeps aspect ratio (~square)', ratioOk, `w=${s.logoW} h=${s.logoH}`);

  // Brand color — PDF-local only.
  await setColor(page, '#e63946');
  s = await stateOf(page);
  check('Desktop LTR: Brand color updates preview var', s.brandVar === '#e63946', 'var=' + s.brandVar);
  check('Desktop LTR: Brand color is PDF-local (app var untouched)', s.appBrandVar === '', 'appVar=' + s.appBrandVar);
  check('Desktop LTR: Brand color synced to picker', s.colorVal === '#e63946', 'val=' + s.colorVal);

  // Logo removal.
  await page.evaluate(() => document.getElementById('pdfBrandingLogoRemove').click());
  await sleep(150);
  s = await stateOf(page);
  check('Desktop LTR: Logo removed from preview instantly', s.logoHidden === true && s.logoSrc === '', 'hidden=' + s.logoHidden + ' src=' + s.logoSrc.substring(0, 20));
  check('Desktop LTR: Logo URL input cleared', s.inputLogo === '', 'input=' + s.inputLogo);

  // Footer integration + company information.
  await clickOpt(page, 'footerEnable', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Footer enable shows region', s.footerHidden === false);
  await setContentInput(page, 'phone', '+1 555 0100');
  await setContentInput(page, 'address', '10 Main St');
  await setContentInput(page, 'email', 'hi@acme.com');
  await setContentInput(page, 'website', 'acme.com');
  s = await stateOf(page);
  check('Desktop LTR: Phone appears in footer', s.companyInfoHidden === false && (s.companyInfoAddr || '').includes('+1 555 0100'), 'addr=' + s.companyInfoAddr);
  check('Desktop LTR: Address appears in footer', (s.companyInfoAddr || '').includes('10 Main St'));
  check('Desktop LTR: Email appears in footer', (s.companyInfoAddr || '').includes('hi@acme.com'));
  check('Desktop LTR: Website appears in footer', (s.companyInfoAddr || '').includes('acme.com'));
  check('Desktop LTR: Inputs synced', s.inputPhone === '+1 555 0100' && s.inputAddress === '10 Main St' && s.inputEmail === 'hi@acme.com' && s.inputWebsite === 'acme.com');

  // Watermark — default on with "Generated by EQ8".
  s = await stateOf(page);
  check('Desktop LTR: Watermark visible by default', s.watermarkHidden === false, 'hidden=' + s.watermarkHidden);
  check('Desktop LTR: Watermark default text', s.watermarkText === 'Generated by EQ8', 'text=' + s.watermarkText);
  await clickOpt(page, 'watermarkEnable', 'off');
  s = await stateOf(page);
  check('Desktop LTR: Watermark hides when disabled', s.watermarkHidden === true, 'hidden=' + s.watermarkHidden);
  await clickOpt(page, 'watermarkEnable', 'on');
  s = await stateOf(page);
  check('Desktop LTR: Watermark re-shows when enabled', s.watermarkHidden === false);

  check('Desktop LTR: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ============================================================
// Header/Footer remain functional + branding integrates + page numbering
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);

  await clickOpt(page, 'headerEnable', 'on');
  await setContentInput(page, 'headerContent', 'Quarterly Report');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'footerContent', 'Confidential');
  await setContentInput(page, 'companyName', 'Acme Corp');
  let s = await stateOf(page);
  check('Header check: header text live (unchanged behavior)', s.headerText === 'Quarterly Report', 'text=' + s.headerText);
  check('Header check: footer text live (unchanged behavior)', s.footerText === 'Confidential', 'text=' + s.footerText);
  check('Header check: branding company name integrates with header', s.headerCompany === 'Acme Corp', 'name=' + s.headerCompany);

  await clickOpt(page, 'pageNumbering', 'on');
  s = await stateOf(page);
  check('Footer check: page numbering remains functional', s.pageNumHidden === false && (s.pageNumText || '').includes('1'), 'text=' + s.pageNumText);
  await clickOpt(page, 'pageNumbering', 'off');
  s = await stateOf(page);
  check('Footer check: page numbering hides again', s.pageNumHidden === true, 'hidden=' + s.pageNumHidden);

  check('Header/Footer: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// Persistence — survives close/reopen AND resets on "New"
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);

  await clickOpt(page, 'headerEnable', 'on');
  await setContentInput(page, 'companyName', 'Persist Inc');
  await setContentInput(page, 'logoUrl', SVG_LOGO);
  await setColor(page, '#0f766e');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'phone', '050111');
  await setContentInput(page, 'address', 'Street 9');
  await setContentInput(page, 'email', 'p@persist.com');
  await setContentInput(page, 'website', 'persist.com');
  await setContentInput(page, 'watermarkText', 'DRAFT');
  await clickOpt(page, 'watermarkEnable', 'off');
  await sleep(150);

  let s = await stateOf(page);
  check('Persistence: values applied before close', s.headerCompany === 'Persist Inc' && s.brandVar === '#0f766e' && s.inputWebsite === 'persist.com');

  // Close then reopen in the SAME page (loads state from localStorage on open).
  await closeWorkspace(page);
  await openWorkspace(page);
  s = await stateOf(page);
  check('Persistence: company name survives close/reopen', s.headerCompany === 'Persist Inc', 'name=' + s.headerCompany);
  check('Persistence: logo survives close/reopen', s.logoHidden === false && s.logoSrc.startsWith('data:image/'), 'hidden=' + s.logoHidden);
  check('Persistence: brand color survives close/reopen', s.brandVar === '#0f766e', 'var=' + s.brandVar);
  check('Persistence: phone survives close/reopen', (s.companyInfoAddr || '').includes('050111'), 'addr=' + s.companyInfoAddr);
  check('Persistence: watermark off survives close/reopen', s.watermarkHidden === true, 'hidden=' + s.watermarkHidden);
  check('Persistence: input values synced after reopen', s.inputCompany === 'Persist Inc' && s.inputEmail === 'p@persist.com');

  // "New" resets Branding to defaults.
  await resetPdf(page);
  s = await stateOf(page);
  check('New: company name reset', s.headerCompany === '' && s.inputCompany === '', 'name=' + s.headerCompany);
  check('New: brand color reset to default', s.brandVar === '#6c5ce7', 'var=' + s.brandVar);
  check('New: logo cleared', s.logoHidden === true && s.logoSrc === '', 'hidden=' + s.logoHidden);
  check('New: watermark re-enabled with default', s.watermarkHidden === false && s.watermarkText === 'Generated by EQ8', 'text=' + s.watermarkText);
  check('New: company info cleared', s.companyInfoHidden === true, 'hidden=' + s.companyInfoHidden);

  check('Persistence: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}
// ============================================================
// RTL (Arabic) — branding panel opens/localized, updates live, no overflow
// ============================================================
{
  const { page, errors } = await newPage(1280, 800);
  await setLanguage(page, 'ar');
  await openWorkspace(page);
  await resetPdf(page);

  const dir = await page.evaluate(() => document.documentElement.dir);
  check('RTL: document direction is rtl', dir === 'rtl', 'dir=' + dir);

  await openPanel(page, 'pdfBrandingToggle');
  const label = await page.evaluate(() =>
    document.querySelector('[data-i18n="pdfBrandingCompanyName"]').textContent);
  check('RTL: Branding panel label localized (Arabic)', label === 'اسم الشركة', 'label=' + label);

  await clickOpt(page, 'headerEnable', 'on');
  await setContentInput(page, 'companyName', 'شركة الأمل');
  let s = await stateOf(page);
  check('RTL: Company name live in preview', s.headerCompany === 'شركة الأمل', 'name=' + s.headerCompany);
  check('RTL: Company name fits with RTL direction', s.dir === 'rtl');

  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'phone', '٠٥٠');
  s = await stateOf(page);
  check('RTL: Company info live in footer', (s.companyInfoAddr || '').includes('٠٥٠'), 'addr=' + s.companyInfoAddr);

  check('RTL: no horizontal document overflow', s.overflowX <= 2, 'dx=' + s.overflowX);
  check('RTL: no JS errors', noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

// ============================================================
// Responsive — Tablet / iPhone(390) / Android(360): no overflow, single row
// ============================================================
async function responsiveCheck(width, height, isMobile, tag) {
  const { page, errors } = await newPage(width, height, isMobile);
  await setLanguage(page, 'en');
  await openWorkspace(page);
  await resetPdf(page);
  await clickOpt(page, 'headerEnable', 'on');
  await clickOpt(page, 'footerEnable', 'on');
  await setContentInput(page, 'companyName', 'Long Company Name That Should Not Wrap');
  await setContentInput(page, 'logoUrl', SVG_LOGO);
  await sleep(200);
  await setContentInput(page, 'address', 'Very long address that must not break the preview layout');
  await setContentInput(page, 'email', 'contact@very-long-domain-name-example.com');
  const g = await page.evaluate(() => {
    const m = document.getElementById('pdfReportsModal');
    const tools = Array.from(document.querySelectorAll('#pdfReportsModal .pdf-tool'));
    const rows = new Set(tools.map((t) => Math.round(t.getBoundingClientRect().top)));
    return {
      modalOk: m ? m.getBoundingClientRect().bottom <= window.innerHeight + 2 : false,
      toolbarRows: rows.size,
      overflowX: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  check(`Responsive ${tag}: workspace fits viewport`, g.modalOk === true, 'bottom=' + g.modalOk);
  check(`Responsive ${tag}: toolbar stays single row`, g.toolbarRows === 1, 'rows=' + g.toolbarRows);
  check(`Responsive ${tag}: no horizontal overflow`, g.overflowX <= 2, 'dx=' + g.overflowX);
  check(`Responsive ${tag}: no JS errors`, noErrors(errors), (errors || []).join(' | ') || 'no errors');
  await page.close();
}

await responsiveCheck(1024, 768, false, 'Tablet(1024)');
await responsiveCheck(390, 844, true, 'iPhone(390)');
await responsiveCheck(360, 800, true, 'Android(360)');

const failed = results.filter((r) => !r.ok);
let summary = '\n=== PHASE 06 RESULTS: ' + (results.length - failed.length) + '/' + results.length + ' PASSED ===\n';
failed.forEach((f) => { summary += ' - ' + f.name + ': ' + f.detail + '\n'; });
console.log(summary);
if (failed.length) {
  console.log('FAILED:');
  failed.forEach((f) => console.log(' - ' + f.name + ': ' + f.detail));
}
try { await browser.close(); } catch (e) { /* ignore */ }
try { server.close(); } catch (e) { /* ignore */ }
process.exit(failed.length ? 1 : 0);