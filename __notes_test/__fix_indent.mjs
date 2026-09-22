import fs from 'node:fs';
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  if (ln.includes("btn.setAttribute('aria-label', preset.name);")) {
    lines[i] = '          btn.setAttribute(\'aria-label\', preset.name);';
    console.log('fixed line ' + (i + 1));
  }
}
fs.writeFileSync(p, lines.join('\n'));
console.log('fix OK');
