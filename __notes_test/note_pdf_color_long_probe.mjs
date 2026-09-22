// Notes → PDF probe: colored table cells + long-note last-paragraph survival.
// Real editor, real serializeNoteEditor, real exportNotePdfBtn pipeline; ONLY
// window.html2pdf is stubbed at the capture boundary to read the exact element
// the pipeline is asked to rasterize. (Real html2canvas rasterization is NOT
// possible headless — documented environment limitation.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8396;
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
    window.__captures = [];
    window.__capturedHtml = '';
    window.html2pdf = function () {
      let src = null;
      const chain = {
        set() { return chain; }, from(el) { src = el; return chain; }, toPdf() { return chain; }, save() { return chain; },
        output() {
          if (src) { try { const h = src.outerHTML || ''; window.__captures.push({ len: h.length, t: Date.now() }); window.__capturedHtml = h; } catch (e) {} }
          return Promise.resolve(new Blob(['%PDF-1.4 stub'], { type: 'application/pdf' }));
        }
      };
      return chain;
    };
  });

  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => { localStorage.removeItem('eq-note-manager-notes'); localStorage.removeItem('eq-note-folders'); });
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const b = document.getElementById('openNewNoteButton'); if (b) b.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(200);

  // ---- Test A: table with colored + uncolored cells -----------------------
  await page.evaluate(() => {
    document.getElementById('noteTitleInput').value = 'جدول Table 2026';
    const body = document.getElementById('noteBodyInput');
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'note-table-wrap';
    wrap.setAttribute('contenteditable', 'false');
    const table = document.createElement('table');
    table.className = 'note-table';
    const tbody = document.createElement('tbody');
    const data = [
      ['تفاح Apple', 'إجمالي Total 45.50$', 'ملاحظة Note @#$%123'],
      ['12 34 56', 'QR Code رمز', 'plain نص']
    ];
    const bgs = [null, '#7c3aed', '#ffd54f', null, '#1e293b', null];
    let k = 0;
    data.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((txt) => {
        const td = document.createElement('td');
        td.className = 'note-cell';
        td.setAttribute('contenteditable', 'true');
        td.textContent = txt;
        if (bgs[k]) td.style.backgroundColor = bgs[k];
        k++;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    body.appendChild(wrap);
    body.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  await page.evaluate(() => { const b = document.getElementById('exportNotePdfBtn'); if (b) b.click(); });
  try { await page.waitForFunction(() => (window.__captures || []).length > 0, { timeout: 12000 }); await sleep(400); } catch (e) {}


  const outA = await page.evaluate(() => {
    const html = window.__capturedHtml || '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tds = Array.from(doc.querySelectorAll('.eq-pdf-note-table td'));
    return {
      htmlLen: html.length,
      cells: tds.map((td) => {
        const st = td.getAttribute('style') || '';
        return { text: td.textContent, style: st,
          bg: (/background-color:\s*([^;]+);/.exec(st) || [])[1] || null,
          fg: (/[^-]color:\s*([^;]+);/.exec(st) || [])[1] || null };
      })
    };
  });
  function lum(hex) { const m = /^#([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null; const c = m[1]; return (0.299 * parseInt(c.slice(0, 2), 16) + 0.587 * parseInt(c.slice(2, 4), 16) + 0.114 * parseInt(c.slice(4, 6), 16)) / 255; }
  check('Test A: PDF HTML captured', outA.htmlLen > 200, 'len=' + outA.htmlLen);
  check('Test A: 6 body cells in PDF table', outA.cells.length === 6, JSON.stringify(outA.cells.map((c) => c.text)));
  if (outA.cells.length === 6) {
    const plain = outA.cells[0], dark = outA.cells[1], light = outA.cells[2], plain2 = outA.cells[3], dark2 = outA.cells[4];
    check('Test A: uncolored cell keeps text, no forced bg', !plain.bg && plain.text.indexOf('تفاح') !== -1 && plain.text.indexOf('Apple') !== -1, JSON.stringify(plain));
    check('Test A: dark bg kept', dark.bg === '#7c3aed', dark.style);
    check('Test A: dark bg text contrasts (white, readable)', dark.fg === '#ffffff', dark.fg);
    check('Test A: dark bg Arabic+numbers text preserved', dark.text.indexOf('إجمالي') !== -1 && dark.text.indexOf('45.50$') !== -1, dark.text);
    check('Test A: light bg kept', light.bg === '#ffd54f', light.style);
    check('Test A: light bg text contrasts (black, readable)', light.fg === '#000000', light.fg);
    check('Test A: light bg Arabic+symbols preserved', light.text.indexOf('ملاحظة') !== -1 && light.text.indexOf('@#$%123') !== -1, light.text);
    check('Test A: numbers cell preserved', plain2.text.indexOf('12 34 56') !== -1, JSON.stringify(plain2));
    check('Test A: second dark bg cell kept + contrast', dark2.bg === '#1e293b' && dark2.fg === '#ffffff' && dark2.text.indexOf('رمز') !== -1, JSON.stringify(dark2));
    const allOk = outA.cells.every((c) => { if (!c.bg) return true; const l = lum(c.bg); return l === null || (l > 0.6 ? c.fg === '#000000' : c.fg === '#ffffff'); });
    check('Test A: every colored cell = bg + readable text (no cover/clip layer)', allOk);
  }

  // ---- Test B: long note, final paragraph must survive --------------------
  await page.evaluate(() => {
    document.getElementById('noteTitleInput').value = 'Long Note 2026';
    const body = document.getElementById('noteBodyInput');
    body.innerHTML = '';
    for (let i = 1; i <= 45; i++) {
      const div = document.createElement('div');
      div.textContent = 'Paragraph ' + i + ' — نص عربي ' + i + ' symbols @#$%';
      body.appendChild(div);
    }
    const last = document.createElement('div');
    last.textContent = 'FINAL PARAGRAPH النهاية النهائية 9876543210';
    body.appendChild(last);
    body.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(400);
  await page.evaluate(() => { window.__captures = []; window.__capturedHtml = ''; });
  await page.evaluate(() => { const b = document.getElementById('exportNotePdfBtn'); if (b) b.click(); });
  try { await page.waitForFunction(() => { const h = window.__capturedHtml || ''; return h.length > 5000; }, { timeout: 15000 }); await sleep(400); } catch (e) {}

  const outB = await page.evaluate(() => {
    const html = window.__capturedHtml || '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = (doc.querySelector('.eq-note-body') || doc.body).textContent || '';
    const blocks = Array.from(doc.querySelectorAll('.eq-note-body > *'));
    const lastEl = blocks[blocks.length - 1];
    return {
      htmlLen: html.length,
      paras: (text.match(/Paragraph \d+/g) || []).length,
      hasFinal: text.indexOf('FINAL PARAGRAPH النهاية النهائية 9876543210') !== -1,
      lastIsFinal: !!(lastEl && lastEl.textContent.indexOf('FINAL PARAGRAPH') !== -1),
      lastText: lastEl ? lastEl.textContent.slice(-100) : null,
      hasFooter: !!doc.querySelector('.eq-note-footer'),
      hasCss: html.includes('page-break-inside')
    };
  });
  const STATIC_RULES = ['page-break-after:avoid', 'break-inside:avoid', 'page-break-inside:avoid', 'break-after:avoid', 'pagebreak:', "mode: ['css', 'legacy']"];
  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const rulesOk = STATIC_RULES.every((r) => appSrc.includes(r));
  check('Test B: multi-page CSS rules + pagebreak css/legacy present in template', rulesOk);

  check('Test B: PDF content captured (real report fragment, non-empty)', outB.htmlLen > 1000, 'len=' + outB.htmlLen);
  check('Test B: ALL 45 paragraphs present in PDF', outB.paras === 45, 'paras=' + outB.paras);
  check('Test B: final paragraph content present (Arabic+numbers)', !!outB.hasFinal, JSON.stringify(outB.lastText));
  check('Test B: final paragraph is the LAST content block', !!outB.lastIsFinal, JSON.stringify(outB.lastText));
  check('Test B: content order intact (footer after body)', !!outB.hasFooter);

  // Layout check: last block must not be clipped by the page — simulate the
  // A4 content box by mounting the captured HTML in an iframe (794px wide) and
  // measuring the last block's bottom vs the page-1 boundary math used by
  // html2pdf (margin 16pt -> 21.3px; A4 1123px tall).
  const layout = await page.evaluate(() => {
    return new Promise((resolve) => {
      const html = window.__capturedHtml || '';
      const frame = document.createElement('iframe');
      frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;';
      frame.onload = () => {
        try {
          const idoc = frame.contentDocument;
          idoc.open(); idoc.write(html); idoc.close();
          setTimeout(() => {
            const rep = idoc.getElementById('note-report');
            const body = idoc.querySelector('.eq-note-body');
            const blocks = body ? Array.from(body.children) : [];
            const lastEl = blocks[blocks.length - 1];
            const lr = lastEl ? lastEl.getBoundingClientRect() : null;
            const br = rep ? rep.getBoundingClientRect() : null;
            resolve({
              lastBottom: lr ? Math.round(lr.bottom) : null,
              bodyBottom: body ? Math.round(body.getBoundingClientRect().bottom) : null,
              reportHeight: br ? Math.round(br.height) : null,
              lastText: lastEl ? lastEl.textContent.slice(-60) : null,
              needsPage2: br ? br.height > (1123 - 2 * 21.3) : null
            });
            frame.remove();
          }, 300);
        } catch (e) { resolve({ err: String(e) }); frame.remove(); }
      };
      document.body.appendChild(frame);
    });
  });
  check('Test B: last content block lays out fully (inside report, not clipped)', !!(layout && layout.lastBottom > 0 && layout.lastBottom <= layout.bodyBottom && layout.lastText && layout.lastText.indexOf('9876543210') !== -1), JSON.stringify(layout));
  // Real rasterized page-count / edge-pagination of the FINAL PDF cannot be
  // verified headlessly (documented env: html2canvas needs a visible viewport).
  // The content + CSS + layout above prove the data survives in order; the
  // actual multi-page slicing is handled by jsPDF's pagebreak css/legacy.
  console.log('NOT VERIFIED — real rasterized multi-page pagination/clipping (html2canvas needs a visible viewport; headless env limitation).');

  const realErrors = pageErrors.filter((e) => !e.includes('attribute d') && !e.includes('404'));
  check('No JavaScript errors from the export path', realErrors.length === 0, realErrors.join(' ;; '));
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log('\n==== COLOR/LONG RUNTIME: ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total ====');
  process.exit(pass === results.length ? 0 : 1);
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  server.close();
}
