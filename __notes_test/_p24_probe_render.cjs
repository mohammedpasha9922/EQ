const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const keys = ['Re-render mark overlays', 'smartPdfRenderOverlaysP24', '_p24OrigRender',
  'smartPdfMarkRenderOverlay', 'smart-pdf-mkfill', 'smart-pdf-mkline', 'smart-pdf-mkdot', 'smart-pdf-mkdraw'];
for (const k of keys) console.log(k, '->', s.split(k).length - 1);
// show base render switch mark cases context
const ri = s.indexOf('function smartPdfRenderOverlays');
console.log('--- base render switch ---');
const seg = s.slice(ri, ri + 1700);
const lc = seg.split('\n');
lc.forEach((l, i) => { if (/case 'highlight'|case 'underline'|case 'draw'|case 'comment'/.test(l)) console.log('  ' + l.trim().slice(0, 160)); });