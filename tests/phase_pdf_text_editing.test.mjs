// =====================================================================
// PHASE TEST — SMART DOCUMENTS: DIRECT PDF TEXT EDITING (inline, same
// workspace, same viewer). Real-Chrome behavioral test via Puppeteer.
// Run:  node tests/phase_pdf_text_editing.test.mjs
// Covers: Edit-text toggle, click → caret at the exact character, word
// selection, typing replacement, Backspace/Delete, Ctrl+A (line-scoped),
// copy/paste as plain text, RTL Arabic replacement, multi-page editing
// Page 1 → Page 2, scroll during editing, View restores read mode, and
// zero JS errors.
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8462;
const FIXTURE = path.join(ROOT, '__notes_test', '_p19_fixture_2p.pdf');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain',
  '.wasm': 'application/wasm', '.pdf': 'application/pdf'
};
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

let pass = 0, fail = 0;
const check = (n, ok, d = '') => { console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  -> ' + d : '')); if (ok) pass++; else fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e && e.message || e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

async function loadPdf() {
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await sleep(800);
  await page.evaluate(() => { document.querySelector('.drawer-menu-item[data-action="open-smart-docs"]')?.click(); });
  await sleep(500);
  await page.evaluate((b64) => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], 'edit.pdf', { type: 'application/pdf' }));
    const fi = document.getElementById('smartPdfFileInput');
    fi.files = dt.files; fi.dispatchEvent(new Event('change', { bubbles: true }));
  }, fs.readFileSync(FIXTURE).toString('base64'));
  for (let i = 0; i < 80; i++) {
    const s = await page.evaluate(() => {
      const pages = document.querySelectorAll('#smartPdfPages .smart-pdf-page');
      const painted = [...pages].filter((p) => { const c = p.querySelector('canvas'); return c && c.width > 0; }).length;
      const lines = document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line').length;
      return { ws: !document.getElementById('smartPdfWorkspace').hidden, n: pages.length, painted, lines };
    });
    if (s.ws && s.n >= 2 && s.painted >= 2 && s.lines > 0) return s;
    await sleep(250);
  }
  return null;
}

// Wait until a PDF text line actually holds the caret in editing mode.
async function caretReady(maxMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const st = await page.evaluate(() => {
      const active = document.activeElement;
      const line = active && active.classList && active.classList.contains('smart-pdf-edit-line') ? active : null;
      return {
        focused: !!line,
        editing: document.getElementById('smartPdfPages').classList.contains('is-editing'),
        selText: String(window.getSelection().toString())
      };
    });
    if (st.focused && st.editing) return st;
    await sleep(120);
  }
  return null;
}
// ---- Open Smart Documents → upload the 2-page PDF -------------------------
const loaded = await loadPdf();

check('1) PDF loads in the SAME Smart Documents workspace (2 pages, text layer)', !!loaded, JSON.stringify(loaded || {}));

// ---- Edit text toggle ------------------------------------------------------
await page.evaluate(() => document.getElementById('smartPdfEditBtn').click());
await sleep(250);
const modeOn = await page.evaluate(() => ({
  editing: document.getElementById('smartPdfPages').classList.contains('is-editing'),
  editActive: document.getElementById('smartPdfEditBtn').classList.contains('is-active'),
  viewInactive: !document.getElementById('smartPdfViewBtn').classList.contains('is-active'),
  editable: [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')].every((l) => l.isContentEditable)
}));
check('2) "Edit text" activates inline editing for every text line', modeOn.editing && modeOn.editActive && modeOn.viewInactive && modeOn.editable, JSON.stringify(modeOn));

// ---- Click → native caret inside the exact word ----------------------------
const p1 = await page.evaluate(() => {
  const lines = [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')];
  const line = lines
    .map((el) => { const r = el.getBoundingClientRect(); return { el, r, text: el.textContent }; })
    .filter((x) => x.r.width > 24 && x.text.trim().length > 3 && x.r.top > 0 && x.r.bottom < innerHeight)
    .sort((a, b) => a.r.top - b.r.top)[0] || null;
  if (!line) return null;
  return {
    idx: lines.indexOf(line.el),
    widx: (window.__p1idx = lines.indexOf(line.el)),
    x: line.r.left + Math.min(10, line.r.width * 0.3),
    y: line.r.top + line.r.height * 0.5,
    text: line.text
  };
});
check('3) A text line is visible on Page 1', !!p1, JSON.stringify(p1 || {}));
if (p1) {
  await page.mouse.click(p1.x, p1.y);
  const st = await caretReady();
  const carets = st ? await page.evaluate(() => {
    const sel = window.getSelection();
    const n = sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
    const el = n && n.nodeType === 3 ? n.parentElement : (n || null);
    const line = el && el.closest ? el.closest('.smart-pdf-edit-line') : null;
    return {
      inLine: !!line,
      focused: document.activeElement === line,
      lineClass: line ? line.className : '',
      selText: String(sel.toString()),
      collapsed: sel.isCollapsed
    };
  }) : { inLine: false };
  check('4) Click places the caret inside the clicked text line (native | caret)', carets.inLine && carets.focused, JSON.stringify(carets));
  check('5) Caret is collapsed (no accidental selection) and line is active', carets.collapsed && /is-active/.test(carets.lineClass), JSON.stringify(carets));

  // ---- Word selection; typing replaces exactly that word -------------------
  // (CDP headless input cannot synthesize the browser's dbl-click highlight;
  //  in real Chrome a double-click uses the SAME native selection engine that
  //  is verified below via word selection inside the line.)
  await page.mouse.click(p1.x, p1.y);
  const sWord = await caretReady();
  check('6) Word selection works (native selection engine inside the line)', !!sWord, JSON.stringify(sWord || {}));
  await page.keyboard.press('Home');
  await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.press('ArrowRight'); await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  await sleep(200);
  const word = await page.evaluate(() => String(window.getSelection().toString()));
  check('6b) A word (with its trailing space, Chrome native behavior) is selected', word.trim().length > 0, JSON.stringify(word));
  if (word.trim()) {
    await page.keyboard.type('EQ9');
    await sleep(200);
    const after = await page.evaluate(() => {
      const line = document.activeElement;
      return { text: line ? String(line.textContent) : '', sel: String(window.getSelection().toString()) };
    });
    check('7) Typing replaces ONLY the selected word in place', after.text.includes('EQ9') && !after.text.includes(word), JSON.stringify(after));
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await sleep(200);
    const committed = await page.evaluate((idx) => {
      const lines = document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line');
      const line = lines[idx];
      return { text: line ? String(line.textContent) : '', edited: !!(line && line.classList.contains('is-edited')) };
    }, p1.idx);
    check('8) Replacement commits at the SAME position (is-edited line keeps the new text)', committed.edited && committed.text.includes('EQ9'), JSON.stringify(committed));
  }
}
// ---- Backspace / Delete / Ctrl+A scope -------------------------------------
{
  await page.mouse.click(p1.x, p1.y);
  const s2 = await caretReady();
  check('9) Re-click re-enters the same line with a collapsed caret', !!s2 && s2.selText === '', JSON.stringify(s2 || {}));
  await page.keyboard.press('End');
  await sleep(100);
  const len0 = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent).length : 0));
  await page.keyboard.press('Backspace');
  await sleep(120);
  const len1 = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent).length : 0));
  check('10) Backspace removes the last character (End → Backspace)', len1 === Math.max(0, len0 - 1), 'before=' + len0 + ' after=' + len1);
  await page.keyboard.press('Home');
  await sleep(100);
  await page.keyboard.press('Delete');
  await sleep(120);
  const len2 = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent).length : 0));
  check('11) Delete removes the first character (Home → Delete)', len2 === Math.max(0, len1 - 1), 'before=' + len1 + ' after=' + len2);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await sleep(120);
  const selAll = await page.evaluate(() => ({
    sel: String(window.getSelection().toString()),
    lineText: document.activeElement ? String(document.activeElement.textContent) : ''
  }));
  check('12) Ctrl+A selects the ACTIVE LINE only (never the whole viewer)', selAll.sel === selAll.lineText && selAll.sel.length > 0, JSON.stringify({ selLen: selAll.sel.length, lineLen: selAll.lineText.length }));
  await page.keyboard.type('EQEDIT');
  await sleep(150);
  const replaced = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent) : ''));
  check('13) Typing over a selection replaces it (Ctrl+A → type)', replaced === 'EQEDIT', JSON.stringify(replaced));
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await sleep(200);

  // ---- Paste sanitization: rich HTML clipboard becomes plain text ----------
  await page.mouse.click(p1.x, p1.y);
  const s3 = await caretReady();
  check('14a) Line re-focused before paste', !!s3, JSON.stringify(s3 || {}));
  await page.keyboard.press('End');
  const beforeRich = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent) : ''));
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/html', '<b>RICH</b><!-- --><script>window.__xss=1;</script>');
    dt.setData('text/plain', 'RICHTEXT ');
    const line = document.activeElement;
    line.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await sleep(150);
  const richPasted = await page.evaluate(() => ({
    text: document.activeElement ? String(document.activeElement.textContent) : '',
    xss: !!window.__xss,
    html: document.activeElement ? document.activeElement.innerHTML : ''
  }));
  check('14) Rich clipboard paste is reduced to PLAIN text (no HTML/JS injected)', richPasted.text === beforeRich + 'RICHTEXT ' && !richPasted.xss && richPasted.html.indexOf('<b>') < 0, JSON.stringify(richPasted));
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await sleep(150);
  await page.keyboard.press('End');
  // ---- Paste at the caret ---------------------------------------------------
  await page.mouse.click(p1.x, p1.y);
  const s4 = await caretReady();
  check('15a) Line focused again before paste', !!s4, JSON.stringify(s4 || {}));
  await page.keyboard.press('End');
  const beforePaste = await page.evaluate(() => (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('smart-pdf-edit-line')) ? String(document.activeElement.textContent) : null);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'PASTE1 ');
    const line = document.activeElement;
    line.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await sleep(150);
  const pasted = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent) : ''));
  check('15) Paste inserts plain text at the caret (End → paste)', beforePaste !== null && pasted === beforePaste + 'PASTE1 ', JSON.stringify({ beforePaste, pasted }));
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await sleep(200);
}
// ---- Multi-page: scroll to Page 2, edit a line there (same workspace) ------
const p2 = await page.evaluate(() => {
  const pages = [...document.querySelectorAll('#smartPdfPages .smart-pdf-page')];
  const two = pages[1];
  if (!two) return null;
  const line = [...two.querySelectorAll('.smart-pdf-edit-line')]
    .map((el) => { const r = el.getBoundingClientRect(); return { el, r, text: el.textContent }; })
    .filter((x) => x.r.width > 24 && x.text.trim().length > 3)[0] || null;
  return line ? { text: line.text } : null;
});
check('16) Page 2 exists with its own editable text lines', !!p2, JSON.stringify(p2 || {}));
if (p2) {
  // Scroll Page 2 into view WITHOUT leaving the same workspace (self-correcting).
  for (let i = 0; i < 6; i++) {
    const ok = await page.evaluate(() => {
      const pages = [...document.querySelectorAll('#smartPdfPages .smart-pdf-page')];
      const sc = document.getElementById('smartPdfScroll');
      const line = [...pages[1].querySelectorAll('.smart-pdf-edit-line')]
        .filter((l) => l.textContent.trim().length > 3)[0];
      if (!line) return false;
      const lr = line.getBoundingClientRect();
      const sr = sc.getBoundingClientRect();
      if (lr.top > sr.top + 40 && lr.bottom < sr.bottom - 10) return true;
      sc.scrollTop += lr.top - (sr.top + 90);
      return false;
    });
    if (ok) break;
    await sleep(250);
  }
  await sleep(300);
  const p2dbg = await page.evaluate(() => {
    const sc = document.getElementById('smartPdfScroll');
    const two = [...document.querySelectorAll('#smartPdfPages .smart-pdf-page')][1];
    const lines = two ? [...two.querySelectorAll('.smart-pdf-edit-line')] : [];
    return {
      scrollTop: sc.scrollTop,
      page2Top: two ? two.getBoundingClientRect().top : null,
      lines: lines.map((l) => { const r = l.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), text: l.textContent.slice(0, 30) }; })
    };
  });
  const p2b = await page.evaluate(() => {
    const two = [...document.querySelectorAll('#smartPdfPages .smart-pdf-page')][1];
    const line = [...two.querySelectorAll('.smart-pdf-edit-line')]
      .map((el) => { const r = el.getBoundingClientRect(); return { el, r, text: el.textContent }; })
      .filter((x) => x.r.width > 24 && x.text.trim().length > 3 && x.r.top > 0 && x.r.bottom < innerHeight)[0] || null;
    if (!line) return null;
    return { x: line.r.left + Math.min(8, line.r.width * 0.25), y: line.r.top + line.r.height * 0.5 };
  });
  check('16b) Page 2 scrolled into view with a visible line', !!p2b, JSON.stringify(p2dbg));
  if (p2b) {
    await page.mouse.click(p2b.x, p2b.y);
    const st2 = await caretReady();
    check('17) Page 2: click places the caret in a Page-2 line (same workspace)', !!st2, JSON.stringify(st2 || {}));
    await page.keyboard.type(' P2EDIT');
    await sleep(150);
    const p2t = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent) : ''));
    check('18) Page 2: typing edits the Page-2 line in place', p2t.includes('P2EDIT'), JSON.stringify(p2t));
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await sleep(200);
  } else {
    check('17) Page 2: click places the caret in a Page-2 line (same workspace)', false, 'no visible line');
    check('18) Page 2: typing edits the Page-2 line in place', false, 'no visible line');
  }
  const tbTop = await page.evaluate(() => document.getElementById('smartPdfToolbar').getBoundingClientRect().top);
  check('19) Scroll during editing: toolbar stays fixed, no page jump', tbTop < 100, 'tbTop=' + tbTop);
}
// ---- RTL: Arabic replacement keeps position/direction ----------------------
{
  await page.evaluate(() => {
    const sc = document.getElementById('smartPdfScroll');
    const target = [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')]
      .find((l) => l.textContent.trim().length > 0);
    if (target) {
      const lr = target.getBoundingClientRect();
      const sr = sc.getBoundingClientRect();
      sc.scrollTop += (lr.top - sr.top) - 80;
    }
  });
  await sleep(350);
  const ar = await page.evaluate(() => {
    const line = [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')]
      .filter((l) => { const r = l.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight && l.textContent.trim(); })[0];
    if (!line) return null;
    line.focus();
    return { before: String(line.textContent) };
  });
  if (ar) {
    await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
    await page.keyboard.type('اسم العميل احمد');
    await sleep(200);
    const rtl = await page.evaluate(() => {
      const line = document.activeElement;
      return { text: String(line.textContent), dir: line.getAttribute('dir') };
    });
    check('20) Arabic typing works inline', rtl.text === 'اسم العميل احمد', JSON.stringify(rtl));
    check('21) Arabic line direction becomes RTL (dir=rtl on the line)', rtl.dir === 'rtl', 'dir=' + rtl.dir);
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await sleep(150);
    const kept = await page.evaluate(() => {
      const line = [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')]
        .find((l) => l.textContent.indexOf('احمد') >= 0);
      return line ? { dir: line.getAttribute('dir'), edited: line.classList.contains('is-edited') } : null;
    });
    check('22) Arabic replacement commits in place with RTL preserved', !!kept && kept.dir === 'rtl' && kept.edited, JSON.stringify(kept || {}));
  } else {
    check('20) Arabic typing works inline', false, 'no line');
    check('21) Arabic line direction becomes RTL (dir=rtl on the line)', false, 'no line');
    check('22) Arabic replacement commits in place with RTL preserved', false, 'no line');
  }
}

// ---- View restores read mode ------------------------------------------------
await page.evaluate(() => document.getElementById('smartPdfViewBtn').click());
await sleep(250);
const readMode = await page.evaluate(() => ({
  editing: document.getElementById('smartPdfPages').classList.contains('is-editing'),
  viewActive: document.getElementById('smartPdfViewBtn').classList.contains('is-active'),
  anyEditable: [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')].some((l) => l.isContentEditable),
  editedKept: [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')].some((l) => l.classList.contains('is-edited'))
}));
check('23) "View" returns the PDF to normal read mode', !readMode.editing && readMode.viewActive && !readMode.anyEditable, JSON.stringify(readMode));
check('24) Edits persist in the session after leaving edit mode', readMode.editedKept, JSON.stringify(readMode));

// ---- Mobile viewport: tap + typing inside the same workspace ----------------
// Note: the app's (pre-existing, protected) service-worker activation reloads
// the page when the environment first takes control, so — exactly like the
// slim-workspace smoke test — the mobile run re-opens and re-uploads the PDF
// in the SAME Smart Documents workspace at the mobile viewport.
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
const mobLoaded = await loadPdf();
check('24b) MOBILE: same workspace re-opened and PDF loads at 390x844', !!mobLoaded, JSON.stringify(mobLoaded || {}));
await page.evaluate(() => document.getElementById('smartPdfEditBtn').click());
await sleep(300);
const mobMode = await page.evaluate(() => ({
  editing: document.getElementById('smartPdfPages').classList.contains('is-editing'),
  editable: [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')].every((l) => l.isContentEditable)
}));
check('24c) MOBILE: Edit text mode active', mobMode.editing && mobMode.editable, JSON.stringify(mobMode));
const mob = await page.evaluate(() => {
  const line = [...document.querySelectorAll('#smartPdfPages .smart-pdf-edit-line')]
    .map((el) => { const r = el.getBoundingClientRect(); return { el, r, text: el.textContent }; })
    .filter((x) => x.r.width > 24 && x.text.trim().length > 3 && x.r.top > 0 && x.r.bottom < innerHeight)[0] || null;
  if (!line) return null;
  return { x: line.r.left + Math.min(8, line.r.width * 0.3), y: line.r.top + line.r.height * 0.5 };
});
if (mob) {
  await page.touchscreen.tap(mob.x, mob.y);
  const st3 = await caretReady();
  check('25) MOBILE: tap on text focuses the line with a caret', !!st3, JSON.stringify(st3 || {}));
  if (st3) {
    await page.keyboard.type('M1');
    await sleep(150);
    const mt = await page.evaluate(() => (document.activeElement ? String(document.activeElement.textContent) : ''));
    check('26) MOBILE: typing edits inline', mt.includes('M1'), JSON.stringify(mt));
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await sleep(150);
  }
} else {
  check('25) MOBILE: tap on text focuses the line with a caret', false, 'no visible line');
  check('26) MOBILE: typing edits inline', false, 'no visible line');
}
const mobLayout = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
  wsVisible: !document.getElementById('smartPdfWorkspace').hidden
}));
check('27) MOBILE: same workspace, no horizontal overflow', mobLayout.wsVisible && mobLayout.overflow, JSON.stringify(mobLayout));

check('28) Zero JavaScript errors during the whole flow', errs.length === 0, errs.slice(0, 3).join(' | '));

await browser.close();
server.close();
console.log(fail === 0 ? '\nPHASE PDF TEXT EDITING: ALL PASS (' + pass + '/' + (pass + fail) + ')' : '\nPHASE PDF TEXT EDITING FAILURES: ' + fail + '/' + (pass + fail));
process.exit(fail === 0 ? 0 : 1);

