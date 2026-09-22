// Temporary inspection helper (not part of the product). Reads app.js and reports
// the Notes PDF print CSS facts needed to align test assertions with reality.
const fs = require('fs');
const lines = fs.readFileSync('D:/Programs EQ7/EQ/app.js', 'utf8').split(/\r?\n/);
const pats = [
  'unicode-bidi', 'direction:', 'text-align: start', 'text-align:start',
  'padding-inline-start', 'padding-inline-end', '@page', 'eq-pdf-text-block',
  'eq-pdf-note-doc', 'dir="auto"', 'break-inside', 'page-break-inside'
];
const out = [];
lines.forEach((l, i) => {
  for (const p of pats) {
    if (l.indexOf(p) !== -1) { out.push((i + 1) + ': ' + l.trim().slice(0, 220)); break; }
  }
});
fs.writeFileSync(process.env.TEMP + '/np_css.txt', out.join('\n'), 'utf8');
console.log('hits=' + out.length);