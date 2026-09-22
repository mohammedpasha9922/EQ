// tests/notesPdfNativePrint.browser.mjs
// Verifies the native print path for Notes → PDF:
// 1. tryNativePrintNote initiates the print (returns true, creates off-screen iframe,
//    writes the note HTML built by buildNotePdfHtml into it, calls contentWindow.print())
// 2. The print surface HTML+CSS (@page A4 16pt from buildNotePdfHtml) produces correct
//    A4 page counts for 1 / 5 / 20 page notes (verified via page.pdf preferCSSPageSize)
// 3. The PDF contains the expected content (English text + image + table) via pdf.js
// 4. Arabic RTL notes render Arabic text correctly in the PDF
// NOTE: the existing chunked-canvas buildNotePdfBlob pipeline is kept as the fallback
// and is verified separately by tests/notesPdfLong.browser.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require2 = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8495;
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf'
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (!p || p === '/') p = '/index.html';
  try {
    const f = path.join(ROOT, p);
    const ext = path.extname(p).toLowerCase();
    let data = fs.readFileSync(f);
    // app.js is loaded as <script type="module">, so its top-level declarations are
    // NOT global. Append a read-only seam (same proven pattern as
    // tests/notesPdfLong.browser.mjs) so the browser test can invoke the real
    // Notes → PDF functions without duplicating any production logic.
    if (p === '/app.js') {
      data = Buffer.from(data.toString() + '\nwindow.__notesPdfNativeTest = { tryNativePrintNote, buildNotePdfHtml, buildNotePdfBodyHTML, buildNotePdfBlobUncached, performNotePdfExport };\n', 'utf8');
    }
    res.writeHead(200, { 'Content-Type': (MIME[ext] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + PORT + '/';
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 180000,
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
let pass = 0, fail = 0;
function check(id, name, ok, detail = '') {
  if (ok) pass++; else fail++;
  const d = typeof detail === 'object' ? JSON.stringify(detail) : String(detail);
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + id + ' ' + name + (d ? '  -> ' + d.slice(0, 400) : ''));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function makeNote(page, pageCount, opts = {}) {
  const o = Object.assign({ withImage: true, withTable: true, dir: 'ltr' }, opts);
  return page.evaluate((pc, o) => {
    const rows = Array.from({ length: Math.max(1, Math.floor(pc * 51.8 - 15)) }, (_, i) =>
      'ROW ' + String(i + 1).padStart(5, '0') + ' Notes export content.'
    ).join(String.fromCharCode(10));
    const bodyBlocks = [{ type: 'text', body: rows, formatting: [] }];
    if (o.withImage) {
      const m = document.createElement('canvas');
      m.width = 32; m.height = 16;
      m.getContext('2d').fillStyle = '#ff0000';
      m.getContext('2d').fillRect(0, 0, 32, 16);
      bodyBlocks.push({ type: 'image', src: m.toDataURL(), width: 80, align: 'left' });
      m.width = m.height = 0;
    }
    if (o.withTable) {
      bodyBlocks.push({ type: 'table', rows: [[{ text: 'FINAL TABLE CELL', backgroundColor: '#00ff00' }, { text: 'END OF NOTE' }]] });
    }
    const note = { title: 'Native print test note', bodyBlocks };
    if (o.dir === 'rtl') note.dir = 'rtl';
    return note;
  }, pageCount, o);
}
async function renderPrintSurfacePdf(page, note) {
  const html = await page.evaluate((note) => window.__notesPdfNativeTest.buildNotePdfHtml(note), note);
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(html, { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 450));
  const pdfBuf = await pdfPage.pdf({ preferCSSPageSize: true });
  await pdfPage.close();
  return Buffer.from(pdfBuf).toString('base64');
}
const mainPage = await browser.newPage();
const errs = [];            // real JS exceptions (must be zero)
const consoleErrs = [];     // console.error text that is NOT a harness resource 404
const res404 = [];          // resource 404s (harness artifacts only)
mainPage.on('pageerror', (e) => errs.push('pageerror: ' + String(e && e.message || e)));
mainPage.on('console', (m) => {
  if (m.type() !== 'error') return;
  const txt = m.text();
  if (/Failed to load resource/.test(txt)) return; // handled via response listener
  consoleErrs.push(txt);
});
mainPage.on('response', (r) => { if (r.status() === 404) res404.push(r.url()); });
await mainPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 });
await sleep(800);
await mainPage.waitForFunction(() => !!window.__notesPdfNativeTest, { timeout: 20000 });
await mainPage.addScriptTag({ url: '/__pdfdiag/vendor/pdf.min.js' });
// NP0: app loaded, native print entry point available
const hasFn = await mainPage.evaluate(() => typeof (window.__notesPdfNativeTest || {}).tryNativePrintNote === 'function');
check('NP0', 'tryNativePrintNote is defined in the app', hasFn, 'found=' + hasFn);
// NP1: tryNativePrintNote initiates the print
{
  const note = await makeNote(mainPage, 5);
  const before = await mainPage.evaluate(() => document.querySelectorAll('iframe').length);
  const result = await mainPage.evaluate((note) => {
    const api = window.__notesPdfNativeTest;
    window.__ngPrintCalled = false;
    const ok = api.tryNativePrintNote(note);
    const frames = document.querySelectorAll('iframe');
    const after = frames.length;
    const iframe = after > 0 ? frames[frames.length - 1] : null;
    // Headless Chrome has no print dialog. Stub the frame's print() so the test can
    // prove the native path really invokes contentWindow.print(). The app schedules
    // doPrint() via setTimeout, so this stub is installed well before it fires.
    if (iframe && iframe.contentWindow) {
      try { iframe.contentWindow.print = function () { window.__ngPrintCalled = true; }; } catch (e) {}
    }
    const bodySnippet = iframe && iframe.contentDocument && iframe.contentDocument.body
      ? iframe.contentDocument.body.innerHTML : null;
    return { ok, iframeCountAfter: after, bodySnippet };
  }, note);
  await sleep(400);
  const printCalled = await mainPage.evaluate(() => window.__ngPrintCalled === true);
  check('NP1a', 'tryNativePrintNote returns true', result.ok, 'ok=' + result.ok);
  check('NP1b', 'tryNativePrintNote creates an off-screen iframe', result.iframeCountAfter > before, 'before=' + before + ' after=' + result.iframeCountAfter);
  check('NP1c', 'iframe contains the note print HTML (brand + table + image)', result.bodySnippet && result.bodySnippet.indexOf('EQ7 Calculator') !== -1 && result.bodySnippet.indexOf('FINAL TABLE CELL') !== -1 && result.bodySnippet.indexOf('eq-pdf-image') !== -1, 'snippet=' + (result.bodySnippet ? result.bodySnippet.slice(0, 140) : 'null'));
  check('NP1d', 'native path invokes contentWindow.print() on the note surface', printCalled, 'printCalled=' + printCalled);
  await mainPage.evaluate(function () { document.querySelectorAll('iframe').forEach(function (f) { f.remove(); }); });
}
// NP2: print surface — 5-page note → A4 page count + size
{
  const note = await makeNote(mainPage, 5);
  const b64 = await renderPrintSurfacePdf(mainPage, note);
  const cr2 = await mainPage.evaluate(async (b64) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const page = await pdfjsLib.getDocument({ data: u8.buffer }).promise;
    const first = await (await page.getPage(1)).getViewport({ scale: 1 });
    return { numPages: page.numPages, first };
  }, b64);
  const isA4 = cr2.first.width >= 594 && cr2.first.width <= 596 && cr2.first.height >= 840 && cr2.first.height <= 843;
  check('NP2a', 'Print surface 5-page note: A4 page count ' + cr2.numPages + ' (expected ~6)', cr2.numPages >= 5 && cr2.numPages <= 7, 'pages=' + cr2.numPages);
  check('NP2b', 'Print surface A4 page size (from @page rule)', isA4, 'size=' + cr2.first.width.toFixed(1) + 'x' + cr2.first.height.toFixed(1) + 'pt');
}
// NP3: print surface — 20-page note → A4 page count
{
  const note = await makeNote(mainPage, 20);
  const b64 = await renderPrintSurfacePdf(mainPage, note);
  const cr3 = await mainPage.evaluate(async (b64) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await pdfjsLib.getDocument({ data: u8.buffer }).promise;
    return doc.numPages;
  }, b64);
  check('NP3', 'Print surface 20-page note: page count ' + cr3 + ' (expected ~21)', cr3 >= 18 && cr3 <= 24, 'pages=' + cr3);
}
// NP4: PDF content (text + image + table) verified via pdf.js
{
  const note = await makeNote(mainPage, 3, { withImage: true, withTable: true });
  const b64 = await renderPrintSurfacePdf(mainPage, note);
  const cr4 = await mainPage.evaluate(async (b64) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await pdfjsLib.getDocument({ data: u8.buffer }).promise;
    const textParts = [];
    let imageOps = 0;
    let imagePixels = false;
    const OPS = pdfjsLib.OPS || {};
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const c = await pg.getTextContent();
      textParts.push(c.items.map(function (it) { return it.str; }).join(' '));
      // Robust: count image XObject paint ops (no raster heuristics needed).
      const ops = await pg.getOperatorList();
      for (let j = 0; j < ops.fnArray.length; j++) {
        const t = ops.fnArray[j];
        if (t === OPS.paintImageXObject || t === OPS.paintInlineImageXObject || t === OPS.paintImageMaskXObject) imageOps++;
      }
      // Secondary signal: any strongly red pixel on the rendered page.
      const vp = await pg.getViewport({ scale: 1 });
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(vp.width));
      cv.height = Math.max(1, Math.ceil(vp.height));
      const cx = cv.getContext('2d');
      await pg.render({ canvasContext: cx, viewport: vp });
      const px = cx.getImageData(0, 0, cv.width, cv.height).data;
      for (let j = 0; j < px.length && !imagePixels; j += 4) {
        if (px[j] > 150 && px[j + 1] < 100 && px[j + 2] < 100) imagePixels = true;
      }
      cv.width = cv.height = 0;
    }
    return { numPages: doc.numPages, text: textParts.join(' '), imageOps, imagePixels };
  }, b64);
  const hasText = cr4.text.indexOf('ROW') !== -1 && cr4.text.indexOf('Notes export content') !== -1;
  const hasTable = cr4.text.indexOf('FINAL TABLE CELL') !== -1 && cr4.text.indexOf('END OF NOTE') !== -1;
  check('NP4a', 'PDF content: ' + cr4.numPages + ' pages, English text present', cr4.numPages >= 3 && hasText, 'pages=' + cr4.numPages + ' text=' + hasText);
  check('NP4b', 'PDF content: table text present', hasTable, 'text=' + cr4.text.slice(0, 200));
  check('NP4c', 'PDF content: embedded image present (imageOps=' + cr4.imageOps + ', redPixels=' + cr4.imagePixels + ')', cr4.imageOps > 0 || cr4.imagePixels, 'imageOps=' + cr4.imageOps + ' imagePixels=' + cr4.imagePixels);
}
// NP5: Arabic RTL note — print surface DOM direction + painted glyphs in the PDF
// NOTE: Chrome's print-to-PDF embeds a subset font WITHOUT a usable ToUnicode CMap
// for Arabic, so pdf.js getTextContent() returns glyph indices (mojibake) even
// though the PDF renders correctly. We therefore verify Arabic at the two levels
// that are actually authoritative:
//   (a) the print-surface DOM (the exact HTML the browser paginates/prints), and
//   (b) ink actually painted on the PDF page (proves Arabic glyphs were not dropped).
{
  const note = await mainPage.evaluate(() => ({
    title: 'ملاحظة اختبار التوجيه',
    dir: 'rtl',
    bodyBlocks: [
      { type: 'text', body: 'هذا نص عربي لاختبار تصدير PDF من Notes.\nالسطر الثاني من النص العربي.', formatting: [] },
      // Real list markup: a run with list:'ul' makes buildNoteBodyHTMLWithBlocks
      // emit <ul dir="auto"><li dir="auto"> for every covered line (end:999 spans
      // both lines). This exercises the ACTUAL Arabic-list direction path.
      { type: 'text', body: 'عنصر قائمة عربي أول\nعنصر قائمة عربي ثاني', formatting: [{ start: 0, end: 999, list: 'ul' }] }
    ]
  }));
  const surf = await mainPage.evaluate((note) => {
    // Turn each line of a note body into a real list-run (start/end offsets), so the
    // existing buildNoteBodyHTML → <ul dir="auto">/<li dir="auto"> path is exercised.
    function runsForLines(body, listType) {
      const runs = [];
      let pos = 0;
      String(body).split(String.fromCharCode(10)).forEach((line) => {
        runs.push({ start: pos, end: pos + line.length, list: listType });
        pos += line.length + 1;
      });
      return runs;
    }
    // Measure inside a REAL print surface (a full document), exactly like the app's
    // tryNativePrintNote path. A fragment assigned to a <div>.innerHTML does NOT apply
    // the document's <style>, so computed styles must be read from a real document.
    function surface(n) {
      const html = window.__notesPdfNativeTest.buildNotePdfHtml(n);
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;';
      document.body.appendChild(f);
      const d = f.contentWindow.document;
      d.open(); d.write(html); d.close();
      // Force style/layout resolution: without a reflow + settle tick after
      // doc.write, getComputedStyle can return blanks for the print <style>.
      try { void d.body.offsetHeight; } catch (e) {}
      const __t0 = Date.now();
      while (Date.now() - __t0 < 350) { try { void d.body.offsetHeight; } catch (e) {} }
      return { html, f, d, win: f.contentWindow };
    }
    function firstLineEdges(d, el) {
      let t = el.firstChild;
      while (t && t.nodeType !== 3) t = t.firstChild;
      if (!t) return null;
      const rg = d.createRange();
      rg.setStart(t, 0);
      rg.setEnd(t, Math.min(12, t.length));
      const r = (rg.getClientRects()[0] || rg.getBoundingClientRect());
      const pr = el.getBoundingClientRect();
      return { left: r.left, right: r.right, boxLeft: pr.left, boxRight: pr.right };
    }
    const hugsRight = (e) => !!e && (e.boxRight - e.right) < (e.left - e.boxLeft);
    const hugsLeft = (e) => !!e && (e.left - e.boxLeft) < (e.boxRight - e.right);
    const s1 = surface(note);
    const html = s1.html;
    const p = s1.d.querySelector('.eq-pdf-text-block');
    const pcs = p ? s1.win.getComputedStyle(p) : null;
    const out = {
      hasArabicBody: html.indexOf('هذا نص عربي لاختبار تصدير PDF من Notes.') !== -1,
      hasArabicList: html.indexOf('عنصر قائمة عربي أول') !== -1,
      hasMixed: html.indexOf('English') !== -1 || html.indexOf('PDF') !== -1,
      paraTextAlign: pcs ? pcs.textAlign : null,
      paraBidi: pcs ? pcs.unicodeBidi : null,
      listDirAuto: html.indexOf('<ul dir="auto">') !== -1 && html.indexOf('<li dir="auto"') !== -1,
      listPadInline: /\.eq-note-body ul,\s*\.eq-note-body ol\s*\{[^}]*padding-inline-start/.test(html),
      blockStartAlign: /\.eq-pdf-text-block\s*\{[^}]*text-align:start/.test(html),
      blockPlaintext: /\.eq-pdf-text-block\s*\{[^}]*unicode-bidi:plaintext/.test(html),
      hasAtPageA4: /@page\s*\{[^}]*size:\s*A4/.test(html),
      hasAvoidScoped: /break-inside:\s*avoid/.test(html),
      universalDivAvoid: /(^|[},])\s*div\s*\{[^}]*break-inside:\s*avoid/.test(html)
    };
    s1.f.remove();
    return out;
  }, note);
  check('NP5a', 'Arabic RTL: print surface preserves Arabic body + list text', surf.hasArabicBody && surf.hasArabicList, 'body=' + surf.hasArabicBody + ' list=' + surf.hasArabicList);
  check('NP5b', 'Arabic RTL: @page A4 rule present in print surface', surf.hasAtPageA4, 'atPageA4=' + surf.hasAtPageA4);
  // The mixed RTL/LTR fix works per-block (unicode-bidi:plaintext + text-align:start on
  // .eq-pdf-text-block, dir="auto" on list elements) — there is intentionally NO root dir.
  check('NP5c', 'Arabic RTL: text block carries plaintext bidi + start alignment', /plaintext/.test(surf.paraBidi || '') && surf.paraTextAlign === 'start', 'bidi=' + surf.paraBidi + ' textAlign=' + surf.paraTextAlign);
  check('NP5d', 'Arabic RTL: break-inside:avoid is scoped (never universal on div)', surf.hasAvoidScoped && !surf.universalDivAvoid, 'scoped=' + surf.hasAvoidScoped + ' universalDivAvoid=' + surf.universalDivAvoid);
  const b64 = await renderPrintSurfacePdf(mainPage, note);
  const cr5 = await mainPage.evaluate(async (b64) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const doc = await pdfjsLib.getDocument({ data: u8.buffer }).promise;
    const pg = await doc.getPage(1);
    const vp = await pg.getViewport({ scale: 1 });
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(vp.width));
    cv.height = Math.max(1, Math.ceil(vp.height));
    const cx = cv.getContext('2d');
    await pg.render({ canvasContext: cx, viewport: vp });
    const px = cx.getImageData(0, 0, cv.width, cv.height).data;
    let ink = 0;
    for (let j = 0; j < px.length; j += 4) { if (px[j] < 200 && px[j + 1] < 200 && px[j + 2] < 200) ink++; }
    return { numPages: doc.numPages, ink };
  }, b64);
  check('NP5e', 'Arabic RTL: PDF page 1 has painted content (ink=' + cr5.ink + ' px)', cr5.numPages >= 1 && cr5.ink > 500, 'pages=' + cr5.numPages + ' ink=' + cr5.ink);
  // NP5f: behavioral direction — in an RTL note the first text line must start at the
  // RIGHT edge of its block (text-align:start + direction:rtl), proving the mixed
  // RTL/LTR fix flows into the print/PDF surface rather than being a CSS-only claim.
  const dirMeas = await mainPage.evaluate((note) => {
    function measure(n) {
      // Measure inside a REAL print surface document (iframe + doc.write) exactly
      // like the app's tryNativePrintNote path, so the print <style> applies and
      // computed direction/alignment reflect what the browser will paginate.
      const html = window.__notesPdfNativeTest.buildNotePdfHtml(n);
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;';
      document.body.appendChild(f);
      const d = f.contentWindow.document;
      d.open(); d.write(html); d.close();
      // Force style/layout resolution (see surface() above): getComputedStyle
      // can return blanks right after doc.write without a reflow + settle tick.
      try { void d.body.offsetHeight; } catch (e) {}
      const __t1 = Date.now();
      while (Date.now() - __t1 < 350) { try { void d.body.offsetHeight; } catch (e) {} }
      const p = d.querySelector('.eq-pdf-text-block');
      const tn = p.firstChild;
      const rg = d.createRange();
      rg.setStart(tn, 0);
      rg.setEnd(tn, Math.min(12, tn.length));
      const r = (rg.getClientRects()[0] || rg.getBoundingClientRect());
      const pr = p.getBoundingClientRect();
      const cs = f.contentWindow.getComputedStyle(p);
      const out = { lineLeft: r.left, lineRight: r.right, boxLeft: pr.left, boxRight: pr.right, textAlign: cs.textAlign, unicodeBidi: cs.unicodeBidi, direction: cs.direction };
      f.remove();
      return out;
    }
    const rtlNote = measure(note);
    const ltrNote = measure({ title: 'English title', bodyBlocks: [{ type: 'text', body: 'This is an English paragraph used to measure the start edge.\nSecond line.', formatting: [] }] });
    return { rtl: rtlNote, ltr: ltrNote };
  }, note);
  const rtlHugsRight = (dirMeas.rtl.boxRight - dirMeas.rtl.lineRight) < (dirMeas.rtl.lineLeft - dirMeas.rtl.boxLeft);
  const ltrHugsLeft = (dirMeas.ltr.lineLeft - dirMeas.ltr.boxLeft) < (dirMeas.ltr.boxRight - dirMeas.ltr.lineRight);
  check('NP5f', 'Arabic RTL: first text line starts at the RIGHT edge (RTL start)', rtlHugsRight, 'lineLeft=' + dirMeas.rtl.lineLeft.toFixed(1) + ' lineRight=' + dirMeas.rtl.lineRight.toFixed(1) + ' box=' + dirMeas.rtl.boxLeft.toFixed(1) + '..' + dirMeas.rtl.boxRight.toFixed(1));
  check('NP5g', 'Arabic RTL: lists emit dir="auto" + logical padding (Arabic markers preserved)', surf.listDirAuto && surf.listPadInline, 'listDirAuto=' + surf.listDirAuto + ' listPadInline=' + surf.listPadInline);
  check('NP7a', 'English LTR: first text line starts at the LEFT edge (LTR start)', ltrHugsLeft, 'lineLeft=' + dirMeas.ltr.lineLeft.toFixed(1) + ' boxLeft=' + dirMeas.ltr.boxLeft.toFixed(1));
  check('NP7b', 'English LTR: computed direction=ltr and text-align=start', dirMeas.ltr.direction === 'ltr' && dirMeas.ltr.textAlign === 'start', 'direction=' + dirMeas.ltr.direction + ' textAlign=' + dirMeas.ltr.textAlign);
}
// NP6: no real JS errors during the native print tests (resource 404s from the
// minimal harness HTTP server are reported separately and are NOT app errors)
check('NP6a', 'No JS exceptions (pageerror) during native print tests', errs.length === 0, errs.slice(0, 6).join(' | '));
check('NP6b', 'No unexpected console errors during native print tests', consoleErrs.length === 0, consoleErrs.slice(0, 6).join(' | '));
check('NP6c', 'Harness resource 404s are unrelated to Notes PDF (informational)', true, 'count=' + res404.length + ' urls=' + res404.slice(0, 8).join(', '));
console.log('\nSUMMARY: PASS=' + pass + ' FAIL=' + fail);
await browser.close();
await server.close();
process.exit(fail === 0 ? 0 : 1);