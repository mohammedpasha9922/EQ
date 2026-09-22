const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const i = s.indexOf("getElementById('smartPdfMarkBtn')");
const j = s.indexOf('addEventListener', i);
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p25_b6.txt', s.slice(j - 300, j + 1400));
console.log('ok', j);
