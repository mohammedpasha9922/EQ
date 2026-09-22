import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8');
const lines = s.split('\n');

console.log('Line 355:', JSON.stringify(lines[354]));
console.log('Line 356:', JSON.stringify(lines[355]));
console.log('Line 357:', JSON.stringify(lines[356]));

// Trace braces on first few lines
let depth = 0;
for (let i = 354; i < 360; i++) {
  const l = lines[i];
  for (const ch of l) {
    if (ch === '{') { depth++; console.log('  line', i+1, 'depth now', depth); }
    if (ch === '}') { depth--; console.log('  line', i+1, 'depth now', depth); }
  }
}

// The translations object itself opens at line 354: "const translations = {"
// en: { at line 355 opens another { 
// So depth goes: 1 (translations), 2 (en)
// The en block ends when depth returns to 1 (not 0)
function findBlockEnd(startLine, targetDepth) {
  let depth = 0;
  for (let i = startLine - 1; i < lines.length; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth === targetDepth && i >= startLine - 1) return i;
    }
  }
  return -1;
}

// translations opened at line 354, depth becomes 1
// en opens at line 355, depth becomes 2
// en closes when depth returns to 1
const enEnd = findBlockEnd(355, 1);
console.log('en block ends at line', enEnd + 1);

// Count keys in en block (4-space indent)
let enKeys = [];
for (let i = 356; i < enEnd; i++) {
  const m = lines[i].match(/^\s{4}(\w+)\s*:/);
  if (m) enKeys.push(m[1]);
}
console.log('en key count:', enKeys.length);
console.log('first 5:', enKeys.slice(0,5));
console.log('last 5:', enKeys.slice(-5));

// Now do all blocks
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
    const m = lines[i].match(/^\s{4}(\w+)\s*:/);
    if (m) keys.push(m[1]);
  }
  console.log(b.name, ': lines', b.start, 'to', end + 1, '| key count:', keys.length);
  console.log('  last 3:', keys.slice(-3));
}