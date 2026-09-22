async function addViaMenu(type) {
  return await page.evaluate((t) => {
    const btn = document.getElementById('smartPdfAddBtn');
    if (!btn) return { ok: false, why: 'no btn' };
    btn.click();
    const menu = document.getElementById('smartPdfAddMenu');
    if (!menu) return { ok: false, why: 'no menu' };
    const item = menu.querySelector('.smart-pdf-add-item[data-add="' + t + '"]');
    if (!item) return { ok: false, why: 'no item ' + t };
    item.click();
    return { ok: true };
  }, type);
}
async function markViaMenu(kind) {
  return await page.evaluate((k) => {
    const btn = document.getElementById('smartPdfMarkBtn');
    if (!btn) return { ok: false, why: 'no mark btn' };
    btn.click();
    const menu = document.getElementById('smartPdfMarkMenu');
    if (!menu) return { ok: false, why: 'no menu' };
    const item = menu.querySelector('.smart-pdf-mark-item[data-mark="' + k + '"]');
    if (!item) return { ok: false, why: 'no item ' + k };
    item.click();
    return { ok: true };
  }, kind);
}
async function selectPageText(pg) {
  return await page.evaluate((p) => {
    const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="' + p + '"]');
    const sp = wrap && wrap.querySelector('.smart-pdf-text');
    if (!sp) return { ok: false, why: 'no text span' };
    const r = document.createRange(); r.selectNodeContents(sp);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    return { ok: true, text: sel.toString().slice(0, 40) };
  }, pg);
}
async function markState() {
  return await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('#smartPdfEditor .smart-pdf-overlay')];
    return {
      count: boxes.length,
      kinds: boxes.map((b) => (b.className.match(/smart-pdf-ov-([a-z-]+)/) || [])[1]).join(','),
      store: (window.__smartImport && window.__smartImport.overlays()) || {}
    };
  });
}
async function drawStroke(pg, xs, ys) {
  return await page.evaluate((p, Xs, Ys) => {
    const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="' + p + '"]');
    if (!wrap) return false;
    const r = wrap.getBoundingClientRect();
    wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + Xs[0], clientY: r.top + Ys[0], pointerId: 7, isPrimary: true }));
    for (let i = 1; i < Xs.length; i++) wrap.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + Xs[i], clientY: r.top + Ys[i], pointerId: 7, isPrimary: true }));
    wrap.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: r.left + Xs[Xs.length - 1], clientY: r.top + Ys[Ys.length - 1], pointerId: 7, isPrimary: true }));
    return true;
  }, pg, xs, ys);
}
async function finishDraw() {
  return await page.evaluate(() => {
    const b = document.querySelector('#smartPdfEditor .smart-pdf-mark-draw-hint [data-mkdone]');
    if (!b) return false;
    b.click(); return true;
  });
}
async function addComment(text) {
  await markViaMenu('comment');
  await sleep(250);
  return await page.evaluate((tx) => {
    const ta = document.getElementById('smartPdfMkCommentText');
    if (!ta) return { ok: false, why: 'no textarea' };
    ta.value = tx;
    const btn = document.querySelector('.smart-pdf-mkpop [data-mkadd]');
    if (!btn) return { ok: false, why: 'no add btn' };
    btn.click();
    return { ok: true };
  }, text);
}
async function exportPdf() {
  return await page.evaluate(async () => {
    const blob = await window.__smartImport.editedBlob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { b64: btoa(bin), head: bin.slice(0, 5), size: buf.length };
  });
}
async function setViewport(w, h) { await page.setViewport({ width: w, height: h }); await sleep(350); }
