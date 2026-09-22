// Locate remaining smart-* references in app.js with line numbers and context
const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split(/\r?\n/);
const out = [];
const re = /smart-[\w-]*/g;
lines.forEach((l, i) => {
  const hits = l.match(re);
  if (hits) out.push('app.js:' + (i + 1) + ': [' + Array.from(new Set(hits)).join(',') + ']  ' + l.trim().slice(0, 170));
});
fs.writeFileSync('_CLOSE5_out.txt', out.join('\r\n'), 'utf8');
process.stdout.write('total lines: ' + out.length + '\n');
process.stdout.write(out.join('\n'));
