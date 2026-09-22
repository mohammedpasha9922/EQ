// PART 35 — SMART DOCUMENTS / EXISTING PDF SEPARATION
// History → Insert Result → Smart Document (one-way copy integration).
// Run: node tests/part35_history_insert_result.test.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8355;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.txt': 'text/plain', '.wasm': 'application/wasm'
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
const URLBASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const results = [];
const OUT = path.join(ROOT, '__p35_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
fs.appendFileSync(OUT, 'STARTED\n');
function check(name, ok, detail = '') {
  results.push({ name, ok });
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`;
  console.log(line);
  fs.appendFileSync(OUT, line + '\n');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 300000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
async function newPage(viewport) {
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.goto(URLBASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(600);
  return { page, errs };
}
async function cleanState(page) {
  await page.evaluate(async () => {
    try {
      localStorage.removeItem('eq-smart-doc-meta-v1');
      localStorage.removeItem('eq-smart-doc-backend-v1');
      localStorage.removeItem('eq-smart-doc-draft-v1');
      localStorage.removeItem('eq-history');
      if (window.__smartSave && window.__smartSave.clearDraft) window.__smartSave.clearDraft();
      if (window.__smartDrafts && window.__smartDrafts.list) {
        const list = await window.__smartDrafts.list();
        for (const en of list.list) await window.__smartDrafts.remove(en.key);
      }
      const rec = await new Promise((res) => {
        const op = indexedDB.open('eq_smart_docs_db', 1);
        op.onsuccess = () => res(op.result); op.onerror = () => res(null);
      });
      if (rec) {
        await new Promise((res) => {
          try {
            const tx = rec.transaction('documents', 'readwrite');
            tx.objectStore('documents').clear();
            tx.oncomplete = () => res(); tx.onerror = () => res();
          } catch (e) { res(); }
        });
        rec.close();
      }
    } catch (e) {}
  });
  await sleep(250);
}
// Real calculator taps create a REAL history entry via handleEquals.
async function calc(page, keys) {
  for (const k of keys) {
    await page.evaluate((kk) => {
      const sel = kk === '=' ? '.keypad-btn.equals'
        : ['+', '-', '*', '/'].includes(kk) ? `.keypad-btn.operator[data-value="${kk}"]`
        : `.keypad-btn.number[data-value="${kk}"]`;
      const b = document.querySelector(sel);
      if (b) b.click();
    }, k);
    await sleep(90);
  }
  await sleep(300);
}
async function openHistoryViaDrawer(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(250);
  await page.evaluate(() => {
    const i = document.querySelector('.drawer-menu-item[data-action="open-history"]');
    if (i) i.click();
  });
  await sleep(400);
}
const histFromStorage = (page) => page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('eq-history') || '[]'); } catch (e) { return []; }
});
const editorVisible = (page) => page.evaluate(() =>
  !!document.getElementById('smartBlankView') &&
  document.getElementById('smartBlankView').classList.contains('blank-visible'));
const docText = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('#smartBlankCanvasHolder .smart-document-content'))
    .map((n) => n.textContent).join(' | '));

// A) BOUNDARY
{
  const { page, errs } = await newPage({ width: 1280, height: 800 });
  await cleanState(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(600);
  await calc(page, ['1', '2', '+', '3', '=']);
  let hist = await histFromStorage(page);
  check('A0) Calculator creates a real History entry (12+3=15)',
    hist.length === 1 && hist[0].result.includes('15'), JSON.stringify(hist[0] || {}));
  await openHistoryViaDrawer(page);
  await page.evaluate(() => {
    const inp = document.querySelector('.history-note-input');
    if (inp) { inp.value = 'mytag'; inp.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await sleep(300);
  const pdfBtns = await page.evaluate(() => ({
    share: !!document.querySelector('.history-share-btn'),
    insert: !!document.querySelector('.history-insert-smart-btn')
  }));
  check('A1) History renders both Share (old PDF) and Insert Result buttons', pdfBtns.share && pdfBtns.insert, JSON.stringify(pdfBtns));
  const insTitle = await page.evaluate(() => document.querySelector('.history-insert-smart-btn').getAttribute('title'));
  check('A2) Insert Result button localized title', insTitle === 'Insert Result', insTitle);
  await page.evaluate(() => { const b = document.querySelector('.history-share-btn'); if (b) b.click(); });
  await sleep(500);
  check('A3) Existing PDF share does NOT open Smart Documents', !(await editorVisible(page)), '');
  await page.evaluate(() => document.querySelector('.history-insert-smart-btn').click());
  await sleep(700);
  check('A4) Insert Result opens Smart Document editor', await editorVisible(page), '');
  const txt = await docText(page);
  check('A5) Inserted content shows expression/result/note/Total',
    txt.includes('12') && txt.includes('15') && txt.includes('mytag') && txt.toLowerCase().includes('total'), JSON.stringify(txt.slice(0, 220)));
  check('A6) Insert is copy semantics — History unchanged', (await histFromStorage(page)).length === 1, '');
  await page.evaluate(() => { try { document.getElementById('smartSaveDraftBtn').click(); } catch (e) {} });
  await sleep(800);
  check('A7) Smart Document saves locally (IndexedDB draft)',
    await page.evaluate(async () => !!(window.__smartSave && await window.__smartSave.readDraft())), '');

  // B) INDEPENDENCE
  await page.evaluate(() => {
    const s = document.querySelector('#smartBlankCanvasHolder .smart-document-content');
    s.querySelector('.smart-doc-text-block').textContent = 'EDITED-IN-DOC-XYZ';
  });
  await sleep(200);
  hist = await histFromStorage(page);
  check('B1) Editing Smart Document does NOT change History',
    hist.length === 1 && hist[0].note === 'mytag' && !JSON.stringify(hist).includes('EDITED-IN-DOC'), JSON.stringify(hist).slice(0, 160));
  // Change History (new real calculation) while the document stays open
  await calc(page, ['9', '*', '9', '=']);
  const txtAfterHistChange = await docText(page);
  hist = await histFromStorage(page);
  check('B2) Changing History does NOT change the open Smart Document',
    txtAfterHistChange.includes('12') && !txtAfterHistChange.includes('81') && hist.length === 2, '');
  // Delete Smart Drafts -> History intact
  await page.evaluate(async () => {
    const list = await window.__smartDrafts.list();
    for (const en of list.list) await window.__smartDrafts.remove(en.key);
  });
  await sleep(400);
  check('B3) Deleting Smart Draft keeps History intact', (await histFromStorage(page)).length === 2, '');
  // Re-save draft, then delete History -> saved Smart Document survives
  await page.evaluate(() => { try { document.getElementById('smartSaveDraftBtn').click(); } catch (e) {} });
  await sleep(800);
  await page.evaluate(() => localStorage.removeItem('eq-history'));
  await sleep(200);
  check('B4) Deleting History keeps saved Smart Document',
    await page.evaluate(async () => {
      const d = await window.__smartSave.readDraft();
      return !!d && d.pages.join(' ').includes('12');
    }), '');
  const engines = await page.evaluate(() => ({
    smartPdf: typeof window.__smartPdfExport === 'object'
  }));
  check('B5) Smart Documents PDF export has its own seam/entry points', engines.smartPdf, '');
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(900);
  check('B6) Saved Smart Document independent of History after reload',
    await page.evaluate(async () => {
      const d = await window.__smartSave.readDraft();
      return !!d;
    }), '');
  check('A8/B7) No JS errors (boundary/independence)', errs.length === 0, errs.join(' | '));
  await page.close();
}

// C) RTL + i18n + RESPONSIVE
{
  const { page, errs } = await newPage({ width: 360, height: 720 });
  await cleanState(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(600);
  await page.evaluate((l) => {
    const s = document.getElementById('topBarLanguageSelect');
    if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, 'ar');
  await sleep(400);
  await calc(page, ['5', '*', '4', '=']);
  await openHistoryViaDrawer(page);
  const btnTitle = await page.evaluate(() => {
    const b = document.querySelector('.history-insert-smart-btn');
    return b ? b.getAttribute('title') : '';
  });
  check('C1) Arabic locale: localized Insert Result title', btnTitle === 'إدراج النتيجة', btnTitle);
  await page.evaluate(() => document.querySelector('.history-insert-smart-btn').click());
  await sleep(700);
  const rtl = await page.evaluate(() => {
    const h = document.querySelector('#smartBlankCanvasHolder .smart-doc-heading');
    return h ? { dir: h.getAttribute('dir'), styleDir: h.style.direction } : null;
  });
  check('C2) Inserted blocks follow RTL direction', !!rtl && rtl.dir === 'rtl' && rtl.styleDir === 'rtl', JSON.stringify(rtl));
  await openHistoryViaDrawer(page);
  const overflow = await page.evaluate(() => {
    const p = document.getElementById('historyPanel');
    return p.scrollWidth - p.clientWidth;
  });
  check('C3) Mobile 360px: no horizontal overflow in History', overflow <= 1, String(overflow));
  check('C4) No JS errors (RTL/mobile)', errs.length === 0, errs.join(' | '));
  await page.close();
}

await browser.close();
server.close();
const fails = results.filter((r) => !r.ok).length;
fs.appendFileSync(OUT, `\nTOTAL ${results.length}  PASS ${results.length - fails}  FAIL ${fails}\n`);
console.log(`\nTOTAL ${results.length}  PASS ${results.length - fails}  FAIL ${fails}`);
process.exit(fails ? 1 : 0);
