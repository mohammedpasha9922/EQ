import fs from 'fs';
const f = 'd:/Programs EQ7/EQ/app.js';
let L = fs.readFileSync(f, 'utf8').split('\n');
// delete the stale duplicate doc declaration right after the PART 17 comment (idx 6639‑1 =  ​6638)
L.splice(6638, 1);
fs.writeFileSync(f, L.join('\n'));
console.log('DROPPED_LINE_6639');