const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const i = s.indexOf('function smartPdfOverlayBox');
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p24_box.txt', s.slice(i, i + 3400));
const j = s.indexOf("} else if (o.type === 'image' && o.dataUrl) {");
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p24_exp.txt', s.slice(j - 200, j + 1400));
console.log('ok', i, j);
