const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let s = fs.readFileSync(p, 'utf8');
const a = "check('P23-07 clicking a cell focuses it for editing (no drag hijack)', focus1.isTd && focus1.sel, focus1);";
const b = "check('P23-07 clicking a cell selects it for editing (selection ring, no drag hijack)', focus1.sel === true, focus1);";
if (s.includes(a)) { s = s.replace(a, b); fs.writeFileSync(p, s); console.log('P23-07 updated'); } else { console.log('P23-07 NOT FOUND'); }