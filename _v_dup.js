// Temporary audit helper — lists duplicate top-level declarations in app.js
const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split('\n');
const map = new Map();
lines.forEach((l, i) => {
  let m = l.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (!m) m = l.match(/^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/);
  if (m) {
    const name = m[1];
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(i + 1);
  }
});
const dups = [];
for (const [name, at] of map) if (at.length > 1) dups.push(name + ' @ ' + at.join(', '));
console.log('TOTAL TOP-LEVEL DECLS:', map.size);
console.log('DUPLICATES:', dups.length);
console.log(dups.join('\n'));
