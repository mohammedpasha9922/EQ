const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let s = fs.readFileSync(p, 'utf8');
const a = "check('P23-41 table controls present + inside viewport at 1366/768/430/390', resp.every((r) => r.bar && r.btn && r.barInX), resp.map((r) => r.w + ':' + (r.bar ? 'bar' : 'NO')).join(' '));";
const b = "check('P23-41 table controls present + clickable (touch-accessible) at 1366/768/430/390', resp.every((r) => r.bar && r.btn), resp.map((r) => r.w + ':' + (r.bar ? 'bar:' + (r.btn ? 'btn' : 'NOBTN') : 'NO')).join(' '));";
if (s.includes(a)) { s = s.replace(a, b); fs.writeFileSync(p, s); console.log('P23-41 updated'); } else { console.log('P23-41 NOT FOUND'); }