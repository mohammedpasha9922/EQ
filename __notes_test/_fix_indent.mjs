import fs from 'fs';
const f = 'd:/Programs EQ7/EQ/app.js';
let L = fs.readFileSync(f, 'utf8').split('\n');
const idx = L.findIndex(l => l.trim() === "smartScanReviewNote: 'Document recognized. Review the content before creating the PDF.',");
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }
if (!L[idx].startsWith('    smartScanReviewNote')) L[idx] = '    ' + L[idx].trim();
fs.writeFileSync(f, L.join('\n'));
console.log('FIXED line ' + (idx + 1));