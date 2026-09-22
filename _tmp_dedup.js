// Rebuild the recovery zone cleanly (line-exact, no brace parsing).
const fs = require('fs');
const cur = fs.readFileSync('app.js', 'utf8').split('\n');
const base = fs.readFileSync('_adbar_base/app.js', 'utf8').split('\n');

// 1) locate zone start: first inserted 'function addFolder() {'
let zs = -1;
for (let i = 0; i < cur.length; i++) { if (cur[i] === 'function addFolder() {') { zs = i; break; } }
// 2) locate NOTE HEADINGS banner block start at/after zs
let be = -1;
for (let i = zs; i < cur.length; i++) {
  if (/^\/\/ NOTE HEADINGS \+ LISTS \(PHASE 03\)/.test(cur[i])) { be = i; break; }
}
while (be > 0 && cur[be - 1].startsWith('// =')) be--;
// keep one blank line between prior code and the banner
let zEnd = be;
if (zEnd > 0 && cur[zEnd - 1].trim() === '') zEnd--;
if (zs < 0 || be < 0) { console.error('zone markers not found', zs, be); process.exit(1); }

// 3) source cluster: _adbar_base 15568..15898 (1-based) = addFolder..buildNoteBodyHTML end
const SRC_START = 15568, SRC_END = 15898; // 1-based inclusive
if (!/^function addFolder\(\)/.test(base[SRC_START - 1]) || !/^function buildNoteBodyHTMLWithBlocks/.test(base[SRC_END])) {
  console.error('source cluster boundary failed:', JSON.stringify(base[SRC_START - 1]), JSON.stringify(base[SRC_END]));
  process.exit(1);
}
const cluster = base.slice(SRC_START - 1, SRC_END);

cur.splice(zs, zEnd - zs, ...cluster);
fs.writeFileSync('app.js', cur.join('\n'));
console.log('Zone', zs + 1, '..', zEnd, 'replaced with', cluster.length, 'cluster lines; file now', cur.length, 'lines');

const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
// block starts at the line '// Recovered Notes helpers/functions' or first function 'function addFolder('
// The FIRST inserted block begins at line 7539 (1-based). Second copy begins at 7804 (1-based) in the doubled file.
// Verify boundaries then remove lines 7804..(7804+blockLen-1).
const firstStart = 7538; // 0-based
const secondStart = 7803; // 0-based
// find block length: from firstStart, the block ends right before the 'NOTE HEADINGS' banner-ish region
// safer: count lines of first block = secondStart - firstStart (second copy inserted contiguous same length)
const len = secondStart - firstStart;
// sanity: the line at secondStart should equal the line at firstStart
if (lines[firstStart] !== lines[secondStart]) {
  console.error('Dedup boundary failed:', JSON.stringify(lines[firstStart]), '<->', JSON.stringify(lines[secondStart]));
  process.exit(1);
}
// also sanity: the block before each should be blank-ish
lines.splice(secondStart, len);
fs.writeFileSync('app.js', lines.join('\n'));
console.log('Removed duplicate block of', len, 'lines; file now', lines.length);
