const fs = require('fs');
const L = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8').split('\n');
let found = -1;
for (let i = 0; i < L.length; i++) if (L[i].includes('smartPdfAddClose();')) found = i;
console.log('smartPdfAddClose(); line idx', found);
if (found > 0) { for (let i = found; i >= 0 && i > found - 30; i--) { if (/function |const \w+ = async|=> \{|^function/.test(L[i])) { console.log('surrounding fn line', (i + 1) + ': ' + L[i].trim().slice(0, 110)); } } }
