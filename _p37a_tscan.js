const fs = require('fs');
const path = require('path');
const dir = 'tests';
const pats = [
  /EQ Calculator/, /EQ Note PDF/, /EQ-Calculator-History/, /Created with EQ/, /Exported from EQ/,
  /shareTitle/, /app-logo/, /logo-e/, /logo-q/, /logo-7/, /<title>EQ/, /drawerTitle/, /application-name/,
  /EQ Smart Calculator/, /EQ Calc/, /title>EQ<|'EQ'/
];
let out = [];
for (const f of fs.readdirSync(dir)) {
  if (!/\.mjs$|\.js$/.test(f)) continue;
  const p = path.join(dir, f);
  let txt; try { txt = fs.readFileSync(p, 'utf8'); } catch (e) { continue; }
  const lines = txt.split(/\r?\n/);
  lines.forEach((l, i) => {
    for (const re of pats) {
      if (re.test(l)) { out.push(f + ':' + (i + 1) + ': ' + l.trim().slice(0, 200)); break; }
    }
  });
}
fs.writeFileSync('_p37a_tests_audit.txt', out.join('\r\n'));
console.log('done', out.length);
