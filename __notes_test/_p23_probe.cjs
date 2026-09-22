const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
function line(off) { return s.slice(0, off + 1).split('\n').length; }
let idx = [];
let i = -1;
while ((i = s.indexOf('smartPdfAddTable:', i + 1)) !== -1) idx.push(i);
console.log('count smartPdfAddTable:', idx.length);
for (const p of idx) {
  const b = s.lastIndexOf('smartImportTitle:', Math.max(0, p - 4000));
  console.log('line', line(p), 'title@', line(b));
}
// language block order markers
for (const k of ['smartImportTitle:', 'smartScanReviewNote:', 'smartPdfAddTable:']) {
  let cnt = 0; let j = -1;
  while ((j = s.indexOf(k, j + 1)) !== -1) cnt++;
  console.log(k, 'occurs', cnt);
}