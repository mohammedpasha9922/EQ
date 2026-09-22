const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const anchor = "function smartPdfMarkRenderOverlay(page, o) {";
const idx = s.indexOf(anchor);
if (idx < 0) { console.log('RENDER OVERLAY ANCHOR NOT FOUND'); process.exit(1); }
const posRef = s.indexOf('smartPdfMarkShowComment(o);', idx);
if (posRef < 0) { console.log('COMMENT REF NOT FOUND'); process.exit(1); }
const closeFor = s.indexOf('  }', posRef);
if (closeFor < 0) { console.log('FOR CLOSE NOT FOUND'); process.exit(1); }
const closeFn = s.indexOf('}', closeFor + 3);
if (closeFn < 0) { console.log('FN CLOSE NOT FOUND'); process.exit(1); }
const insertPos = closeFn + 1;
const block = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_p24_block2.txt', 'utf8');
s = s.slice(0, insertPos) + block + s.slice(insertPos);
fs.writeFileSync(p, s);
console.log('Inserted block2 at offset', insertPos);
['smartPdfMarkStartDraw','smartPdfMarkDone','smartPdfMarkClose','smartPdfMarkCloseComment','smartPdfMarkShowComment','smartPdfMarkAdd','smartPdfMarkApply','smartPdfMarkNextId'].forEach(k => {
  console.log(k, '->', s.split('function '+k).length-1, 'defs');
});
console.log('MarkMenu.addEventListener count:', s.split('smartPdfMarkMenu.addEventListener').length-1);
