// PART 13 → PART 11 PDF integration. Verifies that when "Use Company Profile" is
// checked in the PART 11 Export dialog, the Company Profile (logo / footer /
// contact / signature) is actually injected into the PDF report HTML; OFF omits it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8378;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk0UOwkzEs5Kd5Prv2AQBMAWAB8H6fAAQHoODVFAAAEnRYdN+FX0yd+HF0zUwAAAAAAAAAAAAAAAAAAA==';
const STORAGE_KEY = 'eq-note-manager-notes';
const FOLDERS_KEY = 'eq-note-folders';
const PROFILE_KEY = 'eq-note-company-profile';
const COMPANY_KEY = 'eq-history-company-name';
const LANG_KEY = 'eq-language';
let pass = 0, fail = 0, preexisting = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function check(name, ok, detail = '') { console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  -> ' + detail : '')); if (ok) pass++; else fail++; }
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    res.writeHead(200, { 'Content-Type': mimeOf(f) + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) errs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else errs.push('console: ' + m.text()); } });
await page.evaluateOnNewDocument(() => {
  window.__cap = '';
  window.html2pdf = function () {
    let src = null;
    const chain = { set() { return chain; }, from(el) { src = el; return chain; }, toPdf() { return chain; }, save() { return chain; }, output() { if (src) { try { window.__cap = src.outerHTML || ''; } catch (e) {} } return Promise.resolve(new Blob(['%PDF-1.5 stub'], { type: 'application/pdf' })); } };
    return chain;
  };
});
console.log('=== PART 13 → PART 11 PDF integration ===');
try {
  const profile = { companyName: 'Acme Corp', address: '123 Main St', phone: '+15551234', email: 'a@b.com', website: 'https://acme.com', logo: PNG, signature: PNG, stamp: PNG, footer: 'Acme footer' };
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(600);
  await page.evaluate((k, n) => localStorage.setItem(k, JSON.stringify([{ id: 'n1', title: 'Company Note', body: 'Body', bodyFormatting: [], folderId: 'personal', createdAt: 1, updatedAt: 1 }])), STORAGE_KEY);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify([{ id: 'personal', name: 'Personal' }])), FOLDERS_KEY);
  await page.evaluate((k, v) => localStorage.setItem(k, JSON.stringify(v)), PROFILE_KEY, profile);
  await page.evaluate((k, v) => localStorage.setItem(k, v), COMPANY_KEY, 'Acme Corp');
  await page.evaluate((k, v) => localStorage.setItem(k, v), LANG_KEY, 'en');
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(600);
  await page.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await page.evaluate(() => { const it = Array.from(document.querySelectorAll('#notesList .note-item')).find((i) => i.textContent.includes('Company Note')); if (it) it.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(300);
  // ON: company checkbox checked
  await page.evaluate(() => { document.getElementById('exportNotePdfBtn').click(); });
  await page.waitForSelector('#noteExportPdfModal.show', { visible: true, timeout: 6000 });
  await page.evaluate(() => { const c = document.getElementById('noteExportCompany'); c.checked = true; });
  await page.evaluate(() => { window.__cap = ''; document.getElementById('noteExportCreateBtn').click(); });
  await sleep(1200);
  const htmlOn = await page.evaluate(() => window.__cap || '');
  check('ON: PDF HTML contains company name', htmlOn.includes('Acme Corp'), 'len=' + htmlOn.length);
  check('ON: PDF HTML contains logo <img>', /<img class="eq-pdf-company-logo"/.test(htmlOn), '');
  check('ON: PDF HTML contains footer', htmlOn.includes('Acme footer'), '');
  check('ON: PDF HTML contains contact', htmlOn.includes('+15551234') && htmlOn.includes('a@b.com'), '');
  check('ON: PDF HTML contains signature img', /<img class="eq-pdf-company-signature"/.test(htmlOn), '');
  await page.evaluate(() => { document.getElementById('noteExportPdfClose').click(); });
  await sleep(200);
  // OFF: uncheck company
  await page.evaluate(() => { document.getElementById('exportNotePdfBtn').click(); });
  await page.waitForSelector('#noteExportPdfModal.show', { visible: true, timeout: 6000 });
  await page.evaluate(() => { const c = document.getElementById('noteExportCompany'); c.checked = false; });
  await page.evaluate(() => { window.__cap = ''; document.getElementById('noteExportCreateBtn').click(); });
  await sleep(1200);
  const htmlOff = await page.evaluate(() => window.__cap || '');
  check('OFF: PDF HTML contains NO company logo', !/<img class="eq-pdf-company-logo"/.test(htmlOff), '');
  check('OFF: PDF HTML omits footer', !htmlOff.includes('Acme footer'), '');
  // Missing profile does not block
  await page.evaluate((k) => localStorage.removeItem(k), PROFILE_KEY);
  await page.evaluate(() => { document.getElementById('noteExportPdfClose').click(); });
  await sleep(200);
  await page.evaluate(() => { document.getElementById('exportNotePdfBtn').click(); });
  await page.waitForSelector('#noteExportPdfModal.show', { visible: true, timeout: 6000 });
  await page.evaluate(() => { const c = document.getElementById('noteExportCompany'); c.checked = true; });
  await page.evaluate(() => { window.__cap = ''; document.getElementById('noteExportCreateBtn').click(); });
  await sleep(1200);
  check('Missing profile: no company block injected (export continues)', await page.evaluate(() => { const h = window.__cap || ''; return !/<img class="eq-pdf-company-logo"/.test(h); }), '');
  check('Console: no new errors from PART 13 PDF integration', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
} catch (e) {
  check('Runtime completed without top-level error', false, String((e && e.message) || e));
}
try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
console.log('RESULTS_JSON=' + JSON.stringify({ pass, fail, not_verified: 0, preexisting, total: pass + fail }));
try { fs.writeFileSync(path.join(HERE, 'p13_pdf_results.txt'), JSON.stringify({ pass, fail, not_verified: 0, preexisting }) + '\n', 'utf8'); } catch (e) {}
process.exit(fail > 0 ? 1 : 0);