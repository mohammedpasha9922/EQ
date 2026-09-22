import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8').replace(/\r\n/g, '\n');
const lines = s.split('\n');

// translations opens at line 354: "const translations = {"  (depth 1)
// Each lang block like "  en: {" opens depth 2
// Each lang block closes when depth returns to 1
// findBlockEnd starts at startLine, counts from depth 1 (already inside translations)
function findBlockEnd(startLine, targetDepth) {
  let depth = 1; // we're already inside the translations object
  // Count braces on the start line
  for (const ch of lines[startLine - 1]) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  // Now scan from next line
  for (let i = startLine; i < lines.length; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === targetDepth) return i;
  }
  return -1;
}

// en: { at line 355, depth becomes 2, en closes when depth returns to 1
const enEnd = findBlockEnd(355, 1);
console.log('en block ends at line', enEnd + 1);

// Count keys in en block (4-space indent, key followed by colon)
let enKeys = [];
for (let i = 356; i < enEnd; i++) {
  const m = lines[i].match(/^(\s{4})(\w+)\s*:/);
  if (m) enKeys.push(m[2]);
}
console.log('en key count:', enKeys.length);
console.log('first 5:', enKeys.slice(0,5));
console.log('last 5:', enKeys.slice(-5));

// Now check all blocks
const blockStarts = [
  {name:'en', start: 355},
  {name:'es', start: 857},
  {name:'ar', start: 1357},
  {name:'fr', start: 1856},
  {name:'ru', start: 2356},
  {name:'de', start: 2856},
  {name:'tr', start: 3357}
];
for (const b of blockStarts) {
  const end = findBlockEnd(b.start, 1);
  let keys = [];
  for (let i = b.start + 1; i < end; i++) {
    const m = lines[i].match(/^(\s{4})(\w+)\s*:/);
    if (m) keys.push(m[2]);
  }
  const missing = enKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !enKeys.includes(k));
  console.log(b.name, ': lines', b.start, 'to', end + 1, '| key count:', keys.length, '| missing:', missing.length, '| extra:', extra.length);
  if (missing.length > 0) console.log('  missing:', missing.join(', '));
  if (extra.length > 0) console.log('  extra:', extra.join(', '));
}

