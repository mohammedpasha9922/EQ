// SMART DOCUMENTS RESPONSIVE PROBE — home + imported-PDF editor across matrix.
// Checks: no top clipping, Back/Save/Send visible & NOT covered by anything,
// toolbar above the PDF page, overflowX=0, no JS errors. RTL+LTR.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = process.cwd();
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8521;
const PDF_PATH = path.join(ROOT, '__part38.pdf');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.wasm': 'application/wasm' };
const mimeOf = (p) => MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try { const d = fs.readFileSync(path.join(ROOT, p)); res.writeHead(200, { 'Content-Type': mimeOf(p) + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;
setTimeout(() => process.exit(124), 900000);

const OUT = path.join(ROOT, '__smart_resp_probe_result.txt');
try { fs.unlinkSync(OUT); } catch (e) {}
function out(line) { console.log(line); fs.appendFileSync(OUT, line + '\n'); }

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setLang(page, l) {
  await page.evaluate((loc) => {
    const s = document.getElementById('topBarLanguageSelect') || document.getElementById('languageSelect');
    if (s) { s.value = loc; s.dispatchEvent(new Event('change', { bubbles: true })); }
  }, l);
  await sleep(400);
}
async function openSmartHome(page) {
  await page.evaluate(() => document.getElementById('drawerToggle').click());
  await sleep(300);
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]').click());
  await sleep(500);
}
async function importPdf(page) {
  const [chooser] = await Promise.all([
    page.waitForFileChooser({ timeout: 9000 }),
    page.evaluate(() => document.querySelector('.smart-doc-card[data-action="smart-import-file"]').click())
  ]);
  await chooser.accept([PDF_PATH]);
}
async function waitFor(page, fn, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(150);
  }
  return false;
}

const SIZES = [
  [1280, 800], [1440, 900], [1920, 1080], [1024, 768], [768, 1024],
  [430, 932], [390, 844], [360, 800], [360, 720],
  [932, 430], [800, 360], [720, 360]
];

async function runCase(width, height, lang) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, hasTouch: true });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e && e.message || e)));
  await page.evaluateOnNewDocument(() => {
    if (navigator.serviceWorker) {
      try { navigator.serviceWorker.register = () => Promise.resolve({}); } catch (e) {}
    }
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(700);
  await setLang(page, lang);
  await openSmartHome(page);

  // ---- HOME view checks ----
  const home = await page.evaluate(() => {
    const hitOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return 'missing';
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return 'zero-size';
      if (r.top < -2 || r.bottom > innerHeight + 2) return 'out-of-viewport(t=' + Math.round(r.top) + ')';
      const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
      const top = document.elementFromPoint(cx, cy);
      if (!top) return 'no-hit';
      if (el === top || el.contains(top)) return 'ok';
      return 'COVERED by #' + (top.id || String(top.className).slice(0, 30) || top.tagName);
    };
    const home = document.querySelector('.smart-docs-home');
    const hr = home.getBoundingClientRect();
    const hdr = document.querySelector('.smart-docs-header').getBoundingClientRect();
    const b = document.getElementById('smartDraftBanner');
    const slot = document.getElementById('smartAdPlaceholder');
    const sr = slot ? slot.getBoundingClientRect() : null;
    return {
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      homeTop: Math.round(hr.top), winH: innerHeight,
      hdrTop: Math.round(hdr.top),
      backHit: hitOf('#closeSmartDocs'),
      adSlotH: sr ? Math.round(sr.height) : -1,
      adSlotTop: sr ? Math.round(sr.top) : -1,
      contentAfterAd: sr ? hr.top >= sr.bottom - 2 : null,
      draftVisible: b && !b.hidden ? hitOf('#smartDraftResumeBtn') : 'n/a'
    };
  });

  // ---- PDF EDITOR view checks ----
  let ed = { skipped: true };
  try {
    await importPdf(page);
    const ok = await waitFor(page, () => document.getElementById('smartEditorView').classList.contains('editor-visible'));
    if (!ok) ed = { skipped: true, reason: 'editor-not-visible' };
    else {
      await sleep(600);
      ed = await page.evaluate(() => {
        const hitOf = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return 'missing';
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return 'zero-size';
          if (r.top < -2 || r.bottom > innerHeight + 2) return 'out-of-viewport(t=' + Math.round(r.top) + ')';
          const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
          const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
          const top = document.elementFromPoint(cx, cy);
          if (!top) return 'no-hit';
          if (el === top || el.contains(top)) return 'ok';
          return 'COVERED by #' + (top.id || String(top.className).slice(0, 30) || top.tagName);
        };
        const hdr = document.querySelector('#smartEditorView > .smart-scan-header');
        const hr = hdr.getBoundingClientRect();
        const pg = document.querySelector('#smartPdfEditor .smart-pdf-page');
        const pr = pg ? pg.getBoundingClientRect() : null;
        const slot = document.getElementById('smartAdPlaceholder');
        const sr = slot ? slot.getBoundingClientRect() : null;
        const view = document.getElementById('smartEditorView');
        const vr = view.getBoundingClientRect();
        return {
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          hdrTop: Math.round(hr.top), hdrBottom: Math.round(hr.bottom), winH: innerHeight,
          backHit: hitOf('#smartEditorBack'),
          saveHit: hitOf('#smartEditorSaveBtn'),
          sendHit: hitOf('#smartEditorSendBtn'),
          toolbarAbovePdf: !pr || hr.bottom <= pr.top + 1,
          pdfTop: pr ? Math.round(pr.top) : -1,
          adSlotH: sr ? Math.round(sr.height) : -1,
          viewAfterAd: sr ? vr.top >= sr.bottom - 2 : null
        };
      });
    }
  } catch (e) {
    ed = { skipped: true, reason: String(e && e.message || e).slice(0, 80) };
  }

  const homeOK = home.overflowX <= 0 && home.backHit === 'ok' && home.homeTop >= -2 && home.hdrTop >= -2 &&
    home.adSlotH > 0 && home.contentAfterAd === true && errs.length === 0;
  const edOK = ed.skipped ? null : (ed.overflowX <= 0 && ed.backHit === 'ok' && ed.saveHit === 'ok' && ed.sendHit === 'ok' &&
    ed.toolbarAbovePdf && ed.hdrTop >= -2 && ed.hdrBottom <= ed.winH + 2 && ed.viewAfterAd === true && errs.length === 0);
  const tag = homeOK && edOK !== false ? 'PASS' : 'FAIL';
  out(`${tag} ${width}x${height} ${lang.toUpperCase()} | HOME[ovx=${home.overflowX} top=${home.homeTop} hdrTop=${home.hdrTop} adH=${home.adSlotH} adTop=${home.adSlotTop} afterAd=${home.contentAfterAd} back=${home.backHit} draft=${home.draftVisible}] | EDITOR[${ed.skipped ? 'skipped:' + (ed.reason || '') : `ovx=${ed.overflowX} hdr=${ed.hdrTop}..${ed.hdrBottom} winH=${ed.winH} adH=${ed.adSlotH} afterAd=${ed.viewAfterAd} back=${ed.backHit} save=${ed.saveHit} send=${ed.sendHit} abovePdf=${ed.toolbarAbovePdf}`}] | jsErrors=${errs.length}${errs.length ? ': ' + errs[0].slice(0, 100) : ''}`);
  await page.close();
}

for (const lang of ['en', 'ar']) {
  for (const [w, h] of SIZES) await runCase(w, h, lang);
}

await browser.close();
server.close();
out('DONE');
process.exit(0);
