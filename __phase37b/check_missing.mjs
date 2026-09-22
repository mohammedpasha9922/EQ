import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8').replace(/\r\n/g, '\n');
const lines = s.split('\n');

function findBlockEnd(startLine, targetDepth) {
  let depth = 1; // we're already inside the translations object
  for (const ch of lines[startLine - 1]) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
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

// Extract keys from each block
const blocks = [
  { name: 'en', start: 355 },
  { name: 'es', start: 857 },
  { name: 'ar', start: 1357 },
  { name: 'fr', start: 1856 },
  { name: 'ru', start: 2356 },
  { name: 'de', start: 2856 },
  { name: 'tr', start: 3357 }
];

for (const b of blocks) {
  const end = findBlockEnd(b.start, 1);
  let keys = [];
  for (let i = b.start + 1; i < end; i++) {
    const m = lines[i].match(/^(\s{4})(\w+)\s*:/);
    if (m) keys.push(m[2]);
  }
  // Remove duplicates
  const uniqueKeys = [...new Set(keys)];
  b.keys = keys;
  b.unique = uniqueKeys;
  b.end = end;
  console.log(b.name, ': lines', b.start, '-', end + 1, '| total keys:', keys.length, '| unique:', uniqueKeys.length);
  
  // Check for duplicates
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dupes.length > 0) console.log('  duplicates:', [...new Set(dupes)]);
}

// en has 468 unique keys
const enKeys = blocks.find(b => b.name === 'en').unique;
console.log('\nen unique keys:', enKeys.length);

// Check missing from each non-en block
for (const b of blocks.filter(b => b.name !== 'en')) {
  const missing = enKeys.filter(k => !b.keys.includes(k));
  console.log(b.name, 'missing from en:', missing.length);
  if (missing.length <= 5) console.log('  missing:', missing.join(', '));
}

// Now check missing_keys.txt - it has 260 keys
const missingLines = fs.readFileSync('__phase37b/missing_keys.txt', 'utf8').replace(/\r\n/g, '\n').split('\n').filter(l => l.trim()).map(l => l.trim());
console.log('\nmissing_keys.txt count:', missingLines.length);

// Which block are these missing from?
const trKeys = blocks.find(b => b.name === 'tr').keys;
const arKeys = blocks.find(b => b.name === 'ar').keys;
const trMissing = missingLines.filter(k => !trKeys.includes(k));
const arMissing = missingLines.filter(k => !arKeys.includes(k));
console.log('missing_keys.txt keys NOT in tr:', trMissing.length);
console.log('missing_keys.txt keys NOT in ar:', arMissing.length);

// So missing_keys.txt = keys in en_kv_full (625) but not in some block
const enkv = JSON.parse(fs.readFileSync('__phase37b/en_keys.json', 'utf8'));
const enkvKeys = Object.keys(env);
const inEnkvNotInTr = enkvKeys.filter(k => !trKeys.includes(k));
const inEnkvNotiAr = enkvKeys.filter(k => !arKeys.includes(k));
console.log('\nKeys in en_keys.json (625) but NOT in tr:', inEnkvNotInTr.length);
console.log('Keys in en_keys.json (625) but NOT in ar:', inEnkvNotiAr.length);
console.log('Sample:', inEnkvNotInTr.slice(0, 10).join(', '));
