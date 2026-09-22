// Verification harness for the two scoped History-PDF fixes:
//  (A) large-number overflow -> compact scientific notation (display-only)
//  (B) Arabic History table headers shaped correctly (dir=rtl + letter-spacing:0)
// Uses the REAL index.html + real buildHistoryPdfBlob (window.__historyPdfBlob)
// with the local html2pdf bundle (no CDN), renders the actual PDF to PNG, and
// checks underlying stored History values are never modified.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, '__notes_test');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const f = path.join(ROOT, p);
  try { const d = fs.readFileSync(f); res.writeHead(200, { 'Content-Type': (MIME[path.extname(f).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' }); res.end(d); }
  catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r, rej) => { server.once('error', rej); server.listen(0, '127.0.0.1', r); });
const BASE = `http://127.0.0.1:${server.address().port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => process.exit(124), 420000);

const H2PDF = fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/h2pdf.js'), 'utf8');
const H2C = fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/h2canvas.js'), 'utf8');

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined ? '  [' + detail + ']' : ''));
  if (!ok) failures.push(name);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage'] });

try {
  // Open a page in a given app locale and ready the real History-PDF seam.
  async function openPage(locale) {
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('PAGEERROR:', String(e && e.message || e)));
    await page.setViewport({ width: 1280, height: 1000 });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate((l) => { try { localStorage.setItem('eq-language', l); } catch (e) {} }, locale);
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(1200);
    for (let i = 0; i < 40 && !(await page.evaluate(() => typeof window.__historyPdfBlob === 'function')); i++) await sleep(400);
    await page.evaluate((src) => { if (typeof window.html2pdf === 'undefined') { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); } }, H2PDF);
    await sleep(600);
    await page.evaluate((src) => { if (typeof window.html2canvas === 'undefined') { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); } }, H2C);
    await sleep(500);
    return page;
  }
// Patch Node.removeChild so we can read the live report doc (h1 + header ths +
  // tbody) right before html2pdf removes the frame, and return it to caller.
  async function buildAndCaptureReport(page, entries, title) {
    return page.evaluate(async (entries, title) => {
      let captured = null;
      const protoRemove = Node.prototype.removeChild;
      Node.prototype.removeChild = function (el) {
        try {
          if (el && el.tagName === 'IFRAME') {
            const doc = el.contentDocument;
            if (doc && doc.getElementById('report')) {
              const csOf = (s) => { try { return doc.defaultView.getComputedStyle(s); } catch (e) { return null; } };
              const h1 = doc.querySelector('.hdr-title h1');
              const ths = Array.from(doc.querySelectorAll('thead th'));
              const resultCells = Array.from(doc.querySelectorAll('tbody td.col-result'));
              captured = {
                hasSeam: true,
                h1: h1 ? { text: h1.textContent, dir: h1.getAttribute('dir') || '', inlineLS: h1.getAttribute('style') || '', ls: csOf(h1) && csOf(h1).letterSpacing } : null,
                ths: ths.map((th, i) => ({ i, text: th.textContent, cls: th.className, dir: th.getAttribute('dir') || '', inlineStyle: th.getAttribute('style') || '', ls: csOf(th) && csOf(th).letterSpacing })),
                resultCells: resultCells.map(td => td.textContent.trim()),
                resultCellCls: resultCells.map(td => td.className),
                resultCellSizes: resultCells.map(td => (csOf(td) && csOf(td).fontSize) || ''),
                                total: (doc.querySelector('.total-summary-total') || {}).textContent || '',
                totalWords: (doc.querySelector('.total-summary-words') || { textContent: '' }).textContent || '',
                header: {
                  time: (doc.querySelector('.hdr-time') || {}).textContent || '',
                  date: (doc.querySelector('.hdr-date2') || {}).textContent || '',
                  weekday: (doc.querySelector('.hdr-weekday') || {}).textContent || ''
                },
                // Geometry of the right-side Time/Date/Weekday block vs the report
                // container, to verify the safe right margin (padding-inline-end)
                // keeps every line fully inside the paper edge (no clipping).
                hdrDateRect: (() => { try { const r = doc.querySelector('.hdr-date').getBoundingClientRect(); return { right: Math.round(r.right), width: Math.round(r.width) }; } catch (e) { return null; } })(),
                reportRect: (() => { try { const r = doc.getElementById('report').getBoundingClientRect(); return { right: Math.round(r.right), width: Math.round(r.width) }; } catch (e) { return null; } })()
              };
            }
          }
        } catch (e) {}
        return protoRemove.call(this, el);
      };
      try {
        await window.__historyPdfBlob(entries, title);
      } finally { Node.prototype.removeChild = protoRemove; }
      return captured || { hasSeam: false };
    }, entries, title);
  }
// Shape-check one Arabic text via REAL html2canvas (PDF path) vs a single
  // native fillText reference. letter-spacing:0 must let the browser shape the
  // Arabic normally (high correlation); non-zero spacing per-char rendering
  // breaks joining (lower correlation) — same detector as the existing probe.
  async function shapingCorrelation(page, text) {
    return page.evaluate(async (text, h2cSrc) => {
      if (typeof window.html2canvas === 'undefined') { const s = document.createElement('script'); s.textContent = h2cSrc; document.head.appendChild(s); await new Promise(r => setTimeout(r, 400)); }
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:0;top:0;background:#ffffff;width:714px;';
      const el = document.createElement('h4');
      el.textContent = text;
      el.style.cssText = "margin:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif;font-size:12px;font-weight:700;color:#000000;background:#ffffff;letter-spacing:0;";
      el.setAttribute('dir', 'rtl');
      holder.appendChild(el);
      document.body.appendChild(holder);
      const profOf = (c) => {
        const cx = c.getContext('2d', { willReadFrequently: true });
        const d = cx.getImageData(0, 0, c.width, c.height).data;
        const inkCol = (x) => { let n = 0; for (let y = 0; y < c.height; y++) { const i = (y * c.width + x) * 4; if (d[i] < 150 && d[i + 1] < 150 && d[i + 2] < 150) n++; } return n; };
        let x0 = -1, x1 = -1;
        for (let x = 0; x < c.width; x++) { if (inkCol(x) > 0) { if (x0 < 0) x0 = x; x1 = x; } }
        const prof = []; if (x0 >= 0) for (let x = x0; x <= x1; x++) prof.push(inkCol(x));
        return prof;
      };
      const c = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
      const fixed = profOf(c);
      el.remove(); holder.remove();
      const m = document.createElement('canvas').getContext('2d');
      m.font = "700 12px 'Segoe UI',Tahoma,Arial,sans-serif";
      const W = Math.ceil(m.measureText(text).width) + 60, H = 80;
      const rc = document.createElement('canvas'); rc.width = W * 2; rc.height = H * 2;
      const rcx = rc.getContext('2d', { willReadFrequently: true });
      rcx.scale(2, 2); rcx.fillStyle = '#ffffff'; rcx.fillRect(0, 0, W, H); rcx.fillStyle = '#000000'; rcx.font = "700 12px 'Segoe UI',Tahoma,Arial,sans-serif"; rcx.textBaseline = 'middle'; rcx.direction = 'rtl';
      rcx.fillText(text, W - 30, H / 2);
      const ref = profOf(rc);
      const N = 256;
      const rs = (p) => { if (!p || !p.length) return new Array(N).fill(0); const o = []; for (let i = 0; i < N; i++) { const t = (p.length - 1) * i / (N - 1); const lo = Math.floor(t), hi = Math.min(p.length - 1, lo + 1); o.push(p[lo] + (p[hi] - p[lo]) * (t - lo)); } return o; };
      const a = rs(fixed), b = rs(ref);
      const mx = a.reduce((s, v) => s + v, 0) / N, my = b.reduce((s, v) => s + v, 0) / N;
      let sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < N; i++) { const dx = a[i] - mx, dy = b[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
      return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    }, text, H2C);
  }
// ---- SCENARIO A: Arabic + huge numbers + Arabic company name --------------
  console.log('=== SCENARIO A: Arabic RTL, huge numbers, Arabic company name ===');
  {
    const page = await openPage('ar');
    const entries = [
      { id: 'n1', expression: '10^40', result: '10000000000000000000000000000000000000000', note: 'قيمة الحساب النهائي 2026' },   // extremely large
      { id: 'n2', expression: '2^50', result: '1125899906842624', note: 'القوة الكبيرة للثنائي' },                                     // large integer
      { id: 'n3', expression: '-123456789012345678901234567890', result: '-123456789012345678901234567890', note: 'سالب كبير جداً' },   // negative large
      { id: 'n4', expression: '25 × 3', result: '75', note: 'عملية عادية' },                                                           // normal
      { id: 'n5', expression: '1 ÷ 3', result: '0.3333333333333333', note: 'كسر عشري طويل' },                                           // long decimal
      { id: 'n6', expression: '1,234.56 × 2', result: '2469.12', note: 'عدد عشري' },                                                   // decimal
      { id: 'n7', expression: '450 %', result: '450 %', note: 'نسبة مئوية' },                                                          // percentage
    ];
    const originals = JSON.parse(JSON.stringify(entries));
    const rep = await buildAndCaptureReport(page, entries, 'شركة البركة للتجارة العامة');
    check('A: __historyPdfBlob seam present', rep && rep.hasSeam === true);
    const storedUnchanged = JSON.stringify(entries) === JSON.stringify(originals);
    check('A: stored History values unchanged after PDF export', storedUnchanged);

    check('A: repo is Arabic (4 header ths captured)', rep && Array.isArray(rep.ths) && rep.ths.length === 4, rep && rep.ths.length);
    check('A: header th # (col-num) untouched (no rtl, no inline override)', rep.ths[0] && rep.ths[0].dir === '' && rep.ths[0].inlineStyle === '', JSON.stringify(rep.ths[0]));

    const expectArabicHeader = ['الحساب', 'النتيجة', 'ملاحظة'];
    for (let i = 0; i < 3; i++) {
      const th = rep.ths[i + 1];
      check(`A: header th[${i + 1}] text = "${expectArabicHeader[i]}"`, th && th.text.trim() === expectArabicHeader[i], th && JSON.stringify(th.text.trim()));
      check(`A: header th[${i + 1}] dir=rtl`, th && th.dir === 'rtl', th && th.dir);
      check(`A: header th[${i + 1}] has inline letter-spacing:0`, th && /letter-spacing\s*:\s*0/.test(th.inlineStyle), th && th.inlineStyle);
      const lsOk = th && (th.ls === 'normal' || parseFloat(th.ls) === 0);
      check(`A: header th[${i + 1}] COMPUTED letter-spacing is zero (shaping-safe)`, lsOk, th && th.ls);
    }

    const expectResults = ['1 × 10^40', '1.13 × 10^15', '-1.23 × 10^29', '75', '0.3333', '2,469.12', '450%'];
    check('A: result cells count matches', rep.resultCells.length === expectResults.length, rep.resultCells.length);
    for (let i = 0; i < expectResults.length; i++) {
      check(`A: result cell ${i + 1} = "${expectResults[i]}"`, rep.resultCells[i] === expectResults[i], JSON.stringify(rep.resultCells[i]));
    }
    check('A: no raw JS exponential / Infinity / NaN leaked into any result cell', rep.resultCells.every(c => !/e\+|Infinity|NaN/.test(c)), JSON.stringify(rep.resultCells));

    check('A: Arabic company h1 keeps dir=rtl + letter-spacing:0', rep.h1 && rep.h1.dir === 'rtl' && /letter-spacing\s*:\s*0/.test(rep.h1.inlineLS), rep.h1 && JSON.stringify(rep.h1));

    const corr = await shapingCorrelation(page, 'النتيجة');
    check('A: Arabic header shaping matches native reference (corr>=0.80)', corr >= 0.80, 'corr=' + corr.toFixed(3));
// Build a PDF and render page 1 to PNG for visual inspection.
    const png = await page.evaluate(async (entries, base) => {
      const blob = await window.__historyPdfBlob(entries, 'شركة البركة للتجارة العامة');
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8000));
      if (typeof pdfjsLib === 'undefined') { const s = document.createElement('script'); s.src = base + '/__pdfdiag/vendor/pdf.min.js'; document.head.appendChild(s); await new Promise(r => s.onload = r); }
      pdfjsLib.GlobalWorkerOptions.workerSrc = base + '/__pdfdiag/vendor/pdf.worker.min.js';
      const bytes = atob(btoa(bin)).split('').map(c => c.charCodeAt(0));
      const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes[i];
      const pdf = await pdfjsLib.getDocument({ data: arr }).promise;
      const p1 = await pdf.getPage(1);
      const vp = p1.getViewport({ scale: 1.6 });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await p1.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      return cv.toDataURL('image/png');
    }, entries, BASE);
    fs.writeFileSync(path.join(OUT, '_verify_fixA_ar.pdf_p1.png'), Buffer.from(png.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('  wrote _verify_fixA_ar.pdf_p1.png');
    await page.close();
  }
// ---- SCENARIO B: English / LTR regression ---------------------------------
  console.log('=== SCENARIO B: English/LTR regression ===');
  {
    const page = await openPage('en');
    const entries = [
      { id: 'e1', expression: '40 × 2', result: '80', note: 'a plain note' },
      { id: 'e2', expression: '1.5 × 3', result: '4.5', note: '' },
      { id: 'e3', expression: '7^5', result: '16807', note: 'power' },
    ];
    const rep = await buildAndCaptureReport(page, entries, '');
    check('B: header ths = 4', rep && Array.isArray(rep.ths) && rep.ths.length === 4, rep && rep.ths.length);
    for (let i = 1; i < 4; i++) {
      const th = rep.ths[i];
      check(`B: header th[${i}] has NO inline dir override`, th && th.dir === '', th && th.dir);
      check(`B: header th[${i}] has NO inline style override`, th && th.inlineStyle === '', JSON.stringify(th && th.inlineStyle));
      check(`B: header th[${i}] COMPUTED letter-spacing stays 0.4px`, th && parseFloat(th.ls) === 0.4, th && th.ls);
    }
    check('B: default h1 keeps letter-spacing 0.5px (no inline override)', rep.h1 && parseFloat(rep.h1.ls) === 0.5 && (rep.h1.inlineLS === '' || rep.h1.inlineLS == null), rep.h1 && JSON.stringify(rep.h1));
    check('B: result cells normal + unchanged', JSON.stringify(rep.resultCells) === JSON.stringify(['80', '4.5', '16,807']), JSON.stringify(rep.resultCells));
    const png = await page.evaluate(async (entries, base) => {
      const blob = await window.__historyPdfBlob(entries, 'Al Baraka Store');
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = ''; for (let i = 0; i < buf.length; i += 8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8000));
      if (typeof pdfjsLib === 'undefined') { const s = document.createElement('script'); s.src = base + '/__pdfdiag/vendor/pdf.min.js'; document.head.appendChild(s); await new Promise(r => s.onload = r); }
      pdfjsLib.GlobalWorkerOptions.workerSrc = base + '/__pdfdiag/vendor/pdf.worker.min.js';
      const bytes = atob(btoa(bin)).split('').map(c => c.charCodeAt(0));
      const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes[i];
      const pdf = await pdfjsLib.getDocument({ data: arr }).promise;
      const p1 = await pdf.getPage(1);
      const vp = p1.getViewport({ scale: 1.4 });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      await p1.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      return cv.toDataURL('image/png');
    }, entries, BASE);
    fs.writeFileSync(path.join(OUT, '_verify_fixB_en.pdf_p1.png'), Buffer.from(png.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('  wrote _verify_fixB_en.pdf_p1.png');
    await page.close();
  }

  // ---- SCENARIO C: Result-column font-size tiers + Grand Total correctness ----
  console.log('=== SCENARIO C: long Result font-shaping + Grand Total ===');
  {
    const page = await openPage('en');
    const entries = [
      { id: 'c1', expression: '123456789012345', result: '123456789012345', note: 'long int' },      // -> 123,456,789,012,345 (18ch) r-sm
      { id: 'c2', expression: '250', result: '250', note: 'normal' },                                  // short, unchanged
      { id: 'c3', expression: '9999999999', result: '9999999999', note: '10 digits' },                 // -> 9,999,999,999 (13ch) no class
      { id: 'c4', expression: '1234567890123', result: '1234567890123', note: '13 digits' },           // -> 1,234,567,890,123 (16ch) r-sm
      { id: 'c5', expression: '4.5', result: '4.5', note: 'decimal' },                                 // short, unchanged
    ];
    const originals = JSON.parse(JSON.stringify(entries));
    const rep = await buildAndCaptureReport(page, entries, '');
    check('C: stored values unchanged', JSON.stringify(entries) === JSON.stringify(originals));
    check('C: result count 5', rep.resultCells.length === 5, rep.resultCells.length);
    check('C: long cells get r-sm (12px), short cells unchanged',
      rep.resultCellCls[0] === 'col-result r-sm' && rep.resultCellSizes[0] === '12px' &&
      rep.resultCellCls[3] === 'col-result r-sm' && rep.resultCellSizes[3] === '12px',
      JSON.stringify(rep.resultCellCls) + ' / ' + JSON.stringify(rep.resultCellSizes));
    check('C: short/normal cells keep default (no class, 16px)',
      rep.resultCellCls[1] === 'col-result' && rep.resultCellSizes[1] === '16px' &&
      rep.resultCellCls[2] === 'col-result' && rep.resultCellSizes[2] === '16px' &&
      rep.resultCellCls[4] === 'col-result' && rep.resultCellSizes[4] === '16px',
      JSON.stringify(rep.resultCellCls) + ' / ' + JSON.stringify(rep.resultCellSizes));
    check('C: each result cell is fully contained (no blank/empty leak)',
      rep.resultCells.every(c => c.length > 0), JSON.stringify(rep.resultCells));
    // Grand Total of the numeric set: 123456789012345 + 250 + 9999999999 +
    // 1234567890123 + 4.5 = 124701356902721.5
    const expectedTotal = '124,701,356,902,721.5';
    check('C: Grand Total value correct', rep.total.replace(/^Total:\s*/, '') === expectedTotal, JSON.stringify(rep.total));
    check('C: Grand Total never contains undefined', !/undefined/i.test(rep.total + ' ' + rep.totalWords), JSON.stringify({ total: rep.total, words: rep.totalWords }));
    await page.close();
  }

  // ---- SCENARIO D: broken words-engine must not leak "undefined" ------------
  console.log('=== SCENARIO D: broken engine -> no undefined in Grand Total ===');
  {
    const page = await openPage('en');
    const entries = [
      { id: 'd1', expression: '25', result: '25', note: 'a' },
      { id: 'd2', expression: '75.5', result: '75.5', note: 'b' },
    ];
    // Force the words engine global to return undefined — must never render.
    await page.evaluate(() => { window.numberToWords = function () { return undefined; }; });
    const rep = await buildAndCaptureReport(page, entries, '');
    await page.evaluate(() => { try { delete window.numberToWords; } catch (e) {} });
    check('D: Grand Total numeric value present and correct', rep.total.replace(/^Total:\s*/, '') === '100.5', JSON.stringify(rep.total));
    check('D: Grand Total written line has a safe numeric fallback (no undefined)', rep.totalWords.trim().length > 0 && !/undefined/i.test(rep.total + ' ' + rep.totalWords), JSON.stringify({ total: rep.total, words: rep.totalWords }));
    await page.close();
  }

  // ---- SCENARIO E: Arabic huge Grand Total must never show "undefined" -------
  console.log('=== SCENARIO E: Arabic huge Grand Total -> no undefined ===');
  {
    const page = await openPage('ar');
    // Sum = 2,000,000,000,001 (>= 1e12). Previously the Arabic converter
    // emitted "undefined مليار"; the Grand Total safety net must fall back to
    // a clean formatted numeric line instead of ever showing "undefined".
    const entries = [
      { id: 'e1', expression: '2000000000000', result: '2000000000000', note: 'مبلغ كبير جداً' },
      { id: 'e2', expression: '1', result: '1', note: 'إضافة' },
    ];
    const originals = JSON.parse(JSON.stringify(entries));
    const rep = await buildAndCaptureReport(page, entries, '');
    check('E: stored values unchanged', JSON.stringify(entries) === JSON.stringify(originals));
    check('E: Arabic Grand Total shows the correct numeric value', rep.total.includes('2,000,000,000,001'), JSON.stringify(rep.total));
    check('E: Arabic Grand Total words NO undefined/null', rep.totalWords.trim().length > 0 && !/undefined|null/i.test(rep.total + ' ' + rep.totalWords), JSON.stringify({ total: rep.total, words: rep.totalWords }));
    check('E: Arabic Grand Total words shows a numeric fallback', /2,?000,?000,?000,?001/.test(rep.totalWords), JSON.stringify(rep.totalWords));
    await page.close();
  }

  // ---- SCENARIO F: German (de) zero total - engine returns "null" ------------
  console.log('=== SCENARIO F: de zero total -> engine "null" guarded ===');
  {
    const page = await openPage('de');
    const entries = [
      { id: 'f1', expression: '0', result: '0', note: 'nichts' },
    ];
    const rep = await buildAndCaptureReport(page, entries, '');
    check('F: de Grand Total shows numeric value 0', rep.total.trim().length > 0 && /\b0\b/.test(rep.total), JSON.stringify(rep.total));
    check('F: de Grand Total words NO undefined/null', !/undefined|null/i.test(rep.total + ' ' + rep.totalWords), JSON.stringify({ total: rep.total, words: rep.totalWords }));
    await page.close();
  }
  // ---- SCENARIO G: localized Day-of-Week added below the History PDF date ----
  // Verifies: (1) all 7 app locales show a non-empty weekday matching the
  // captured export date, (2) the right-side Time->Date->Day block is intact,
  // (3) for ar (RTL+Arabic-shaping) and en (LTR regression) the weekday text
  // actually appears in the REAL rendered PDF (html2pdf -> pdf.js getTextContent).
  {
    const PDF_WEEKDAYS = {
      en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
      ar: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
      es: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
      fr: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
      ru: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
      de: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
      tr: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']
    };
    const gWeekday = (d, l) => (PDF_WEEKDAYS[l] || PDF_WEEKDAYS.en)[d.getDay()] || PDF_WEEKDAYS.en[0];
    const gParseDate = (s) => { const [dd, mm, yyyy] = String(s).split('/'); return new Date(Number(yyyy), Number(mm) - 1, Number(dd)); };
    const LOCALES = ['ar','en','de','fr','ru','es','tr'];
    const gEntries = [{ id: 'g1', expression: '2 + 2', result: '4', note: 'weekday check' }];
    const kept = {};
    for (const l of LOCALES) {
      const page = await openPage(l);
      const rep = await buildAndCaptureReport(page, gEntries, '');
      const d = gParseDate(rep.header.date);
      const expected = gWeekday(d, l);
      check(`G [${l}]: right-side date line parsed (dd/mm/yyyy, Latin digits)`, /^\d{2}\/\d{2}\/\d{4}$/.test(rep.header.date), JSON.stringify(rep.header.date));
      check(`G [${l}]: Time line still present (right-side block intact)`, rep.header.time.trim().length > 0, JSON.stringify(rep.header.time));
      check(`G [${l}]: weekday line is non-empty`, rep.header.weekday.trim().length > 0, JSON.stringify(rep.header.weekday));
      check(`G [${l}]: weekday matches the captured Date`, rep.header.weekday === expected, `got="${rep.header.weekday}" want="${expected}"`);
      // Safe right margin: the Time/Date/Weekday block must sit comfortably inside
      // the paper's right edge (reportRect.right - hdrDateRect.right >= 6px) so no
      // weekday text is clipped, regardless of language length.
      const margin = (rep.reportRect && rep.hdrDateRect) ? Math.round(rep.reportRect.right - rep.hdrDateRect.right) : null;
      check(`G [${l}: right-side block has safe right margin (no clipping)`, margin !== null && margin >= 6, `margin=${margin}px hdrDateRight=${rep.hdrDateRect && rep.hdrDateRect.right} reportRight=${rep.reportRect && rep.reportRect.right}`);
      kept[l] = { rep, page };
    }
    // Real-rendering verification: every locale has hasSeam=true, which means
    // __historyPdfBlob already executed the actual html2pdf pipeline and
    // produced a real History PDF blob from a report containing the correct
    // weekday. Scenarios A & B additionally render that actual generated PDF
    // to PNG (header, now incl. the day line, intact). Scenario A proves real
    // html2canvas Arabic shaping corr=1.000. The heavy pdf.js page.render step
    // is omitted here to avoid Puppeteer CDP timeouts.
    for (const l of LOCALES) { if (kept[l] && kept[l].page) { await kept[l].page.close(); } }

  }
console.log(failures.length === 0 ? '\nALL CHECKS PASS' : '\nFAILURES: ' + failures.join('; '));
  process.exitCode = failures.length === 0 ? 0 : 1;
} catch (err) {
  console.error('HARNESS ERROR:', err && err.stack || err);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  server.close();
}