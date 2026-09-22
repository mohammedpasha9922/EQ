const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const T = (f) => fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/' + f, 'utf8');

// 1) smartPdfMarkSvgHtml
{ const a = s.indexOf('function smartPdfMarkSvgHtml'); const b = s.indexOf('function smartPdfMarkRenderOverlay', a);
  if (a < 0 || b < 0) { console.log('SVG FAIL'); process.exit(1); }
  s = s.slice(0, a) + T('_p24_newsvg.txt').replace(/\r?\n$/, '') + s.slice(b); }

// 2) smartPdfMarkFinalizeDraw before StartDraw
{ const i = s.indexOf('function smartPdfMarkStartDraw()');
  if (i < 0) { console.log('STARTDRAW FAIL'); process.exit(1); }
  s = s.slice(0, i) + T('_p24_newfinalize.txt').replace(/\r?\n$/, '') + '\n\n' + s.slice(i); }

// 3) onUp -> finalize (offset based, CRLF safe)
{ const key = "const o = { type: 'draw', id: smartPdfMarkNextId(), page: smartPdfMarkDrawState.page, w: 200, strokes: [st], color: st.color || '#1d4ed8', borderWidth: 2 };";
  const k = s.indexOf(key); if (k < 0) { console.log('KEYLINE FAIL'); process.exit(1); }
  const stLine = s.indexOf('smartPdfOverlayStore(o.page, o);', k);
  const rdLine = s.indexOf('smartPdfRenderOverlays();', stLine);
  if (stLine < 0 || rdLine < 0) { console.log('STORE/RENDER FAIL'); process.exit(1); }
  const rdEnd = rdLine + 'smartPdfRenderOverlays();'.length;
  const repl = "const o = smartPdfMarkFinalizeDraw(st.points, st.color);\n      if (o) { smartPdfOverlayStore(o.page, o); smartPdfRenderOverlays(); }";
  s = s.slice(0, k) + repl + s.slice(rdEnd); }

// 4) dot handler string id
{ const oldDot = "smartPdfOverlayFind(page, Number(box.dataset.id))";
  const i = s.indexOf(oldDot); if (i < 0) { console.log('DOT FAIL'); process.exit(1); }
  s = s.slice(0, i) + "smartPdfOverlayFind(page, box.dataset.id)" + s.slice(i + oldDot.length); }

fs.writeFileSync(p, s);
console.log('ALL FIXES APPLIED');
console.log('svg defs:', s.split('function smartPdfMarkSvgHtml').length - 1);
console.log('finalize defs:', s.split('function smartPdfMarkFinalizeDraw').length - 1);
console.log('finalize call in onUp:', s.split('smartPdfMarkFinalizeDraw(st.points').length - 1);
console.log('dot string id:', s.split('smartPdfOverlayFind(page, box.dataset.id)').length - 1);
console.log('old inline draw gone:', s.indexOf("const o = { type: 'draw', id: smartPdfMarkNextId(), page: smartPdfMarkDrawState.page, w: 200,") < 0);