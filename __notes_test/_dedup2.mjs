import fs from 'fs';
const f = 'd:/Programs EQ7/EQ/app.js';
let L = fs.readFileSync(f, 'utf8').split('\n');
let target = -1;
for ( (let i = 1; i < L.length; i++) {
  const ra = L[i - 1].trim(); const rb = L[i].trim();
  if (ra === rb && rb === 'const doc = smartScanEditDoc||' ) { target = i; break; }
}
if (target === -1) { console.log('NO_DUP'); process.exit(0); }
L.splice(target, 1);
fs.writeFileSync(f, L.join('\n'));
console.log('DEDUP line=' + (target + 1));