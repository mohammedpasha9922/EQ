// Assemble the PART 25 section and append it to app.js (once).
const fs = require('fs');
const D = 'd:/Programs EQ7/EQ/__notes_test/';
const read = (f) => fs.readFileSync(D + f, 'utf8').replace(/\r\n/g, '\n');
let s2 = read('_p25_s2.txt');
let s3 = read('_p25_s3.txt');
const s4 = read('_p25_s4.txt');
const s5 = read('_p25_s5.txt');
const s6 = read('_p25_s6.txt');
const s1 = read('_p25_section.txt'); // header + model + ops
// insert the table branch just before the drawer's per-overlay catch close
const anchor = '      } catch (e) { /* additive overlay skipped */ }';
if (s3.split(anchor).length - 1 !== 1) throw new Error('s3 anchor fail');
// s4 continues the else-if chain (starts with "else if") directly after
// s3's image-branch close — no extra brace stripping needed.
s3 = s3.replace(anchor, s4 + anchor);
const section = '\n' + s1 + '\n' + s2 + '\n' + s3 + '\n' + s5 + '\n' + s6;
fs.writeFileSync(D + '_p25_section_full.txt', section);
const P = 'd:/Programs EQ7/EQ/app.js';
let app = fs.readFileSync(P, 'utf8');
// undo any previous partial append (it started with the pass-2 comment)
const cutAt = app.indexOf('// — pass 2: build the FINAL document');
if (cutAt >= 0) {
  app = app.slice(0, cutAt).replace(/[\r\n\s]+$/, '\r\n');
  console.log('removed previous partial section at', cutAt);
}
app = app.replace(/[\r\n\s]+$/, '\r\n') + '\r\n' + section.replace(/\n/g, '\r\n');
if (app.indexOf("        }\r\n        } else if (o.type === 'table')") >= 0) throw new Error('doubled brace still present');
fs.writeFileSync(P, app);
console.log('PART25 appended. app.js length', app.length);
