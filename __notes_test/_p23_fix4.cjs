const fs = require('fs');
// P23-31 accessor fix (tableModel returns strings)
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let s = fs.readFileSync(p, 'utf8');
const a = "const pg2check = pg2 && pg2.rows && pg2.rows[0] ? pg2.rows[0][0].text : '';";
const b = "const pg2check = pg2 && pg2.rows && pg2.rows[0] ? pg2.rows[0][0] : '';";
if (s.indexOf(a) > -1) { s = s.split(a).join(b); console.log('p31 fixed'); } else console.log('p31 anchor miss');
// responsive probe detail
const ra = "return { bar: !!bar, btn: !!btn, barInX: br ? (br.left >= -4 && br.right <= window.innerWidth + 4) : true, hx: holder.scrollWidth - holder.clientWidth };";
const rb = "const bb = document.querySelector('#smartPdfEditor .smart-pdf-ov-table'); const bbr = bb ? bb.getBoundingClientRect() : null; return { bar: !!bar, btn: !!btn, bl: br?Math.round(br.left):null, brR: br?Math.round(br.right):null, bw: br?Math.round(br.width):null, iw: window.innerWidth, boxL: bbr?Math.round(bbr.left):null, boxW: bbr?Math.round(bbr.width):null, hx: holder.scrollWidth - holder.clientWidth };";
if (s.indexOf(ra) > -1) { s = s.split(ra).join(rb); console.log('probe detail added'); } else console.log('probe anchor miss');
fs.writeFileSync(p, s);
// confirm app focus patch present
const ap = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
console.log('focus patch present:', ap.indexOf('beats the drag handler') > -1);
