const fs = require('fs');
const s = fs.readFileSync('tests/__probe_rb_overlap.mjs', 'utf8');
const i = s.indexOf('function collisions');
const j = s.indexOf('R.collisionsA');
const block = s.slice(i, j);
console.log('<<<START>>>');
console.log(block);
console.log('<<<END>>>');
// show line 125 region with pipe markers
const lines = block.split('\n');
for (let k = 0; k < lines.length; k++) console.log((k+113) + '|\t|' + lines[k] + '|');
