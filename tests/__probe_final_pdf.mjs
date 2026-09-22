// Decisive FINAL-PDF verifier for History → Export PDF.
// Calls the REAL window.__historyPdfBlob seam, then renders the actual PDF blob
// with pdf.js (existing vendor copy) at high resolution and checks the final
// output: page count, margin whiteness (no cropping/slicing at page breaks),
// content presence, and saves PNGs of every page for visual inspection.
// Runs twice: Arabic/RTL (rich Arabic content) + English/LTR regression.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUTDIR = path.join(ROOT, '__notes_test');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json' };
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
setTimeout(() => process.exit(124), 400000);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage', '--force-color-profile=srgb'] });
const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + detail + ']' : ''));
  if (!ok) failures.push(name);
}
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  async function genPdf(locale, customTitle) {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate((loc) => { try { localStorage.setItem('eq-language', loc); } catch (e) {} }, locale);
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await sleep(2500);
    for (let i = 0; i < 40 && !(await page.evaluate(() => typeof window.__historyPdfBlob === 'function')); i++) await sleep(500);
    const has = await page.evaluate(() => typeof window.__historyPdfBlob === 'function');
    if (!has) throw new Error('__historyPdfBlob seam unavailable');
    // Inject the LOCAL html2pdf bundle (no CDN) so builds are deterministic and
    // never hang on a flaky network fetch inside the export path.
    await page.evaluate((src) => { if (typeof window.html2pdf === 'undefined') { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); } }, fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/h2pdf.js'), 'utf8'));
    await sleep(700);
    const entries = [];
    const N = 26; // enough rows to force a multi-page PDF
    for (let i = 0; i < N; i++) {
      entries.push({
        expression: i % 3 === 0 ? `${120 + i} * 4` : `${250 + i} + 75`,
        result: String((120 + i) * 4),
        note: i === 0 ? 'فاتورة شهر أغسطس 2026 للمراجعة النهائية قبل الاعتماد والتسليم للعميل مع المرفقات كاملة 12345 و 67890'
            : i === 5 ? 'قيمة المشروع بالألف'
            : i === 12 ? 'رصيد المحفظة بعد العملية الأخيرة التي تمت يوم الخميس الموافق 27/08/2026 في الفرع الرئيسي رقم 9'
            : (i % 2 === 0 ? 'ملاحظة عربية رقم ' + (i + 1) : 'Note ' + (i + 1))
      });
    }
    const out = await page.evaluate(async (list, customTitle) => {
      // Capture the REAL report DOM at cleanup time (when the report iframe is
      // removed), so localized strings/dir can be asserted on the actual
      // pre-image — while the PDF itself is verified by rendering.
      let capturedHtml = null;
      const origRemove = document.body.removeChild.bind(document.body);
      document.body.removeChild = function (el) {
        try {
          if (el && el.tagName === 'IFRAME' && el.contentDocument && el.contentDocument.getElementById('report')) {
            capturedHtml = el.contentDocument.documentElement.outerHTML;
          }
        } catch (e) {}
        return origRemove(el);
      };
      try {
        const blob = await window.__historyPdfBlob(list, customTitle);
        const buf = await blob.arrayBuffer();
        let s = ''; const u = new Uint8Array(buf);
        for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
        return { b64: btoa(s), html: capturedHtml };
      } finally { document.body.removeChild = origRemove; }
    }, entries, customTitle);
    return { buf: Buffer.from(out.b64, 'base64'), html: out.html };
  }

  const rpage = await browser.newPage();
  const pdfjs = fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/pdf.min.js'), 'utf8');
  const worker = fs.readFileSync(path.join(ROOT, '__pdfdiag/vendor/pdf.worker.min.js'), 'utf8');
  await rpage.setContent('<html><body></body></html>');
  await rpage.addScriptTag({ content: pdfjs });
  const workerUrl = 'data:application/javascript;base64,' + Buffer.from(worker).toString('base64');
  await rpage.evaluate((wu) => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = wu; }, workerUrl);

  async function verifyPdf(tag, buf, expectMinPages) {
    fs.writeFileSync(path.join(OUTDIR, `_probe_final_${tag}.pdf`), buf);
    const b64 = buf.toString('base64');
    const res = await rpage.evaluate(async (b) => {
      const data = Uint8Array.from(atob(b), c => c.charCodeAt(0));
      const doc = await pdfjsLib.getDocument({ data }).promise;
      const pages = [];
      const checks = { pageCount: doc.numPages, marginWhite: true, contentInk: true, edgeSlice: false };
      for (let p = 1; p <= doc.numPages; p++) {
        const pg = await doc.getPage(p);
        const vp = pg.getViewport({ scale: 2 });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        const cx = c.getContext('2d', { willReadFrequently: true });
        await pg.render({ canvasContext: cx, viewport: vp }).promise;
        pages.push(c.toDataURL('image/png'));
        const d = cx.getImageData(0, 0, c.width, c.height).data;
        const W = c.width, H = c.height;
        const ink = (x, y) => { const i = (y * W + x) * 4; return d[i] < 120 && d[i + 1] < 120 && d[i + 2] < 120; };
        // Header physical-position check (page 1 only): in the top 12% band,
        // ink must exist in the LEFT quarter (logo), RIGHT quarter (date/time)
        // and CENTER third (title) — positions must not swap with RTL.
        if (p === 1) {
          let leftInk = false, rightInk = false, centerInk = false;
          const yMax = Math.floor(H * 0.12);
          for (let y = 0; y < yMax; y += 2) {
            for (let x = 0; x < W; x += 2) {
              const i2 = (y * W + x) * 4; const rr = d[i2], gg = d[i2 + 1], bb = d[i2 + 2];
              // EQ7 brand is teal #0891b2; the dark-ink threshold (all RGB<120)
              // misses it, so also detect teal so the left brand is still found.
              const isTeal = (rr < 90 && gg > 80 && bb > 120 && (bb - rr) > 70);
              const fx = x / W;
              if (fx < 0.25 && (ink(x, y) || isTeal)) leftInk = true;
              else if (fx > 0.75 && ink(x, y)) rightInk = true;
              else if (fx > 0.35 && fx < 0.65 && ink(x, y)) centerInk = true;
            }
          }
          checks.hdrLeft = leftInk; checks.hdrRight = rightInk; checks.hdrCenter = centerInk;
        }
        let mw = true;
        for (let y = 0; y < H && mw; y++) for (let x = 0; x < 8; x++) if (ink(x, y) || ink(W - 1 - x, y)) { mw = false; break; }
        for (let x = 0; x < W && mw; x++) for (let y = 0; y < 8; y++) if (ink(x, y) || ink(x, H - 1 - y)) { mw = false; break; }
        if (!mw) checks.marginWhite = false;
        let cnt = 0;
        for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (ink(x, y)) cnt++;
        if (cnt < 50) checks.contentInk = false;
        for (let y = H - 12; y > H - 34; y--) {
          let run = 0, maxRun = 0;
          for (let x = 0; x < W; x++) { if (ink(x, y)) { run++; if (run > maxRun) maxRun = run; } else run = 0; }
          if (maxRun > 60) { checks.edgeSlice = true; break; }
        }
      }
      return { checks, pages };
    }, b64);
    for (let i = 0; i < res.pages.length; i++) {
      fs.writeFileSync(path.join(OUTDIR, `_probe_final_${tag}_p${i + 1}.png`), Buffer.from(res.pages[i].split(',')[1], 'base64'));
    }
    check(`${tag}: PDF generated and parses (${res.checks.pageCount} pages, expect >= ${expectMinPages})`, res.checks.pageCount >= expectMinPages);
    check(`${tag}: page margins clean (no ink within 8px of any edge)`, res.checks.marginWhite);
    check(`${tag}: content rendered on every page`, res.checks.contentInk);
    check(`${tag}: no text sliced mid-glyph at page-break bottom edge`, !res.checks.edgeSlice);
    check(`${tag}: header logo ink on PHYSICAL LEFT`, res.checks.hdrLeft === true);
    check(`${tag}: header title ink CENTERED`, res.checks.hdrCenter === true);
    check(`${tag}: header date ink on PHYSICAL RIGHT`, res.checks.hdrRight === true);
  }

  // All languages actually supported by the app (index.html languageSelect +
  // translations object): ar, en, es, fr, ru, de, tr. Arabic -> RTL, rest LTR.
  const EXPECT = {
    ar: { dir: 'rtl', subtitle: 'سجل الحسابات', colCalc: 'الحساب', colResult: 'النتيجة', colNote: 'ملاحظة', footer: 'EQ7 — حاسبة ذكية للحسابات، تحويل العملات، الأدوات المالية، السجل، وتقارير PDF الاحترافية.' },
    en: { dir: 'ltr', subtitle: 'Calculation History', colCalc: 'Calculation', colResult: 'Result', colNote: 'Note', footer: 'EQ7 — Smart calculations, currency conversion, financial tools, history, and professional PDF reports.' },
    es: { dir: 'ltr', subtitle: 'Historial de cálculos', colCalc: 'Cálculo', colResult: 'Resultado', colNote: 'Nota', footer: 'EQ7 — Cálculos inteligentes, conversión de divisas, herramientas financieras, historial e informes PDF profesionales.' },
    fr: { dir: 'ltr', subtitle: 'Historique des calculs', colCalc: 'Calcul', colResult: 'Résultat', colNote: 'Note', footer: 'EQ7 — Calculs intelligents, conversion de devises, outils financiers, historique et rapports PDF professionnels.' },
    ru: { dir: 'ltr', subtitle: 'История вычислений', colCalc: 'Вычисление', colResult: 'Результат', colNote: 'Заметка', footer: 'EQ7 — Умные вычисления, конвертация валют, финансовые инструменты, история и профессиональные PDF-отчёты.' },
    de: { dir: 'ltr', subtitle: 'Berechnungsverlauf', colCalc: 'Berechnung', colResult: 'Ergebnis', colNote: 'Notiz', footer: 'EQ7 — Intelligente Berechnungen, Währungsumrechnung, Finanzwerkzeuge, Verlauf und professionelle PDF-Berichte.' },
    tr: { dir: 'ltr', subtitle: 'Hesap Geçmişi', colCalc: 'Hesaplama', colResult: 'Sonuç', colNote: 'Not', footer: 'EQ7 — Akıllı hesaplamalar, döviz dönüşümü, finans araçları, geçmiş ve profesyonel PDF raporları.' }
  };

  for (const [loc, exp] of Object.entries(EXPECT)) {
    const only = process.argv[2];
    if (only && !only.split(',').includes(loc)) continue;
    console.log('--- ' + loc + ' / ' + exp.dir.toUpperCase() + ' (real exported PDF) ---');
    const { buf, html } = await genPdf(loc);
    await verifyPdf(loc, buf, 2);
    // Pre-image assertions on the REAL generated report HTML (the PDF is an
    // image-based export, so strings live in the pre-image; rendering itself is
    // verified by the pdf.js raster checks + saved PNGs above).
    if (!html) { check(loc + ': report HTML captured', false); continue; }
    check(loc + ': <html lang/dir> correct', html.includes('lang="' + loc + '"') && html.includes('dir="' + exp.dir + '"'));
    check(loc + ': report root dir=' + exp.dir, html.includes('<div class="report" id="report" dir="' + exp.dir + '">'));
    check(loc + ': localized subtitle', html.includes(exp.subtitle));
    check(loc + ': localized column headers', html.includes('>' + exp.colCalc + '</th>') && html.includes('>' + exp.colResult + '</th>') && html.includes('>' + exp.colNote + '</th>'));
    check(loc + ': localized EQ7 footer line present exactly once', html.split(exp.footer).length - 1 === 1 && html.split('EQ7').length - 1 >= 2); // header img alt + footer
    check(loc + ': old footer phrases removed', !html.includes('Created with EQ Calculator') && !html.includes('Smart calculations. Simple results.') && !html.includes('footer-tagline') && !html.includes('footer-desc'));
    check(loc + ': footer line dir=' + exp.dir, html.includes('<div class="footer-brand"' + (exp.dir === 'rtl' ? ' dir="rtl"' : '') + '>EQ7 — '));
    // Header structure: EQ7 logo once (data URL img), physically-first child
    // (left), forced-ltr header, date last (right).
    check(loc + ': EQ7 brand text present exactly once', (html.match(/<span class="hdr-brand">EQ7<\/span>/g) || []).length === 1);
    check(loc + ': no image embedded for EQ7 header branding', !html.includes('data:image/png;base64,'));
    check(loc + ': header forced to physical ltr layout', /\.report-header \{ display: flex;/.test(html) && html.includes('direction: ltr;'));
    check(loc + ': logo left, title center, date right (DOM order)', /<div class="hdr-logo">[\s\S]*?<div class="hdr-title"[^>]*>[\s\S]*?<div class="hdr-date"/.test(html));
  }

  // ---- Optional custom report title (tested once, in English) ---------------
  console.log('--- en / custom report title ---');
  {
    const entries = [];
    for (let i = 0; i < 4; i++) entries.push({ expression: `${120 + i} * 4`, result: String((120 + i) * 4), note: 'Note ' + (i + 1) });
    const { buf, html } = await genPdf('en', 'Al Baraka Wholesale Store');
    await verifyPdf('en-custom', buf, 1);
    check('custom: custom title used in PDF pre-image', html.includes('<h1>Al Baraka Wholesale Store</h1>'));
    check('custom: default title replaced (no EQ7 Calculator h1)', !html.includes('<h1>EQ7 Calculator</h1>'));
    const { html: defHtml } = await genPdf('en');
    check('custom: default title NOT permanently changed', defHtml.includes('<h1>EQ7 Calculator</h1>'));
  }

  // ---- Arabic company name shaping/bidi + two-line date/time -----------------
  console.log('--- en + Arabic company name / date-time layout ---');
  {
    const AR_NAME = 'شركة البركة للتجارة العامة';
    const entries = [];
    for (let i = 0; i < 4; i++) entries.push({ expression: `${30 + i} * 5`, result: String((30 + i) * 5), note: 'Note ' + (i + 1) });
    // Arabic name entered while the APP is English/LTR — the exact case where
    // the title previously inherited the LTR header direction and broke.
    const { buf, html } = await genPdf('en', AR_NAME);
    await verifyPdf('en-arname', buf, 1);
    check('arname: h1 carries dir=rtl from its own Arabic content', html.includes('<h1 dir="rtl" style="letter-spacing:0">' + AR_NAME + '</h1>'));
    check('arname: Arabic name present unescaped-corrupt-free', html.includes(AR_NAME));
    check('arname: no standalone h1 without dir for this title', !html.includes('<h1>' + AR_NAME));
    // Same Arabic name while the APP is Arabic/RTL (wrapper already rtl).
    const { buf: buf2, html: html2 } = await genPdf('ar', AR_NAME);
    await verifyPdf('ar-arname', buf2, 1);
    check('arname(ar): h1 dir=rtl', html2.includes('<h1 dir="rtl" style="letter-spacing:0">' + AR_NAME + '</h1>'));
    // Date/time layout: time on top, date underneath, no separator.
    const { html: dtHtml } = await genPdf('en');
    check('dt: time element present', /<div class="hdr-time">\d{1,2}:\d{2} (AM|PM)<\/div>/.test(dtHtml));
    check('dt: date element present underneath', /<div class="hdr-date2">\d{2}\/\d{2}\/\d{4}<\/div>/.test(dtHtml));
    check('dt: time comes before date in DOM', dtHtml.indexOf('hdr-time') !== -1 && dtHtml.indexOf('hdr-time') < dtHtml.indexOf('hdr-date2'));
    check('dt: no __ separator anywhere', !dtHtml.includes('__'));
    check('dt: single-line combined timestamp gone', !dtHtml.includes('toLocaleString') && !/<div class="hdr-date"[^>]*>[^<]*\d{1,2}:\d{2}[^<]*\d{2}\/\d{2}/.test(dtHtml));
  }

  console.log(failures.length === 0 ? 'ALL PASS: final exported PDFs verified (all 7 app languages)' : 'FAILURES: ' + failures.join('; '));
  process.exitCode = failures.length === 0 ? 0 : 1;
} catch (e) {
  console.log('ERROR: ' + (e && e.stack || e));
  process.exitCode = 2;
} finally {
  await browser.close().catch(() => {});
  server.close();
}
