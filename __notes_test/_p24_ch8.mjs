// responsive + RTL/LTR + a11y + touch + finalize chunk
const resp = [];
for (const w of [1366, 768, 430, 390]) {
  await setViewport(w, 850);
  const r = await page.evaluate(() => {
    const btn = document.getElementById('smartPdfMarkBtn');
    btn.click();
    const m = document.getElementById('smartPdfMarkMenu');
    const mr = m.getBoundingClientRect();
    const out = { open: !m.hasAttribute('hidden'), inX: mr.left >= 0 && mr.right <= window.innerWidth && mr.width > 50 };
    m.setAttribute('hidden', '');
    return out;
  });
  resp.push({ w, ...r });
}
check('P24-35 Mark menu usable + inside viewport at 1366/768/430/390', resp.every((r) => r.open && r.inX), resp);
await setViewport(1366, 900);
// --- RTL ---
await page.evaluate(() => { localStorage.setItem('eq-language', 'ar'); });
await page.reload({ waitUntil: 'load' }); await sleep(800);
await openPdfEditor();
await sleep(400);
const rtl = await page.evaluate(() => {
  const b = document.getElementById('smartPdfMarkBtn');
  b.click();
  const m = document.getElementById('smartPdfMarkMenu');
  const items = [...m.querySelectorAll('.smart-pdf-mark-item')];
  const r = m.getBoundingClientRect();
  const wrapR = document.getElementById('smartPdfMarkWrap').getBoundingClientRect();
  const out = {
    dir: document.documentElement.getAttribute('dir'),
    labels: items.map((i) => (i.textContent || '').trim()).join('|'),
    near: Math.abs(r.left - wrapR.left) < 60 || Math.abs(r.right - wrapR.right) < 60,
    expanded: b.getAttribute('aria-expanded')
  };
  m.setAttribute('hidden', '');
  return out;
});
check('P24-36 RTL: Arabic Mark labels from existing i18n + menu anchored to button', rtl.dir === 'rtl' && rtl.labels.split('|').length === 4 && rtl.near, rtl);
await selectPageText(0);
await markViaMenu('highlight');
await sleep(350);
const rtlHl = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'highlight'); if (o) return { page: o.page, x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w) }; }
  return null;
});
check('P24-37 RTL highlight coordinates valid (not mirrored/negative)', !!rtlHl && rtlHl.x >= 0 && rtlHl.y >= 0 && rtlHl.w > 0 && rtlHl.page === 0, rtlHl);
// --- LTR restore ---
await page.evaluate(() => { localStorage.setItem('eq-language', 'en'); });
await page.reload({ waitUntil: 'load' }); await sleep(800);
const ltr = await page.evaluate(() => ({ dir: document.documentElement.getAttribute('dir') }));
check('P24-38 LTR restored', ltr.dir !== 'rtl', ltr);
// --- accessibility ---
const a11y = await page.evaluate(() => {
  const btn = document.getElementById('smartPdfMarkBtn');
  btn.click();
  const m = document.getElementById('smartPdfMarkMenu');
  const items = [...m.querySelectorAll('.smart-pdf-mark-item')];
  const out = {
    haspopup: btn.getAttribute('aria-haspopup') === 'true' || btn.hasAttribute('aria-haspopup'),
    expanded: btn.getAttribute('aria-expanded'),
    itemsRole: items.every((i) => i.getAttribute('role') === 'menuitem'),
    focusable: items.every((i) => i.tagName === 'BUTTON')
  };
  m.setAttribute('hidden', '');
  return out;
});
check('P24-39 Mark controls are keyboard/click accessible (button + menuitem roles + aria-expanded)', a11y.haspopup && a11y.expanded === 'true' && a11y.itemsRole && a11y.focusable, a11y);
// --- touch/coarse pointer draw ---
await setViewport(430, 850);
await markViaMenu('draw');
await sleep(250);
await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="0"]');
  const r = wrap.getBoundingClientRect();
  wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: r.left + 40, clientY: r.top + 90, pointerId: 9, isPrimary: true }));
  wrap.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: r.left + 90, clientY: r.top + 130, pointerId: 9, isPrimary: true }));
  wrap.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: r.left + 140, clientY: r.top + 110, pointerId: 9, isPrimary: true }));
  wrap.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: r.left + 140, clientY: r.top + 110, pointerId: 9, isPrimary: true }));
});
await sleep(200);
await finishDraw();
const touchDraw = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  let n = 0; for (const pk in ov) n += (ov[pk] || []).filter((x) => x && x.type === 'draw').length;
  return n;
});
check('P24-40 touch (pointerType=touch) drawing produces strokes', touchDraw >= 2, touchDraw);
check('P24-41 no new JS errors across the whole run', realErrs.length === 0, realErrs.slice(0, 3));
// persistence note: in-memory session model (same as PART 19-23); draft storage is Smart-Documents-only and untouched
console.log('DONE p=' + pass + ' f=' + fail + ' nv=' + notVerified + ' pre=' + preexisting);
await browser.close();
server.close();
fs.writeFileSync(path.join(HERE, 'p24_results.txt'), LOG.join('\n') + '\nRESULTS_JSON=' + JSON.stringify({ pass, fail, not_verified: notVerified, preexisting }) + '\nERRORS=' + JSON.stringify(realErrs) + '\n');
