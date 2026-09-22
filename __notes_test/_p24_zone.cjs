const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const L = s.split('\n');
// dump regions containing PART 24 markers within the pdf-editor zone (>400000 offset)
const zones = [];
L.forEach((l, i) => { if (l.includes('PART 24') && i > 16000) zones.push(i + 1); });
console.log('PART24 comment lines (line numbers):', zones.join(','));
const first = zones[0] - 1, last = zones[zones.length - 1];
for (let i = first; i < last + 3 && i < L.length; i++) console.log((i + 1) + ': ' + L[i].trim().slice(0, 150));
