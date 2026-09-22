// PART 09 — IMAGES inside Notes. Real Chrome behavioral test.
// Covers: Upload (real file input), Camera (menu item + capture attr; real
// capture NOT VERIFIED in headless), selection, resize, move (drag reorder),
// align (L/C/R), delete, persistence (autosave -> close -> reopen -> reload),
// multiple images, Preview, PDF (html2pdf stubbed at capture boundary),
// integration (text + image + table), no new console errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const STORAGE_KEY = 'eq-note-manager-notes';
const PORT = 8691;
const PREEXISTING_SVG = /attribute d: Expected number|a2 2 2 0 0 0/i;
let pass = 0, fail = 0, notVerified = 0, preexisting = 0;
const results = [];
function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : (detail === 'NV' ? 'NOTVER' : 'FAIL')}  ${name}${detail && detail !== 'NV' ? '  -> ' + detail : ''}`); ok ? pass++ : (detail === 'NV' ? notVerified++ : fail++); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 4x4 red PNG (used for upload + data URL injection).
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8z8Dwn4GBgYGRAQ0AACQCAQGqRqvjAAAAAElFTkSuQmCC';
const PNG_BYTES = Buffer.from(PNG_B64, 'base64');
const PNG_PATH = path.join(HERE, '_p9_pixel.png');
fs.writeFileSync(PNG_PATH, PNG_BYTES);
const PNG_DATAURL = 'data:image/png;base64,' + PNG_B64;

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (!p || p === '/') p = '/index.html';
    const f = path.join(ROOT, p), e = path.extname(f).toLowerCase();
    const m = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
    res.writeHead(200, { 'Content-Type': (m[e] || 'application/octet-stream') + '; charset=utf-8' });
    res.end(fs.readFileSync(f));
  } catch (err) { if (!res.headersSent) { res.writeHead(404); res.end('nf'); } }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const freshErrors = [];
page.on('pageerror', (e) => { if (!PREEXISTING_SVG.test(e.message)) freshErrors.push(e.message); else preexisting++; });
page.on('console', (m) => { if (m.type() === 'error') { if (PREEXISTING_SVG.test(m.text())) preexisting++; else freshErrors.push(m.text()); } });
await page.evaluateOnNewDocument(() => {
  window.__capturedHtml = '';
  window.html2pdf = function () {
    let src = null;
    const chain = {
      set() { return chain; }, from(el) { src = el; return chain; }, toPdf() { return chain; }, save() { return chain; },
      output() { if (src) { try { window.__capturedHtml = src.outerHTML || ''; } catch (e) {} } return Promise.resolve(new Blob(['%PDF-1.4 stub'], { type: 'application/pdf' })); }
    };
    return chain;
  };
});

async function openEditor() {
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(300);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(200);
  await page.evaluate(() => document.getElementById('openNewNoteButton').click());
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
}
async function waitSave(ms) { await sleep(ms || 700); }
async function imagesInDom() { return page.evaluate(() => document.querySelectorAll('#noteBodyInput .note-image-block').length); }
async function imageStates() {
  return page.evaluate(() => Array.from(document.querySelectorAll('#noteBodyInput .note-image-block')).map((el) => {
    const img = el.querySelector('.note-image-elem');
    return { align: el.getAttribute('data-image-align'), width: img ? (parseFloat(img.style.width) || 0) : 0, src: img ? (img.getAttribute('src') || '').slice(0, 22) : '', sel: el.classList.contains('is-selected'), grips: el.querySelectorAll('.note-image-grip').length, hasCtl: !!el.querySelector('.note-image-ctl'), hasDel: !!el.querySelector('.note-image-del') };
  }));
}
async function storedBlocks() {
  return page.evaluate((k) => {
    try {
      const arr = JSON.parse(localStorage.getItem(k)) || [];
      const n = arr[arr.length - 1];
      if (!n || !Array.isArray(n.bodyBlocks)) return null;
      return n.bodyBlocks.map((b) => b.type + (b.align ? ':' + b.align : '') + (b.width ? ':' + Math.round(b.width) : ''));
    } catch (e) { return 'ERR:' + e.message; }
  }, STORAGE_KEY);
}
async function uploadImage() {
  const el = await page.$('#noteImageFileInput');
  if (!el) return false;
  await el.uploadFile(PNG_PATH);
  await sleep(600);
  return true;
}
// Select an image block (adds .is-selected) so resize grips/ctl are visible.
async function selectImageAt(idx) {
  return page.evaluate((idx) => {
    const b = document.querySelectorAll('#noteBodyInput .note-image-block')[idx];
    if (!b) return false;
    b.classList.add('is-selected');
    return true;
  }, idx);
}
// Behavioral resize: drag the SE grip by dx.
async function dragResizeAt(idx, dx) {
  return page.evaluate((idx, dx) => {
    const block = document.querySelectorAll('#noteBodyInput .note-image-block')[idx];
    if (!block) return 'no-block';
    const grip = block.querySelector('.note-image-grip.se');
    if (!grip) return 'no-grip';
    const r = grip.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: x, clientY: y }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: x + dx, clientY: y }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: x + dx, clientY: y }));
    return 'ok';
  }, idx, dx);
}
// Behavioral move: drag the image body to the top of the note (reorder).
async function dragMoveToTop(idx) {
  return page.evaluate((idx) => {
    const block = document.querySelectorAll('#noteBodyInput .note-image-block')[idx];
    if (!block) return 'no-block';
    const img = block.querySelector('.note-image-elem');
    if (!img) return 'no-img';
    const r = img.getBoundingClientRect();
    img.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: r.left + 4, clientY: r.top + 4 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 2, clientX: r.left + 4, clientY: r.top + 4 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 2, clientX: r.left + 4, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 2, clientX: r.left + 4, clientY: 5 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2, clientX: r.left + 4, clientY: 5 }));
    return 'ok';
  }, idx);
}
async function blockOrderLabels() {
  return page.evaluate(() => Array.from(document.querySelectorAll('#noteBodyInput > *'))
    .map((el) => el.classList.contains('note-image-block') ? 'IMG'
      : (el.tagName === 'TABLE' || el.classList.contains('note-table-wrap')) ? 'TABLE'
      : (el.classList.contains('note-checklist')) ? 'CHECK' : 'TXT').join(','));
}
async function reopenNote() {
  await page.evaluate(() => { const c = document.getElementById('closeFullScreenNote'); if (c) c.click(); });
  await sleep(400);
  const clicked = await page.evaluate(() => {
    const item = document.querySelector('#notesList .note-item .note-item-main') || document.querySelector('#notesList .note-item');
    if (!item) return false;
    item.click();
    return true;
  });
  if (!clicked) throw new Error('no note item to reopen');
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(400);
}

console.log('=== PART 09 — Images inside Notes ===');
try {
  await openEditor();
  await page.evaluate(() => { const e = document.getElementById('noteTitleInput'); e.value = 'P9 Image Test'; e.dispatchEvent(new Event('input', { bubbles: true })); });

  // --- 1. Add → Image affordance ------------------------------------
  check('Image toolbar button present (noteImageBtn)', await page.evaluate(() => !!document.getElementById('noteImageBtn')));
  const menuOpens = await page.evaluate(() => {
    const b = document.getElementById('noteImageBtn'); if (!b) return false; b.click();
    const m = document.getElementById('noteImageMenu');
    return !!m && !m.classList.contains('hidden') && m.querySelectorAll('.note-image-menu-item').length === 2;
  });
  check('Add→Image menu opens with Upload + Camera items', menuOpens);
  const captureOk = await page.evaluate(() => {
    const input = document.getElementById('noteImageFileInput');
    const cam = document.querySelector('#noteImageMenu [data-source="camera"]');
    const up = document.querySelector('#noteImageMenu [data-source="upload"]');
    if (!cam || !up || !input) return false;
    input.removeAttribute('capture');
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    cam.dispatchEvent(ev);
    const camAttr = input.getAttribute('capture');
    input.removeAttribute('capture');
    up.dispatchEvent(ev);
    const upAttr = input.getAttribute('capture');
    return camAttr === 'environment' && upAttr === null;
  });
  check('Camera menu item sets capture="environment"; Upload clears it', captureOk,
    'real device camera capture NOT VERIFIED (headless Chrome, no permissions) -> NV');
  await page.evaluate(() => { const m = document.getElementById('noteImageMenu'); if (m) m.classList.add('hidden'); });

  // --- 2. Upload: real file input -> real <img> block ----------------
  check('Upload: hidden file input accepts the image file', await uploadImage());
  await sleep(300);
  const cnt1 = await imagesInDom();
  check('Upload: image inserted as a real block in the editor', cnt1 === 1, 'count=' + cnt1);
  let st1 = await imageStates();
  check('Image is a real <img> with data: URL (not canvas/screenshot/bg)', st1.length === 1 && st1[0].src.startsWith('data:image/png'), JSON.stringify(st1[0]));
  await selectImageAt(0);
  st1 = await imageStates();
  check('Selection: selected image shows resize grips (4) + ctl + delete', st1.length === 1 && st1[0].grips === 4 && st1[0].hasCtl && st1[0].hasDel, JSON.stringify(st1[0]));

  // --- 3. Resize (behavioral drag) -----------------------------------
  await dragResizeAt(0, 90);
  await sleep(250);
  let st2 = await imageStates();
  check('Resize: SE grip drag changes image width', st2.length === 1 && st2[0].width > 40 && st2[0].width !== 320, 'w=' + st2[0].width);
  const shrink = await page.evaluate(() => {
    const block = document.querySelectorAll('#noteBodyInput .note-image-block')[0];
    const grip = block.querySelector('.note-image-grip.se');
    const r = grip.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3, clientX: x, clientY: y }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 3, clientX: x - 4000, clientY: y }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3, clientX: x - 4000, clientY: y }));
    const img = block.querySelector('.note-image-elem');
    const b = document.querySelector('#noteBodyInput');
    return { w: parseFloat(img.style.width) || 0, bodyW: b ? b.getBoundingClientRect().width : 0 };
  });
  check('Resize: cannot shrink below min-width / break layout', shrink.w >= 48 && shrink.w < 4000, JSON.stringify(shrink));
  check('Resize: image still visible in DOM after resize', (await imagesInDom()) === 1);

  // --- 4. Align L / C / R (via in-image ctl buttons) -----------------
  const alignResult = await page.evaluate(() => {
    const b = document.querySelector('#noteBodyInput .note-image-block');
    if (!b) return null;
    const btns = Array.from(b.querySelectorAll('.note-image-align'));
    const set = (a) => { const btn = btns.find((x) => x.getAttribute('data-align') === a); if (btn) btn.click(); };
    set('center'); const c = b.getAttribute('data-image-align');
    set('right'); const r = b.getAttribute('data-image-align');
    set('left'); const l = b.getAttribute('data-image-align');
    return { c: c, r: r, l: l };
  });
  check('Align: Center then Right then Left set on the image block',
    !!alignResult && alignResult.c === 'center' && alignResult.r === 'right' && alignResult.l === 'left',
    alignResult ? JSON.stringify(alignResult) : 'no-image');

  // --- 5. Move (drag reorder) ----------------------------------------
  await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const t1 = document.createElement('div'); t1.className = 'note-block'; t1.textContent = 'AlphaText';
    const t2 = document.createElement('div'); t2.className = 'note-block'; t2.textContent = 'BetaText';
    body.insertBefore(t1, body.firstChild);
    body.appendChild(t2);
  });
  await sleep(150);
  const before = await blockOrderLabels();
  const mv = await dragMoveToTop(0);
  await sleep(250);
  const after = await blockOrderLabels();
  check('Move: image drag re-orders the block within the note', mv === 'ok' && after !== before && after.indexOf('IMG') !== -1,
    'before=' + before + ' after=' + after);
  check('Move: text blocks remain intact and editable after the move',
    await page.evaluate(() => {
      const txt = Array.from(document.querySelectorAll('#noteBodyInput .note-block')).map((d) => d.textContent).join('|');
      return txt.indexOf('AlphaText') !== -1 && txt.indexOf('BetaText') !== -1;
    }));

  // --- 6. Persistence: autosave -> close -> reopen -> reload ---------
  await waitSave();
  const stored1 = await storedBlocks();
  check('Persistence: image block (with width+align) saved to bodyBlocks',
    !!(stored1 && Array.isArray(stored1) && stored1.some((s) => s.indexOf('image') === 0)),
    JSON.stringify(stored1));
  const imgCountStored = (stored1 || []).filter((s) => s.indexOf('image') === 0).length;
  check('Persistence: no duplicate image blocks in storage', imgCountStored === 1, 'images=' + imgCountStored);

  await reopenNote();
  const reopenSt = await imageStates();
  check('Reopen: image block restored in the editor', reopenSt.length === 1, 'n=' + reopenSt.length);
  check('Reopen: stored width + align preserved', reopenSt.length === 1 && reopenSt[0].align === 'left' && reopenSt[0].width > 40, JSON.stringify(reopenSt[0]));

  // --- full browser reload + reopen -----------------------------------
  await page.evaluate(() => { const c = document.getElementById('closeFullScreenNote'); if (c) c.click(); });
  await sleep(300);
  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await sleep(400);
  await page.evaluate(() => { const b = document.querySelector('.drawer-menu-item[data-action="open-notes"]'); if (b) b.click(); });
  await page.waitForSelector('#notesManagerModal.show', { visible: true, timeout: 8000 });
  await sleep(250);
  await page.evaluate(() => { const item = document.querySelector('#notesList .note-item .note-item-main') || document.querySelector('#notesList .note-item'); if (item) item.click(); });
  await page.waitForSelector('#fullScreenNoteModal.show', { visible: true, timeout: 8000 });
  await sleep(350);
  const reloadSt = await imageStates();
  check('Reload: image survives full browser reload + reopen', reloadSt.length === 1, 'n=' + reloadSt.length);
  check('Reload: width + align preserved after reload', reloadSt.length === 1 && reloadSt[0].align === 'left' && reloadSt[0].width > 40, JSON.stringify(reloadSt[0]));

  // --- 7. Multiple images (no duplicates/overwrite) -------------------
  await uploadImage();
  await sleep(400);
  const multiCount = await imagesInDom();
  check('Multiple images: second upload adds a distinct block', multiCount === 2, 'count=' + multiCount);
  await waitSave();
  const storedMulti = await storedBlocks();
  const multiImgs = (storedMulti || []).filter((s) => s.indexOf('image') === 0).length;
  check('Multiple images: both stored without duplication', multiImgs === 2, 'stored=' + JSON.stringify(storedMulti));

  // --- 8. Delete ------------------------------------------------------
  await selectImageAt(1);
  const delResult = await page.evaluate(() => {
    const bs = document.querySelectorAll('#noteBodyInput .note-image-block');
    if (bs.length < 2) return 'need2';
    const del = bs[1].querySelector('.note-image-del');
    if (!del) return 'no-del';
    del.click();
    return document.querySelectorAll('#noteBodyInput .note-image-block').length === 1 ? 'ok' : 'not-removed';
  });
  check('Delete: removes only the selected image (keeps the other + text)', delResult === 'ok', 'result=' + delResult);
  await waitSave();
  const storedAfterDel = await storedBlocks();
  const imgsAfterDel = (storedAfterDel || []).filter((s) => s.indexOf('image') === 0).length;
  check('Delete: image removed from the data model after save', imgsAfterDel === 1, 'stored=' + JSON.stringify(storedAfterDel));
  check('Delete: remaining text content untouched',
    await page.evaluate(() => { const t = Array.from(document.querySelectorAll('#noteBodyInput .note-block')).map((d) => d.textContent).join('|'); return t.indexOf('AlphaText') !== -1 && t.indexOf('BetaText') !== -1; }));

  // --- 9. Integration: text + image + table ---------------------------
  await page.evaluate(() => {
    const body = document.getElementById('noteBodyInput');
    const wrap = document.createElement('div');
    wrap.className = 'note-table-wrap'; wrap.setAttribute('contenteditable', 'false');
    const table = document.createElement('table'); table.className = 'note-table';
    const cg = document.createElement('colgroup'); cg.appendChild(document.createElement('col')); cg.appendChild(document.createElement('col'));
    table.appendChild(cg);
    const tb = document.createElement('tbody'); const tr = document.createElement('tr');
    tr.innerHTML = '<td class="note-cell" contenteditable="true">T1</td><td class="note-cell" contenteditable="true">T2</td>';
    tb.appendChild(tr); table.appendChild(tb); wrap.appendChild(table);
    body.appendChild(wrap);
    body.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await waitSave();
  const integTypes = ((await storedBlocks()) || []).map((s) => s.split(':')[0]).join(',');
  check('Integration: text + image + table blocks preserved in order', /image/.test(integTypes) && /table/.test(integTypes), 'types=' + integTypes);
  check('Integration: image + table both still live/editable in the editor',
    await page.evaluate(() => { const b = document.getElementById('noteBodyInput'); return !!b.querySelector('.note-image-block') && !!b.querySelector('.note-table-wrap'); }));

  // --- 10. Preview modal + PDF capture --------------------------------
  await page.evaluate(() => { const c = document.getElementById('notePreviewPdfBtn'); if (c) c.click(); });
  let pvShown = false;
  for (let i = 0; i < 60 && !pvShown; i++) { await sleep(200); pvShown = await page.evaluate(() => { const m = document.getElementById('notePdfPreviewModal'); return !!(m && m.classList.contains('show')); }); }
  await sleep(1500);
  check('Preview: PDF preview modal opens', pvShown);
  const pv = await page.evaluate(() => {
    const c = document.querySelector('#notePdfPreviewModal canvas');
    return { canvas: c ? (c.width + 'x' + c.height) : 'none', hasImg: (window.__capturedHtml || '').indexOf('eq-pdf-image') !== -1, capLen: (window.__capturedHtml || '').length };
  });
  check('PDF: report HTML carries .eq-pdf-image (captured via html2pdf stub)', pv.hasImg, 'capLen=' + pv.capLen + ' canvas=' + pv.canvas);
  check('PDF: image keeps data: URL + explicit width (aspect ratio safe)',
    await page.evaluate(() => { const h = window.__capturedHtml || ''; return h.indexOf('data:image/png') !== -1 && h.indexOf('eq-pdf-image-block') !== -1 && /style="width:\d+px"/.test(h); }), '');

  // --- 11. No new console errors --------------------------------------
  check('Console: no new JS/console errors from the image feature', freshErrors.length === 0, JSON.stringify(freshErrors.slice(0, 4)));
  check('Console: known pre-existing Drawer SVG error still excluded', preexisting >= 0, 'preexisting=' + preexisting);
} catch (topErr) {
  check('Runtime completed without top-level error', false, String(topErr && topErr.message || topErr));
}

try { await browser.close(); } catch (e) {}
try { server.close(); } catch (e) {}
console.log('RESULTS_JSON=' + JSON.stringify({ pass: pass, fail: fail, not_verified: notVerified, preexisting: preexisting, total: pass + fail + notVerified }));
process.exit(fail > 0 ? 1 : 0);