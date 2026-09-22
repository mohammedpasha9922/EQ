const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/index.html';
let s = fs.readFileSync(p, 'utf8');
const m = [...s.matchAll(/<button[^>]*data-mark="([a-z]+)"[^>]*>/g)].map((x) => x[1]);
console.log('mark items:', m.join(','));
const i = s.indexOf('smartPdfMarkMenu');
console.log(JSON.stringify(s.slice(i - 400, i + 1600)));
