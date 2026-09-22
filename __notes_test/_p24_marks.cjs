const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
let i = -1, n = 0;
const out = [];
while ((i = s.indexOf('PART 24', i + 1)) > -1) {
  n++;
  out.push('=== #' + n + ' @' + i + ' ===\n' + s.slice(Math.max(0, i - 100), i + 400));
}
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p24_marks.txt', out.join('\n'));
console.log('count', n);
