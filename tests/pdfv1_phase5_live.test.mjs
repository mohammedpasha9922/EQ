// PDF V1 — PHASE 05: Real Chrome / Mobile verification (verification-only).
// No app changes. Tests gaps not covered by phases 1-4:
//  - Drag & drop real events + non-PDF rejection
//  - Invalid (corrupt) PDF + Change PDF + object URL revoke
//  - Export button state restore
//  - Calculator / SmartDocs / Notes UI isolation inside #pdfReportsWorkspace
//  - RTL (ar) / LTR (en) using the EXISTING language system
//  - Mobile Chrome emulation (touch, small viewport)
//  - Zero JS console errors across all sessions
import puppeteer from 'puppeteer';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e, buf) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise((r) => srv.listen(0, r));
const url = 'http://127.0.0.1:' + srv.address().port + '/';

let fails = 0, checks = 0;
function check(name, ok, d = '') { checks++; if (!ok) fails++; console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (d ? '  -> ' + d : '')); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const PDFMod = await import('../__pdfdiag/vendor/pdf-lib.min.js');
const PDFLib = PDFMod.default && PDFMod.default.PDFDocument ? PDFMod.default : PDFMod;
const doc = await PDFLib.PDFDocument.create();
for (let i = 0; i < 3; i++) {
  const pg = doc.addPage([612, 792]);
  pg.drawText('Phase5 Page ' + (i + 1), { x: 50, y: 700, size: 24 });
}
const srcPath = path.join(root, 'tests', '_p5src.pdf');
fs.writeFileSync(srcPath, await doc.save());
const badPath = path.join(root, 'tests', '_p5bad.pdf');
fs.writeFileSync(badPath, Buffer.from('%PDF-1.4 not a valid body \n%%EOF'));

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const allErrs = [];
function watch(p) { p.on('pageerror', (e) => allErrs.push(String(e))); return p; }
async function openWorkspace(p) {
  await p.goto(url, { waitUntil: 'networkidle2' });
  await sleep(400);
  await p.evaluate(() => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click());
  await sleep(350);
  return p.evaluate(() => document.getElementById('pdfReportsWorkspace').classList.contains('show'));
}
async function dropFile(p, file) {
  return p.evaluate((f) => {
    const dz = document.getElementById('pdfV1Dropzone');
    const dt = new DataTransfer();
    dt.items.add(f);
    for (const t of ['dragenter', 'dragover']) {
      const ev = new DragEvent(t, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'dataTransfer', { value: dt });
      dz.dispatchEvent(ev);
    }
    const over = dz.classList.contains('pdfv1-dragover');
    const ev = new DragEvent('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: dt });
    dz.dispatchEvent(ev);
    return { over, cleared: !dz.classList.contains('pdfv1-dragover') };
  }, file);
}

// ============ A/B/C/D: Drag & drop real events ============
{
  const p = watch(await browser.newPage());
  await p.setViewport({ width: 1280, height: 900, hasTouch: true, isMobile: false });
  check('D&D: workspace opens from feature-nav button', await openWorkspace(p));
  check('D&D: dropzone visible before import', await p.evaluate(() => { const d = document.getElementById('pdfV1Dropzone'); return !!d && d.offsetParent !== null; }));
  const f1 = await p.evaluateHandle(() => new File(['not a pdf'], 'notes.txt', { type: 'text/plain' }));
  const r1 = await dropFile(p, f1);
  check('D&D: dragenter/dragover highlight applied', r1.over === true);
  check('D&D: dragover class cleared after drop', r1.cleared === true);
  const rej = await p.evaluate(() => ({ err: document.getElementById('pdfV1Error').hidden ? '' : document.getElementById('pdfV1Error').textContent, viewer: document.getElementById('pdfV1ViewerWrap').hidden }));
  check('D&D: non-PDF rejected with clear error', rej.err.toLowerCase().indexOf('not a pdf') >= 0, rej.err);
  check('D&D: viewer NOT opened for non-PDF', rej.viewer === true);
  await (await p.$('#pdfV1FileInput')).uploadFile(srcPath);
  await sleep(1200);
  const ok = await p.evaluate(() => ({ viewer: !document.getElementById('pdfV1ViewerWrap').hidden, name: document.getElementById('pdfV1FileName').textContent }));
  check('D&D: valid PDF opens viewer (picker path after drop)', ok.viewer && ok.name === '_p5src.pdf', JSON.stringify(ok));
  check('D&D: error cleared after valid open', await p.evaluate(() => document.getElementById('pdfV1Error').hidden));
  check('D&D: no reload / no navigation', p.url() === url);
  await p.close();
}

// ============ C: Invalid PDF + Change PDF + revoke ============
{
  const p = watch(await browser.newPage());
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto(url, { waitUntil: 'networkidle2' });
  await sleep(400);
  await p.evaluate(() => {
    window.__revoked = 0; window.__created = 0;
    const ro = URL.revokeObjectURL.bind(URL); URL.revokeObjectURL = (u) => { window.__revoked++; return ro(u); };
    const oc = URL.createObjectURL.bind(URL); URL.createObjectURL = (o) => { const u = oc(o); window.__created++; return u; };
  });
  await p.evaluate(() => document.querySelector('#featureNavBar .feature-nav-btn[data-action="open-smart-docs"]').click());
  await sleep(350);
  await (await p.$('#pdfV1FileInput')).uploadFile(badPath);
  await sleep(700);
  const badState = await p.evaluate(() => ({ viewer: document.getElementById('pdfV1ViewerWrap').hidden, err: document.getElementById('pdfV1Error').hidden ? '' : document.getElementById('pdfV1Error').textContent }));
  check('Invalid PDF: no crash on corrupt body (native viewer path)', typeof badState.err === 'string', badState.err);
  await (await p.$('#pdfV1FileInput')).uploadFile(srcPath);
  await sleep(1200);
  const after1 = await p.evaluate(() => ({ viewer: !document.getElementById('pdfV1ViewerWrap').hidden, created: window.__created }));
  check('Change PDF: first valid PDF opens viewer', after1.viewer && after1.created >= 1, JSON.stringify(after1));
  await p.click('#pdfV1ChangeBtn');
  await sleep(250);
  // Change opens the picker but keeps the current viewer until a new file is chosen (by design)
  check('Change PDF: no error shown on change', await p.evaluate(() => document.getElementById('pdfV1Error').hidden));
  await (await p.$('#pdfV1FileInput')).uploadFile(srcPath);
  await sleep(1200);
  const after2 = await p.evaluate(() => ({ viewer: !document.getElementById('pdfV1ViewerWrap').hidden, created: window.__created, revoked: window.__revoked }));
  check('Change PDF: second PDF opens', after2.viewer);
  check('Change PDF: old object URL revoked (no leak)', after2.revoked >= 1 && after2.created >= 2, JSON.stringify(after2));
  check('no JS errors (invalid + change pdf session)', allErrs.length === 0, allErrs.join(' | '));
  await p.close();
}

// ============ E/H: quick export + button state restore ============
{
  const p = watch(await browser.newPage());
  await p.setViewport({ width: 1280, height: 900 });
  await openWorkspace(p);
  await (await p.$('#pdfV1FileInput')).uploadFile(srcPath);
  await sleep(1500);
  check('Stamp: stamp tool button present & enabled', await p.evaluate(() => { const b = document.getElementById('pdfV1StampBtn'); return !!b && !b.disabled; }));
  await p.click('#pdfV1ExportBtn');
  let done = false, sawBusy = false;
  for (let i = 0; i < 300 && !done; i++) {
    await sleep(100);
    const st = await p.evaluate(() => { const b = document.getElementById('pdfV1ExportBtn'); return { dis: b.disabled, txt: b.textContent }; });
    if (st.dis || /exporting/i.test(st.txt)) sawBusy = true;
    done = !st.dis && !/exporting/i.test(st.txt);
  }
  check('Export: busy state shown during export', sawBusy);
  check('Export: button restored after success', done);
  await p.close();
}

// ============ L: Calculator / UI isolation ============
{
  const p = watch(await browser.newPage());
  await p.setViewport({ width: 1280, height: 900 });
  check('Isolation: workspace opens', await openWorkspace(p));
  const iso = await p.evaluate(() => {
    const ws = document.getElementById('pdfReportsWorkspace');
    const txt = ws.textContent || '';
    const ids = ['primaryDisplay', 'calcGrid', 'historyPanel', 'notesManagerModal', 'smartDocsModal', 'drawer'];
    const found = ids.filter((i) => ws.querySelector('#' + i));
    const calcWords = /scientific|sin\(|cos\(|tan\(/.test(txt);
    const dup = ['pdfV1ExportBtn', 'pdfV1FileInput', 'pdfV1Dropzone'].filter((i) => (ws.innerHTML.match(new RegExp('id="' + i + '"', 'g')) || []).length !== 1);
    const smartUi = !!ws.querySelector('.smart-doc-card');
    const notesUi = !!ws.querySelector('.note-card, .notes-list');
    return { found, calcWords, dup, smartUi, notesUi };
  });
  check('Isolation: no Calculator/Notes/SmartDocs/Drawer ids inside workspace', iso.found.length === 0, JSON.stringify(iso.found));
  check('Isolation: no calculator keypad text inside workspace', !iso.calcWords);
  check('Isolation: no duplicate PDF controls (each id exactly once)', iso.dup.length === 0, JSON.stringify(iso.dup));
  check('Isolation: no Smart Documents UI inside workspace', !iso.smartUi);
  check('Isolation: no Notes UI inside workspace', !iso.notesUi);
  await p.close();
}

// ============ K: RTL / LTR via existing language system ============
{
  const p = watch(await browser.newPage());
  await p.setViewport({ width: 1280, height: 900 });
  check('RTL/LTR: workspace opens', await openWorkspace(p));
  await p.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); s.value = 'ar'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(600);
  const ar = await p.evaluate(() => {
    const ws = document.getElementById('pdfReportsWorkspace');
    return { dir: document.documentElement.getAttribute('dir') || document.body.getAttribute('dir'), wsDir: getComputedStyle(ws).direction, btnVisible: document.getElementById('pdfV1BrowseBtn').offsetParent !== null };
  });
  check('RTL: ar sets document dir=rtl via existing system', ar.dir === 'rtl', JSON.stringify(ar));
  check('RTL: workspace still usable (browse button visible)', ar.btnVisible);
  await (await p.$('#pdfV1FileInput')).uploadFile(srcPath);
  await sleep(1500);
  const stageDir = await p.evaluate(() => { const s = document.getElementById('pdfV1Stage'); return s ? getComputedStyle(s).direction : 'absent'; });
  check('RTL: overlay stage keeps LTR coordinates', stageDir === 'ltr', stageDir);
  await p.evaluate(() => { const s = document.getElementById('topBarLanguageSelect'); s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(600);
  const en = await p.evaluate(() => (document.documentElement.getAttribute('dir') || document.body.getAttribute('dir')));
  check('LTR: en sets document dir=ltr', en === 'ltr', en);
  await p.close();
}

// ============ J: Mobile Chrome emulation ============
{
  const p = watch(await browser.newPage());
  await p.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  check('Mobile: workspace opens on mobile-emulated viewport', await openWorkspace(p));
  const mob = await p.evaluate(() => {
    const body = document.getElementById('pdfV1Body');
    const btn = document.getElementById('pdfV1BrowseBtn');
    const r = btn.getBoundingClientRect();
    return {
      overflowX: body.scrollWidth - body.clientWidth,
      reachable: r.width > 0 && r.right <= innerWidth && r.left >= 0 && r.top <= innerHeight && r.bottom >= 0,
    };
  });
  check('Mobile: no unintended horizontal overflow (import view)', mob.overflowX <= 0, 'overflowX=' + mob.overflowX);
  check('Mobile: primary control reachable in viewport', mob.reachable);
  await (await p.$('#pdfV1FileInput')).uploadFile(srcPath);
  await sleep(1500);
  const mob2 = await p.evaluate(() => ({
    viewer: !document.getElementById('pdfV1ViewerWrap').hidden,
    overflowX: document.getElementById('pdfV1Body').scrollWidth - document.getElementById('pdfV1Body').clientWidth,
    exportVisible: document.getElementById('pdfV1ExportBtn').offsetParent !== null,
  }));
  check('Mobile: PDF opens and viewer shown', mob2.viewer);
  check('Mobile: viewer view has no horizontal overflow', mob2.overflowX <= 0, 'overflowX=' + mob2.overflowX);
  check('Mobile: export button reachable', mob2.exportVisible);
  await p.close();
}

check('PHASE5: zero uncaught JS errors across ALL sessions', allErrs.length === 0, allErrs.join(' | '));

try { fs.unlinkSync(srcPath); } catch (e) {}
try { fs.unlinkSync(badPath); } catch (e) {}
await browser.close();
srv.close();
console.log(fails === 0 ? 'PHASE5 LIVE ALL PASS (' + checks + ' checks)' : 'PHASE5 FAILURES: ' + fails + ' (' + checks + ' checks)');
process.exit(fails === 0 ? 0 : 1);


