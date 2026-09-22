const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const re = /addEventListener\('pointerdown'|addEventListener\('mousedown'/g;
let m;
while ((m = re.exec(s))) {
  const line = s.slice(0, m.index).split('\n').length;
  console.log('@' + line, ':', s.slice(Math.max(0, i = m.index - 150), m.index + 200).split('\n').slice(-6).join(' | ').trim().slice(0, 260));
  console.log('---');
}
