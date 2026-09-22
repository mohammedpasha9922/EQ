await selectPageText(1);
await markViaMenu('underline');
await sleep(350);
st = await markState();
check('P24-09 Mark > Underline creates underline overlay', st.kinds.indexOf('mark-underline') >= 0, st.kinds);
const ulModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'underline'); if (o) return { page: o.page, hasXYW: [o.x, o.y, o.w].every(Number.isFinite), color: o.color }; }
  return null;
});
check('P24-10 underline model is structured + bound to page 2', !!ulModel && ulModel.page === 1 && ulModel.hasXYW, ulModel);
// --- Draw on page 1 ---
const drawMode = await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page[data-page="0"]');
  wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
  return true;
});
await sleep(100);
await markViaMenu('draw');
await sleep(250);
const drawModeOk = await page.evaluate(() => {
  const wrap = document.querySelector('#smartPdfEditor .smart-pdf-page.smart-pdf-mark-draw');
  return { active: !!wrap, hint: !!document.querySelector('#smartPdfEditor .smart-pdf-mark-draw-hint') };
});
check('P24-11 Mark > Draw activates draw mode with hint', drawModeOk.active && drawModeOk.hint, drawModeOk);
await drawStroke(0, [60, 90, 120, 150], [120, 140, 160, 180]);
await sleep(200);
let drModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'draw'); if (o) return { page: o.page, strokes: (o.strokes || []).length, pts: o.strokes && o.strokes[0] ? o.strokes[0].points.length : 0 }; }
  return null;
});
check('P24-12 Draw produces structured vector stroke data (points, not screenshot)', !!drModel && drModel.strokes >= 1 && drModel.pts >= 3, drModel);
check('P24-13 Draw annotation is bound to page 1', !!drModel && drModel.page === 0, drModel);
const svgs = await page.evaluate(() => document.querySelectorAll('#smartPdfEditor .smart-pdf-ov-mark-draw svg').length);
check('P24-14 draw preview renders as inline SVG (no canvas/img)', svgs >= 1, svgs);
await finishDraw();
await sleep(150);
const drawOff = await page.evaluate(() => !document.querySelector('#smartPdfEditor .smart-pdf-page.smart-pdf-mark-draw'));
check('P24-15 Done exits draw mode cleanly', drawOff, '');
// --- Comment on page 2 ---
const cm = await addComment('P24 comment');
await sleep(350);
st = await markState();
check('P24-16 Mark > Comment saves a structured comment annotation (small popover, no alert)', cm.ok === true && st.kinds.indexOf('mark-comment') >= 0, { cm, kinds: st.kinds });
const cmModel = await page.evaluate(() => {
  const ov = (window.__smartImport && window.__smartImport.overlays()) || {};
  for (const pk in ov) { const o = (ov[pk] || []).find((x) => x && x.type === 'comment'); if (o) return { page: o.page, x: o.x, y: o.y, text: o.text }; }
  return null;
});
check('P24-17 comment model = {page,x,y,text} on page 2', !!cmModel && cmModel.page === 1 && cmModel.text === 'P24 comment', cmModel);
await page.evaluate(() => { const d = document.querySelector('#smartPdfEditor .smart-pdf-ov-mark-comment .smart-pdf-mkdot'); if (d) d.click(); });
await sleep(300);
const cmOpen = await page.evaluate(() => {
  const ta = document.getElementById('smartPdfMkCommentText');
  return { open: !!ta, value: ta ? ta.value : '' };
});
check('P24-18 comment marker re-opens its text for viewing/editing', cmOpen.open && cmOpen.value === 'P24 comment', cmOpen);
await page.evaluate(() => { const c = document.querySelector('.smart-pdf-mkpop [data-mkcancel]'); if (c) c.click(); });
await sleep(150);
