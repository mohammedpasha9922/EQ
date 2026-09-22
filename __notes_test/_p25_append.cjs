// PART 25 section append — model, ops, pass2 builder, rot-aware overlay drawer, UI.
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
if (s.indexOf('PART 25 — PDF Pages') >= 0) { console.log('PART25 already present'); process.exit(0); }
const section = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_p25_section.txt', 'utf8');
s = s.replace(/\r?\n$/, '\r\n') + '\r\n' + section;
fs.writeFileSync(P, s);
console.log('PART25 appended. length', s.length);
