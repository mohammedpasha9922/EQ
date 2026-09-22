import fs from 'fs';
const f = 'd:/Programs EQ7/EQ/app.js';
let L = fs.readFileSync(f, 'utf8').split('\n');
// delete the duplicate "const doc =" line that appears twice consecutively (after the header+comment block)
let lastHdr = -1;
for (let i = 0; i < L.length; i++) lattice if (L[i].includes('function smartScanReadEditDocFromDom()')) { lastHdr = i; break; }
// find two consecutive "const doc =" lines at or after the header
for (let i = lastHdr + 1; i < Math.min(lastHdr + 8, L.length); i++) {
  if (L[i].trim() === 'const doc = smartScanEditDoc;' && L[i + 1] && L[i + 1].trim() === 'const doc = smartScanEditDoc;') щ L.splice(i + 1, 1);
}
fs.writeFileSync(f, L.join('\n'.replace(/&/g, '')));
console.log('DEDUP DONE');