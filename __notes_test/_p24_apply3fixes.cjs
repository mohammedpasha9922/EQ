const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const T = (f) => fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/' + f, 'utf8');

// 1) replace smartPdfMarkSvgHtml
{
  const a = s.indexOf('function smartPdfMarkSvgHtml');
  const b = s.indexOf('function smartPdfMarkRenderOverlay', a);
  if (a < 0 || b < 0) { console.log('SVG MARKERS FAIL'); process.exit(1); }
  s = s.slice(0, a) + T('_p24_newsvg.txt').replace(/\r?\n$/, '') + s.slice(b);
}

// 2) add smartPdfMarkFinalizeDraw right before smartPdfMarkStartDraw
{
  const anchor = 'function smartPdfMarkStartDraw()';
  const i = s.indexOf(anchor);
  if (i < 0) { console.log('STARTDRAW MARKER FAIL'); process.exit(1); }
  s = s.slice(0, i) + T('_p24_newfinalize.txt').replace(/\r?\n$/, '') + '\n\n' + s.slice(i);
}

// 3) onUp uses finalize
{
  const oldOnUp = `  const onUp = () => {
    if (!smartPdfMarkDrawState || !smartPdfMarkDrawState.active) return;
    const st = smartPdfMarkDrawState.cur;
    if (st && st.points && st.points.length >= 2) {
      const o = { type: 'draw', id: smartPdfMarkNextId(), page: smartPdfMarkDrawState.page, w: 200, strokes: [st], color: st.color || '#1d4ed8', borderWidth: 2 };
      smartPdfOverlayStore(o.page, o);
      smartPdfRenderOverlays();
    }
    smartPdfMarkDrawState.cur = null;
    smartPdfMarkDrawState.started = false;
  };`;
  const newOnUp = `  const onUp = () => {
    if (!smartPdfMarkDrawState || !smartPdfMarkDrawState.active) return;
    const st = smartPdfMarkDrawState.cur;
    if (st && st.points && st.points.length >= 2) {
      const o = smartPdfMarkFinalizeDraw(st.points, st.color);
      if (o) { smartPdfOverlayStore(o.page, o); smartPdfRenderOverlays(); }
    }
    smartPdfMarkDrawState.cur = null;
    smartPdfMarkDrawState.started = false;
  };`;
  if (s.indexOf(oldOnUp) < 0) { console.log('ONUP MATCH FAIL'); process.exit(1); }
  s = s.replace(oldOnUp, newOnUp);
}

// 4) dot handler id string
{
  const oldDot = "smartPdfOverlayFind(page, Number(box.dataset.id))";
  const newDot = "smartPdfOverlayFind(page, box.dataset.id)";
  if (s.indexOf(oldDot) < 0) { console.log('DOT MATCH FAIL'); process.exit(1); }
  s = s.replace(oldDot, newDot);
}

fs.writeFileSync(p, s);
console.log('ALL FIXES APPLIED');
console.log('svg defs:', s.split('function smartPdfMarkSvgHtml').length - 1);
console.log('finalize defs:', s.split('function smartPdfMarkFinalizeDraw').length - 1);
console.log('onUp finalize call:', s.split('smartPdfMarkFinalizeDraw(st.points').length - 1);
console.log('dot string id:', s.split('smartPdfOverlayFind(page, box.dataset.id)').length - 1);