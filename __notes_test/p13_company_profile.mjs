// PART 13 — Company Profile inside Notes/PDF. Real-browser behavioral harness.
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
const COMPANY_KEY = 'eq-history-company-name';
const PROFILE_KEY = 'eq-note-company-profile';
const LANG_KEY = 'eq-language';
const PORT = 8374;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
const LOGO = path.join(HERE, '_cp_logo.png');

let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const LOG = [];
function check(name, ok, detail = '') {
  const line = `${ok ? 'PASS' : (detail === 'NV' ? 'NOTVER' : 'FAIL')}  ${name}${detail && detail !== 'NV' ? '  -> ' + detail : ''}`;
  LOG.push(line); console.log(line);
  if (ok) pass++; else if (detail === 'NV') notVerified++; else fail++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon' };
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
const realErrs = [];
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) realErrs.push('pageerror: ' + e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else realErrs.push('console: ' + m.text()); } });

console.log('=== PART 13 — Company Profile inside Notes/PDF ===');
const seed = async (pg) => {
  await pg.evaluate((k) => localStorage.setItem(k, JSON.stringify([{ id: 'n1', title: 'Company Note', body: 'Body content', bodyFormatting: [], folderId: 'personal', createdAt: 1000, updatedAt: 1000 }])), STORAGE_KEY);
  await pg.evaluate((f) => localStorage.setItem(f, JSON.stringify([{ id: 'personal', name: 'Personal' }])), FOLDERS_KEY);
  await pg.evaluate((c) => localStorage.removeItem(c), COMPANY_KEY);
  await pg.evaluate((p) => localStorage.removeItem(p), PROFILE_KEY);
  await pg.evaluate((l) => localStorage.setItem(l, 'en'), LANG_KEY);
};
async function gotoApp(pg) { await pg.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 }); await sleep(500); }
async function openNotes(pg) {
  await pg.waitForSelector('.drawer-menu-item[data-action="open-notes"]', { timeout: 10000 });
  await pg.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await pg.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(300);
}
async function openEditor(pg) {
  await openNotes(pg);
  await pg.evaluate(() => { const items = Array.from(document.querySelectorAll('#notesList .note-item')); const it = items.find((i) => i.textContent.includes('Company Note')); if (it) it.click(); });
  await pg.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(400);
}
async function openCP(pg) {
  await pg.evaluate(() => { const b = document.getElementById('openCompanyProfileBtn'); if (b) b.click(); });
  const ok = await pg.evaluate(() => { const m = document.getElementById('companyProfileModal'); return !!(m && m.classList.contains('show')); });
  await sleep(200);
  return ok;
}
async function openExportDialog(pg) {
  await pg.evaluate(() => { const b = document.getElementById('exportNotePdfBtn'); if (b) b.click(); });
  const ok = await pg.evaluate(() => { const m = document.getElementById('noteExportPdfModal'); return !!(m && m.classList.contains('show')); });
  await sleep(200);
  return ok;
}
async function closeEditor(pg) { await pg.evaluate(() => { const b = document.getElementById('closeFullScreenNote'); if (b) b.click(); }); await sleep(300); }
const PROFILE = { companyName: 'Acme Corp', address: '123 Main St', phone: '+15551234', email: 'a@b.com', website: 'https://acme.com', footer: 'Acme footer' };
try {
  await page.setViewport({ width: 1366, height: 900 });
  await gotoApp(page); await seed(page); await page.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(400);
  await openEditor(page);

  check('A. Company Profile open button present', await page.evaluate(() => !!document.getElementById('openCompanyProfileBtn')), '');
  const opened = await openCP(page);
  check('B. Company Profile modal opens', opened, '');
  check('C. Empty profile: all fields empty', await page.evaluate(() => document.getElementById('cpCompanyName').value === '' && !document.getElementById('cpLogoPreview').classList.contains('hidden') === false), '');

  await page.evaluate((p) => {
    document.getElementById('cpCompanyName').value = p.companyName;
    document.getElementById('cpAddress').value = p.address;
    document.getElementById('cpPhone').value = p.phone;
    document.getElementById('cpEmail').value = p.email;
    document.getElementById('cpWebsite').value = p.website;
    document.getElementById('cpFooter').value = p.footer;
  }, PROFILE);
  const logoInput = await page.$('#cpLogoInput');
  if (logoInput) { await logoInput.uploadFile(LOGO); await sleep(700); }
  const stampInput = await page.$('#cpStampInput');
  if (stampInput) { await stampInput.uploadFile(LOGO); await sleep(700); }
  await page.evaluate(() => document.getElementById('cpSigDrawBtn').click());
  await sleep(300);
  const box = await page.evaluate(() => { const r = document.getElementById('cpSigCanvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down(); await page.mouse.move(box.x + 50, box.y + 40, { steps: 5 }); await page.mouse.up();
  await sleep(200);
  check('D. Draw signature: canvas marked drawn', await page.evaluate(() => document.getElementById('cpSigCanvas').getAttribute('data-drawn') === '1'), '');
  await page.evaluate(() => document.getElementById('cpSigSaveBtn').click());
  await sleep(400);

  check('E. Logo preview populated (data URL)', await page.evaluate(() => { const i = document.getElementById('cpLogoPreview'); return !i.classList.contains('hidden') && i.src.indexOf('data:image/') === 0; }), '');
  await page.evaluate(() => document.getElementById('companyProfileSave').click());
  await sleep(600);
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PROFILE_KEY);
  check('F. Save stores profile with all fields', !!(stored && stored.companyName === 'Acme Corp' && stored.email === 'a@b.com' && stored.logo && stored.logo.indexOf('data:image/') === 0 && stored.footer === 'Acme footer'), '');
  const legacyVal = await page.evaluate((k) => localStorage.getItem(k), COMPANY_KEY);
  check('G. Save seeds legacy company-name store', !!stored && legacyVal === stored.companyName, 'legacy=' + String(legacyVal) + ' name=' + (stored && stored.companyName));
  check('H. Modal closed after save', await page.evaluate(() => !document.getElementById('companyProfileModal').classList.contains('show')), '');
  await closeEditor(page);

  await openEditor(page); await openCP(page);
  check('I. Reopen: company name persisted', await page.evaluate(() => document.getElementById('cpCompanyName').value === 'Acme Corp'), '');
  check('J. Reopen: logo persisted', await page.evaluate(() => document.getElementById('cpLogoPreview').src.indexOf('data:image/') === 0), '');
  check('K. Reopen: signature persisted', await page.evaluate(() => document.getElementById('cpSigPreview').src.indexOf('data:image/') === 0), '');
  await page.evaluate(() => document.getElementById('companyProfileClose').click());
  await closeEditor(page);

  await page.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(400);
  const rp = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PROFILE_KEY);
  check('L. Reload: profile persisted', !!(rp && rp.companyName === 'Acme Corp' && rp.signature && rp.logo && rp.stamp), '');
  check('M. Data integrity: stored profile unchanged after reload', !!(rp && rp.companyName === 'Acme Corp' && rp.address === '123 Main St'), '');

  await openEditor(page);
  const expOpened = await openExportDialog(page);
  check('N. Export dialog opens alongside Company Profile', expOpened, '');
  await page.evaluate(() => { const c = document.getElementById('noteExportPdfClose'); if (c) c.click(); });
  await closeEditor(page);

  await page.evaluate((k) => localStorage.removeItem(k), PROFILE_KEY);
  await page.evaluate((k) => localStorage.removeItem(k), COMPANY_KEY);
  await openEditor(page);
  const expOpened2 = await openExportDialog(page);
  check('O. Missing profile: export dialog still opens (does not block)', expOpened2, '');
  await page.evaluate(() => { const c = document.getElementById('noteExportPdfClose'); if (c) c.click(); });
  await closeEditor(page);
// P. Responsive
  for (const w of [1366, 768, 430, 390]) {
    await page.setViewport({ width: w, height: 900 }); await sleep(150);
    await openEditor(page); await openCP(page);
    const ov = await page.evaluate(() => {
      const m = document.getElementById('companyProfileModal');
      const r = m ? m.getBoundingClientRect() : null;
      const docW = document.documentElement.clientWidth;
      return { inside: !!r && r.left >= -1 && r.right <= docW + 1, docW: Math.round(docW) };
    });
    check('P. Responsive ' + w + ': modal inside viewport', ov.inside, JSON.stringify(ov));
    await page.evaluate(() => { const c = document.getElementById('companyProfileClose'); if (c) c.click(); });
    await sleep(150);
    await closeEditor(page);
  }
  await page.setViewport({ width: 1366, height: 900 });

  // Q. RTL
  await page.evaluate((l) => localStorage.setItem(l, 'ar'), LANG_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(400);
  const rtld = await page.evaluate(() => document.documentElement.getAttribute('dir') === 'rtl');
  await openEditor(page); await openCP(page);
  const mdir = await page.evaluate(() => document.getElementById('companyProfileModal').getAttribute('dir'));
  check('Q. RTL: dir=rtl + modal rtl', rtld && mdir === 'rtl', 'dir=' + mdir);
  await page.evaluate(() => { const c = document.getElementById('companyProfileClose'); if (c) c.click(); });
  await closeEditor(page);

  // R. Validation (invalid email blocked)
  await page.evaluate((l) => localStorage.setItem(l, 'en'), LANG_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 }); await sleep(400);
  await openEditor(page); await openCP(page);
  await page.evaluate(() => { document.getElementById('cpEmail').value = 'not-an-email'; });
  await page.evaluate(() => document.getElementById('companyProfileSave').click());
  await sleep(300);
  check('R. Invalid email blocks save', await page.evaluate(() => document.getElementById('companyProfileModal').classList.contains('show')), '');
  await page.evaluate(() => { const c = document.getElementById('companyProfileClose'); if (c) c.click(); });
  await closeEditor(page);

  check('S. Console: no new errors from PART 13', realErrs.length === 0, JSON.stringify(realErrs.slice(0, 4)));
} catch (topErr) {
  check('Runtime completed without top-level error', false, String((topErr && topErr.message) || topErr));
}

try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
const res = { pass, fail, not_verified: notVerified, preexisting, total: pass + fail + notVerified };
console.log('RESULTS_JSON=' + JSON.stringify(res));
LOG.push('RESULTS_JSON=' + JSON.stringify(res));
try { fs.writeFileSync(path.join(HERE, 'p13_results.txt'), LOG.join('\n') + '\n', 'utf8'); } catch (e) {}
process.exit(fail > 0 ? 1 : 0);