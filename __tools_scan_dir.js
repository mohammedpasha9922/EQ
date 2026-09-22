const fs = require('fs');
const a = fs.readFileSync('D:/Programs EQ7/EQ/app.js', 'utf8');
const out = [];
const pats = ['unicode-bidi', 'text-align:start', 'text-align: start', 'padding-inline-start', 'dir="auto"', 'break-inside'];
for (const p of pats) {
  out.push('=== ' + p + ' ===');
  let idx = 0, c = 0;
  while (true) {
    idx = a.indexOf(p, idx);
    if (idx < 0 || c >= 30) break;
    const ln = a.slice(0, idx).split('\n').length;
    const line = a.slice(a.lastIndexOf('\n', idx) + 1, a.indexOf('\n', idx));
    out.push(ln + ': ' + line.trim().slice(0, 220));
    idx += p.length;
    c++;
  }
  out.push('count=' + c);
}
fs.writeFileSync(process.env.TEMP + '/dir_css.txt', out.join('\n'), 'utf8');
console.log('written');