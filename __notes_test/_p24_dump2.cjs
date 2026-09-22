const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const L = s.split('\n');
const idx = [];
L.forEach((l, i) => { if (l.includes('PART 24')) idx.push(i + 1); });
console.log('PART 24 lines:', idx.join(','));
// dump from first to last+80
const a = idx[0] - 2, b = idx[idx.length - 1] + 40;
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p24_blockdump.txt', L.slice(a, b).map((l, i) => (a + i + 1) + ': ' + l).join('\n'));
console.log('dumped lines', a + 1, '..', b);
