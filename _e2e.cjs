/* PHASE: Company Profile removal — real Chrome E2E verification.
 * Serves the workspace over http (ES modules need a real origin) and drives
 * Chrome via puppeteer-core. Read-only: touches no project file. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = process.cwd();
const PORT = 8788;
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:' + PORT + '/index.html';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p.replace(/^\//, ''));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('nf'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const MEASURE = () => {
  const bar = document.querySelector('.full-screen-note-action-bar');
  const btns = bar ? Array.from(bar.querySelectorAll('button')) : [];
  const barRect = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const contentLeft = barRect.left + parseFloat(cs.paddingLeft);
  const contentRight = barRect.right - parseFloat(cs.paddingRight);
  const rects = btns.map(b => {
    const r = b.getBoundingClientRect();
    return { id: b.id, left: r.left, right: r.right, width: r.width, height: r.height,
      cy: r.top + r.height / 2, aria: b.getAttribute('aria-label'), cls: b.className };
  });
  const centers = rects.map(r => (r.left + r.right) / 2);
  const deltas = [];
  for (let i = 1; i < centers.length; i++) deltas.push(+(centers[i] - centers[i - 1]).toFixed(2));
  const gaps = [];
  for (let i = 1; i < rects.length; i++) gaps.push(+(rects[i].left - rects[i - 1].right).toFixed(2));
  const titleRow = document.querySelector('.full-screen-note-title-row');
  const tr = titleRow ? titleRow.getBoundingClientRect() : null;
  const bits = {};
  ['closeFullScreenNote', 'noteTitleInput', 'noteSavedIndicator'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { const r = el.getBoundingClientRect();
      bits[id] = { left: +r.left.toFixed(1), right: +r.right.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }; }
    else { bits[id] = null; }
  });
  const tb = document.querySelector('.note-format-toolbar');
  const root = document.documentElement;
  return {
    lang: document.body.getAttribute('data-language'),
    dir: root.getAttribute('dir'),
    vw: window.innerWidth,
    cpButton: !!document.getElementById('openCompanyProfileBtn'),
    cpModal: !!document.getElementById('companyProfileModal'),
    barCount: btns.length,
    barIds: rects.map(r => r.id),
    btnWidths: rects.map(r => +r.width.toFixed(1)),
    btnHeights: rects.map(r => +r.height.toFixed(1)),
    deltas, gaps,
    evenSpread: deltas.length ? +(Math.max.apply(null, deltas) - Math.min.apply(null, deltas)).toFixed(2) : null,
    minGap: gaps.length ? Math.min.apply(null, gaps) : null,
    linked: rects.length ? +Math.abs((rects[0].left - contentLeft) - (contentRight - rects[rects.length - 1].right)).toFixed(2) : null,
    barOverflow: bar.scrollWidth - bar.clientWidth,
    insideBar: rects.length ? (rects[0].left >= barRect.left - 0.5 && rects[rects.length - 1].right <= barRect.right + 0.5) : null,
    sameRow: rects.length ? rects.every(r => Math.abs(r.cy - rects[0].cy) < 1) : null,
    barRect: { left: +barRect.left.toFixed(1), width: +barRect.width.toFixed(1) },
    pageOverflow: root.scrollWidth - window.innerWidth,
    bodyOverflow: document.body.scrollWidth - window.innerWidth,
    titleRow: tr ? { width: +tr.width.toFixed(1), height: +tr.height.toFixed(1) } : null,
    titleBits: bits,
    toolbar: tb ? { exists: true, buttons: tb.querySelectorAll('button').length,
      scrollWidth: tb.scrollWidth, clientWidth: tb.clientWidth,
      overflowX: getComputedStyle(tb).overflowX } : { exists: false }
  };
};

(async () => {
  const results = { node: process.version, url: URL, chrome: CHROME,
    combos: [], behavior: {}, summary: {} };
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1300,900']
  });

  const LAYOUT = [], BEHAVIOR = [];

  for (const lang of ['en', 'ar', 'ku']) {
    for (const width of [1280, 768, 430, 390, 360]) {
      const page = await browser.newPage();
      await page.setBypassServiceWorker(true);
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      const pageErrs = [], consoleErrs = [];
      page.on('pageerror', e => pageErrs.push(String((e && e.message) || e)));
      page.on('console', m => {
        if (m.type() !== 'error') return;
        const loc = (m.location && m.location().url) || '';
        consoleErrs.push({ text: m.text().slice(0, 200), url: loc });
      });
      const rec = { lang, width, pageErrs, consoleErrs };

      try {
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('#topBarLanguageSelect', { timeout: 20000 });
        await sleep(700);

        await page.evaluate((l) => {
          const s = document.getElementById('topBarLanguageSelect');
          s.value = l;
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }, lang);
        await sleep(400);
        rec.langApplied = await page.evaluate(() => ({
          lang: document.body.getAttribute('data-language'),
          dir: document.documentElement.getAttribute('dir'),
          sel: document.getElementById('topBarLanguageSelect').value
        }));

        const handles = await page.$$('[data-action="open-notes"]');
        for (const h of handles) { const box = await h.boundingBox(); if (box) { await h.click(); break; } }
        await page.waitForFunction(
          () => { const m = document.getElementById('notesManagerModal'); return m && m.classList.contains('show'); },
          { timeout: 15000 });
        rec.notesManagerOpened = true;

        await page.click('#openNewNoteButton');
        await page.waitForFunction(
          () => { const m = document.getElementById('fullScreenNoteModal'); return m && m.classList.contains('show'); },
          { timeout: 15000 });
        await sleep(350);
        rec.editorOpened = true;

        rec.measure = await page.evaluate(MEASURE);
        LAYOUT.push(rec);
      } catch (e) {
        rec.error = String((e && e.message) || e).slice(0, 400);
      }
        // ---- behaviour regression: once per language, on the 390px pass ----
        if (width === 390) {
          const beh = { lang, steps: {} };
          const step = async (name, fn) => {
            const before = pageErrs.length;
            try { beh.steps[name] = { ok: true, value: await fn() }; }
            catch (e) { beh.steps[name] = { ok: false, error: String((e && e.message) || e).slice(0, 300) }; }
            beh.steps[name].newPageErrors = pageErrs.slice(before);
          };

          await step('save', async () => {
            await page.click('#saveFullScreenNote');
            await sleep(500);
            return await page.evaluate(() => ({
              indicator: (document.getElementById('noteSavedIndicator') || {}).textContent,
              notesStored: JSON.parse(localStorage.getItem('eq-notes') || '[]').length,
              toast: (document.getElementById('toast') || {}).textContent || null
            }));
          });

          await step('previewPdf', async () => {
            await page.click('#notePreviewPdfBtn');
            await page.waitForFunction(
              () => { const m = document.getElementById('notePdfPreviewModal'); return m && m.classList.contains('show'); },
              { timeout: 12000 });
            const open = await page.evaluate(() => document.getElementById('notePdfPreviewModal').classList.contains('show'));
            await page.click('#notePdfPreviewClose');
            await sleep(300);
            const closed = await page.evaluate(() => document.getElementById('notePdfPreviewModal').classList.contains('show'));
            return { opened: open, stillOpenAfterBack: closed };
          });
          await step('exportPdfDialog', async () => {
            await page.click('#exportNotePdfBtn');
            await page.waitForFunction(
              () => { const m = document.getElementById('noteExportPdfModal'); return m && m.classList.contains('show'); },
              { timeout: 12000 });
            const v = await page.evaluate(() => {
              const cb = document.getElementById('noteExportCompany');
              const row = cb ? cb.closest('.note-export-check') : null;
              return { opened: true, useCompanyProfileCheckbox: !!cb,
                disabled: cb ? cb.disabled : null,
                label: row ? row.textContent.trim() : null,
                otherDialogFields: ['noteExportStyle', 'noteExportTitle', 'noteExportDate']
                  .filter(id => !!document.getElementById(id)) };
            });
            await page.click('#noteExportPdfClose');
            await sleep(300);
            v.stillOpenAfterBack = await page.evaluate(() =>
              document.getElementById('noteExportPdfModal').classList.contains('show'));
            return v;
          });

          await step('send', async () => {
            await page.click('#sendNoteBtn');
            await sleep(900);
            return await page.evaluate(() => ({
              toast: (document.getElementById('toast') || {}).textContent || null,
              editorStillOpen: document.getElementById('fullScreenNoteModal').classList.contains('show'),
              shareSupported: typeof navigator.share === 'function'
            }));
          });

          await step('back', async () => {
            await page.click('#closeFullScreenNote');
            await sleep(400);
            return await page.evaluate(() => ({
              editorOpen: document.getElementById('fullScreenNoteModal').classList.contains('show')
            }));
          });

          BEHAVIOR.push(beh);
        }

      await page.close();
    }
  }

  await browser.close();
  server.close();
  results.combos = LAYOUT;
  results.behavior = BEHAVIOR;
  fs.writeFileSync('_e2e_results.json', JSON.stringify(results, null, 2));
  console.log('E2E_DONE combos=' + LAYOUT.length + ' behaviour=' + BEHAVIOR.length);
})().catch(e => { try { server.close(); } catch (x) {} console.error('E2E_FATAL ' + ((e && e.stack) || e)); process.exit(1); });