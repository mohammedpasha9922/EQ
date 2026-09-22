// VERIFICATION-ONLY scratch probe (no app source changes).
// Verifies: editor content + computed direction/attach, save->close->reopen round trip,
// and mixed AR/EN Notes->PDF output via pdf.js text positions.
// Run: node __notes_test/_mixdir_verify.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(HERE, '_mixdir_verify_out');
fs.mkdirSync(OUT, { recursive: true });
const LOG = path.join(OUT, 'verify.log');
try { fs.unlinkSync(LOG); } catch (e) {}
const log = (s) => { fs.appendFileSync(LOG, s + '\n'); console.log(s); };

const LINES = [
  { t: 'فقرة عربية فقط', list: null },
  { t: 'English paragraph only', list: null },
  { t: 'مرحبا hello world 123', list: null },
  { t: 'Hello مرحبا world', list: null },
  { t: 'بند عربي واحد', list: 'ul' },
  { t: 'بند عربي اثنان', list: 'ul' },
  { t: 'فاصل نصي', list: null },
  { t: 'English bullet one', list: 'ul' },
  { t: 'English bullet two', list: 'ul' },
  { t: 'فاصل', list: null },
  { t: 'بند مختلط mixed', list: 'ul' },
  { t: 'mixed بند English first', list: 'ul' },
  { t: 'فاصل ثانٍ', list: null },
  { t: 'العنصر الأول', list: 'ol' },
  { t: 'Second numbered item', list: 'ol' },
  { t: 'مرحبا hello numbered', list: 'ol' }
];
function buildNote(title) {
  let body = '', pos = 0; const formatting = [];
  LINES.forEach((l, i) => {
    if (i) { body += '\n'; pos += 1; }
    const s = pos; body += l.t; pos += l.t.length;
    if (l.list) formatting.push({ start: s, end: pos, list: l.list });
  });
  return { id: 'n-mixed', title, body, bodyFormatting: formatting, folderId: 'personal', createdAt: Date.now() - 3600e3, updatedAt: Date.now() - 3600e3 };
}
const FOLDERS = [{ id: 'personal', name: 'Personal', createdAt: Date.now() }];

const bundle = await (await fetch('https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js')).text();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  try {
    let data;
    if (p === '/real-pdf.js') data = bundle;
    else if (p.startsWith('/baseline/')) {
      const sub = p.slice('/baseline/'.length) || 'index.html';
      if (sub === 'index.html') data = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/(<div id="noteBodyInput"[^>]*?)\s*dir="auto"/, '$1');
      else if (sub === 'app.js') {
        const source = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
        const start = source.indexOf('async function buildNotePdfBlobUncached(note)');
        const end = source.indexOf('// Build a safe, readable .pdf filename', start);
        let legacy = source.slice(start, end).replace('buildNotePdfBlobUncached(note)', 'buildNotePdfLegacyTest(note)');
        const chunkStart = legacy.indexOf('      renderWorker.toContainer()');
        const chunkEnd = legacy.indexOf('        .then((blob)', chunkStart);
        if (chunkStart !== -1) legacy = legacy.slice(0, chunkStart) + "      renderWorker.toPdf().output('blob')\n" + legacy.slice(chunkEnd);
        data = (source + '\n' + legacy + '\nwindow.__notesPdfTest = { buildNotePdfBlobUncached, buildNotePdfHtml, buildNotePdfLegacyTest };').replace(/<(ul|ol|li) dir="auto">/g, '<$1>');
      } else data = fs.readFileSync(path.join(ROOT, sub));
    }
    else if (p === '/app.js') {
      const source = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
      data = source + '\nwindow.__notesPdfTest = { buildNotePdfBlobUncached, buildNotePdfHtml };';
    }
    else data = fs.readFileSync(path.join(ROOT, p));
    res.writeHead(200, { 'Content-Type': (MIME[path.extname(p).toLowerCase()] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MEASURE_FN = function () {
  const ed = document.getElementById('noteBodyInput');
  if (!ed) return { error: 'no editor' };
  const rr = r => ({ l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) });
  const cs = el => { const c = getComputedStyle(el); return { dir: c.direction, align: c.textAlign, bidi: c.unicodeBidi, pl: c.paddingLeft, pr: c.paddingRight }; };
  const out = { editor: { ...rr(ed.getBoundingClientRect()), ...cs(ed), dirAttr: ed.getAttribute('dir') }, inline: [], items: [] };
  let seg = [];
  const flush = () => {
    if (seg.length) {
      const rg = document.createRange(); rg.setStartBefore(seg[0]); rg.setEndAfter(seg[seg.length - 1]);
      const rects = Array.from(rg.getClientRects()).filter(x => x.width > 0);
      if (rects.length) out.inline.push(rr(rg.getBoundingClientRect()));
    }
    seg = [];
  };
  for (const child of Array.from(ed.childNodes)) {
    if (child.nodeName === 'BR') { flush(); continue; }
    if (child.nodeType === 3) { seg.push(child); continue; }
    if (child.nodeType === 1) {
      flush();
      if (child.tagName === 'UL' || child.tagName === 'OL') {
        for (const li of Array.from(child.children)) {
          const box = rr(li.getBoundingClientRect());
          const rg = document.createRange(); rg.selectNodeContents(li);
          const rects = Array.from(rg.getClientRects()).filter(x => x.width > 0);
          const ink = rects.length ? rr(rg.getBoundingClientRect()) : null;
          out.items.push({ ul: child.tagName, ...cs(child), box, ink, ...cs(li), dirAttr: li.getAttribute('dir'), text: (li.textContent || '').slice(0, 30) });
        }
      } else { out.inline.push({ kind: child.tagName, ...rr(child.getBoundingClientRect()) }); }
    }
  }
  flush();
  out.editorScroll = { sw: ed.scrollWidth, cw: ed.clientWidth, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  out.text = ed.textContent;
  return out;
};
const sideOf = (ink, l, r) => (!ink) ? 'unknown' : (ink.l - l <= 14 ? 'left' : (r - ink.r <= 14 ? 'right' : 'center'));

const openMixedNote = async (page) => {
  await page.evaluate(() => document.querySelector('.drawer-menu-item[data-action="open-notes"]').click());
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 15000 });
  await sleep(250);
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('#notesList .note-item'))
      .find(li => (li.querySelector('.note-item-title')?.textContent.trim() || '') === 'Mixed Direction Note');
    if (card) card.click();
  });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 15000 });
  await sleep(600);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'], protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await page.evaluate((kf, f, kn, n) => {
    localStorage.setItem(kf, JSON.stringify(f));
    localStorage.setItem(kn, JSON.stringify([n]));
  }, 'eq-note-folders', FOLDERS, 'eq-note-manager-notes', buildNote('Mixed Direction Note'));
  await page.reload({ waitUntil: 'load' });
  await sleep(1200);
  await openMixedNote(page);

  const before = await page.evaluate(MEASURE_FN);
  const map = m => m.items.map(it => ({ text: it.text, dir: it.dir, side: sideOf(it.ink, it.box.l, it.box.r), attach: (it.dir === 'rtl' ? (it.box.r - it.ink.r) : (it.ink.l - it.box.l)) <= 14 ? 'yes' : 'no' }));
  const beforeItems = map(before);
  log('BEFORE edDir=' + before.editor.dir + '/' + before.editor.dirAttr + ' bidi=' + before.editor.bidi + ' align=' + before.editor.align + ' ovf=' + before.editorScroll.docOverflow + ' edScroll=' + (before.editorScroll.sw - before.editorScroll.cw) + ' items=' + beforeItems.length);
  beforeItems.forEach(it => log('  li dir=' + it.dir + ' side=' + it.side + ' attach=' + it.attach + ' :: ' + it.text));

  // --- SAVE + CLOSE + REOPEN ---
  await page.evaluate(() => { const b = document.querySelector('.notes-save-btn'); if (b) b.click(); });
  await sleep(900);
  await page.evaluate(() => { const b = document.querySelector('.notes-back-btn'); if (b) b.click(); });
  await sleep(700);
  const stored = await page.evaluate(() => {
    const notes = JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]');
    const n = notes.find(n => n.title === 'Mixed Direction Note');
    return n ? { bodyLen: (n.body || '').length, fmt: (n.bodyFormatting || []).length } : null;
  });
  log('STORED after save: ' + JSON.stringify(stored));
  await openMixedNote(page);
  // Dump actual DOM structure after reopen: top-level children + first UL snippet
  const domDump = await page.evaluate(() => {
    const ed = document.getElementById('noteBodyInput');
    const tops = Array.from(ed.childNodes).map(n => n.nodeType === 3 ? '#text:' + (n.textContent || '').slice(0, 20) : n.nodeName + (n.className ? '.' + String(n.className).split(' ')[0] : '') + (n.getAttribute && n.getAttribute('dir') ? '[dir=' + n.getAttribute('dir') + ']' : ''));
    const ul = ed.querySelector('ul');
    return { tops: tops.slice(0, 14), ulHTML: ul ? ul.outerHTML.slice(0, 300) : null };
  });
  log('DOM after reopen tops=' + JSON.stringify(domDump.tops));
  log('DOM after reopen UL=' + domDump.ulHTML);
  const after = await page.evaluate(MEASURE_FN);

  const afterItems = map(after);
  log('AFTER reopen sameText=' + (after.text.trim() === before.text.trim()) + ' sameDirMap=' + (JSON.stringify(beforeItems) === JSON.stringify(afterItems)) + ' edDir=' + after.editor.dir + '/' + after.editor.dirAttr + ' ovf=' + after.editorScroll.docOverflow);
  afterItems.forEach(it => log('  li dir=' + it.dir + ' side=' + it.side + ' attach=' + it.attach + ' :: ' + it.text));

  // --- PDF: build the mixed-note PDF, verify text-item x positions with pdf.js ---
  await page.addScriptTag({ url: '/real-pdf.js' });
  await page.addScriptTag({ url: '/__pdfdiag/vendor/pdf.min.js' });
  await page.waitForFunction(() => window.__notesPdfTest);
  const pdfCheck = await page.evaluate(async () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    const notes = JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]');
    const note = notes.find(n => n.title === 'Mixed Direction Note');
    const RealDate = Date;
    window.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : ['2026-09-18T12:00:00Z'])); } static now() { return RealDate.now(); } };
    try {
      const blob = await window.__notesPdfTest.buildNotePdfBlobUncached(note);
      const buf = await blob.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      const pages = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const pg = await pdf.getPage(p);
        const vp = pg.getViewport({ scale: 1 });
        const tc = await pg.getTextContent();
        pages.push({ w: Math.round(vp.width), h: Math.round(vp.height), items: tc.items.filter(it => it.str.trim()).map(it => ({ s: it.str.slice(0, 24), x: Math.round(it.transform[4]), w: Math.round(it.width), y: Math.round(it.transform[5]) })) });
        pg.cleanup();
      }
      await pdf.destroy();
      return { pages, bytes: blob.size };
    } catch (e) { return { error: e.message }; }
    finally { window.Date = RealDate; }
  });
  if (pdfCheck.error) log('PDF FAIL: ' + pdfCheck.error);
  else {
    const pg = pdfCheck.pages[0];
    log('PDF bytes=' + pdfCheck.bytes + ' pages=' + pdfCheck.pages.length + ' pageW=' + pg.w);
    for (const it of pg.items) {
      const side = it.x > pg.w / 2 ? 'right' : (it.x + it.w < pg.w / 2 ? 'left' : 'center');
      log('  item x=' + it.x + ' w=' + it.w + ' y=' + it.y + ' side=' + side + ' :: ' + it.s);
    }
  }
  // --- PDF HTML DOM verification: mount real buildNotePdfHtml output and measure ---
  const pdfHtml = await page.evaluate(() => {
    const notes = JSON.parse(localStorage.getItem('eq-note-manager-notes') || '[]');
    const note = notes.find(n => n.title === 'Mixed Direction Note');
    return window.__notesPdfTest.buildNotePdfHtml(note);
  });
  fs.writeFileSync(path.join(OUT, 'pdf.html'), pdfHtml);
  const hasRules = /padding-inline-start:\s*24px/.test(pdfHtml) && /unicode-bidi:\s*plaintext/.test(pdfHtml) && /dir="auto"/.test(pdfHtml);
  log('PDF HTML rules: padding-inline-start=24px ' + /padding-inline-start:\s*24px/.test(pdfHtml) + ', unicode-bidi=plaintext ' + /unicode-bidi:\s*plaintext/.test(pdfHtml) + ', dir=auto ' + /dir="auto"/.test(pdfHtml));
  const p2 = await browser.newPage();
  const p2errs = [];
  p2.on('pageerror', e => p2errs.push(e.message));
  await p2.setViewport({ width: 800, height: 1200 });
  await p2.goto(`http://127.0.0.1:${server.address().port}/__notes_test/_mixdir_verify_out/pdf.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(700);
  const pdfDom = await p2.evaluate(() => {
    const rr = r => ({ l: Math.round(r.left), r: Math.round(r.right) });
    const res = { lists: [], items: [] };
    document.querySelectorAll('.eq-note-body ul, .eq-note-body ol').forEach(ul => {
      const c = getComputedStyle(ul);
      res.lists.push({ tag: ul.tagName, dir: c.direction, pis: c.paddingLeft, pie: c.paddingRight });
    });
    document.querySelectorAll('.eq-note-body li').forEach(li => {
      const c = getComputedStyle(li);
      const box = rr(li.getBoundingClientRect());
      const rg = document.createRange(); rg.selectNodeContents(li);
      const rects = Array.from(rg.getClientRects()).filter(x => x.width > 0);
      const ink = rects.length ? rr(rg.getBoundingClientRect()) : null;
      res.items.push({ dir: c.direction, align: c.textAlign, bidi: c.unicodeBidi, box, ink, text: (li.textContent || '').slice(0, 30) });
    });
    res.docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return res;
  });
  log('PDF DOM: docOverflow=' + pdfDom.docOverflow + ' lists=' + JSON.stringify(pdfDom.lists));
  pdfDom.items.forEach(it => {
    const side = !it.ink ? 'none' : (it.ink.l - it.box.l <= 14 ? 'left' : (it.box.r - it.ink.r <= 14 ? 'right' : 'center'));
    log('  PDF li dir=' + it.dir + ' align=' + it.align + ' bidi=' + it.bidi + ' side=' + side + ' box=[' + it.box.l + '..' + it.box.r + '] ink=[' + (it.ink ? it.ink.l + '..' + it.ink.r : '-') + '] :: ' + it.text);
  });
  await p2.close();
  log('PDF page2 errors: ' + JSON.stringify(p2errs));

  // --- BASELINE (dir attributes stripped) save/reopen comparison ---
  // Fresh incognito context so the app's service worker (registered from '/') cannot intercept /baseline/.
  const bctx = await browser.createBrowserContext();
  const pb = await bctx.newPage();
  const berrs = [];
  pb.on('pageerror', e => berrs.push(e.message));
  await pb.setViewport({ width: 1280, height: 900 });
  await pb.goto(`http://127.0.0.1:${server.address().port}/baseline/`, { waitUntil: 'load', timeout: 60000 });
  await sleep(900);
  await pb.evaluate((kf, f, kn, n) => {
    localStorage.setItem(kf, JSON.stringify(f));
    localStorage.setItem(kn, JSON.stringify([n]));
  }, 'eq-note-folders', FOLDERS, 'eq-note-manager-notes', buildNote('Mixed Direction Note'));
  await pb.reload({ waitUntil: 'load' });
  await sleep(1200);
  const openFn = openMixedNote;
  await openFn(pb);
  const bBefore = await pb.evaluate(MEASURE_FN);
  const mapB = m => m.items.map(it => ({ text: it.text, dir: it.dir, side: sideOf(it.ink, it.box.l, it.box.r), attach: (it.dir === 'rtl' ? (it.box.r - it.ink.r) : (it.ink.l - it.box.l)) <= 14 ? 'yes' : 'no' }));
  const bBeforeItems = mapB(bBefore);
  await pb.evaluate(() => { const b = document.querySelector('.notes-save-btn'); if (b) b.click(); });
  await sleep(900);
  await pb.evaluate(() => { const b = document.querySelector('.notes-back-btn'); if (b) b.click(); });
  await sleep(700);
  await openFn(pb);
  const bAfter = await pb.evaluate(MEASURE_FN);
  const bAfterItems = mapB(bAfter);
  log('BASELINE before items=' + bBeforeItems.length);
  bBeforeItems.forEach(it => log('  b li dir=' + it.dir + ' side=' + it.side + ' attach=' + it.attach + ' :: ' + it.text));
  log('BASELINE after sameDirMap=' + (JSON.stringify(bBeforeItems) === JSON.stringify(bAfterItems)) + ' items=' + bAfterItems.length + ' edDir=' + bAfter.editor.dir);
  bAfterItems.forEach(it => log('  b li dir=' + it.dir + ' side=' + it.side + ' attach=' + it.attach + ' :: ' + it.text));
  log('BASELINE errors(non-404): ' + JSON.stringify(berrs.filter(e => !/404/.test(e))));
  await pb.close();
  await bctx.close();

  log('RUNTIME ERRORS(non-404): ' + JSON.stringify(errs.filter(e => !/404/.test(e))));
  log('SUITE DONE');
} finally { await browser.close(); server.closeAllConnections?.(); server.close(); }

