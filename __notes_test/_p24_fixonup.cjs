const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const keyLine = "const o = { type: 'draw', id: smartPdfMarkNextId(), page: smartPdfMarkDrawState.page, w: 200, strokes: [st], color: st.color || '#1d4ed8', borderWidth: 2 };";
const k = s.indexOf(keyLine);
if (k < 0) { console.log('KEYLINE FAIL'); process.exit(1); }
// find the "smartPdfOverlayStore(o.page, o);" and "smartPdfRenderOverlays();" after it
const stLine = s.indexOf('smartPdfOverlayStore(o.page, o);', k);
if (stLine < 0) { console.log('STORE FAIL'); process.exit(1); }
const rdLine = s.indexOf('smartPdfRenderOverlays();', stLine);
if (rdLine < 0) { console.log('RENDER FAIL'); process.exit(1); }
const rdEnd = rdLine + 'smartPdfRenderOverlays();'.length;
const replacement = "const o = smartPdfMarkFinalizeDraw(st.points, st.color);\n      if (o) { smartPdfOverlayStore(o.page, o); smartPdfRenderOverlays(); }";
s = s.slice(0, k) + replacement + s.slice(rdEnd);
fs.writeFileSync(p, s);
console.log('onUp fixed; finalize call:', s.split('smartPdfMarkFinalizeDraw(st.points').length - 1);
console.log('old inline draw gone:', s.indexOf(keyLine) < 0);