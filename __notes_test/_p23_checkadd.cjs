const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/index.html', 'utf8');
const i = s.indexOf('id="smartPdfAddMenu"');
const seg = s.slice(i, s.indexOf('</div>', i));
const m = [...seg.matchAll(/data-add="([a-z]+)"/g)].map((x) => x[1]);
console.log('smartPdfAddMenu items:', m.length, '->', m.join(' '));