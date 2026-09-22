const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const re = /addEventListener\('focus(in|out)'|\.blur\(\)|activeElement/g;
let m, n = 0;
while ((m = re.exec(s)) && n < 60) {
  const line = s.slice(0, m.index).split('\n').length;
  console.log(line, m[0], '->', s.slice(m.index, m.index + 100).split('\n')[0].trim().slice(0, 95));
  n++;
}
