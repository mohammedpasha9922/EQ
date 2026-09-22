import fs from 'node:fs';
const t = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/p12_professional.mjs', 'utf8');
const lines = t.split('\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/^\s*try \{/.test(l) || /catch\s*\(/.test(l) || /^const now/.test(l) || /^const seed/.test(l) || /^const t22/.test(l) || /console\.log\('---/.test(l) || /RESULTS_JSON=\{\}/.test(l)) {
    console.log((i + 1) + ': ' + l.trim());
  }
}