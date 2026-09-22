const fs = require('fs');
const L = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8').split('\n');
const hits = [];
L.forEach((l, i) => { if (/smartPdfMark|data-mark|markWrap/.test(l)) hits.push((i + 1) + ': ' + l.trim().slice(0, 110)); });
console.log(hits.join('\n'));
