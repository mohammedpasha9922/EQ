const fs = require('fs');
const path = require('path');
function walk(dir, acc) {
  let list = [];
  try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return acc; }
  for (const e of list) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.pdf$/i.test(e.name)) acc.push(p);
  }
  return acc;
}
const pdfs = walk('d:/Programs EQ7/EQ', []);
const vend = fs.existsSync('d:/Programs EQ7/EQ/__pdfdiag/vendor') ? fs.readdirSync('d:/Programs EQ7/EQ/__pdfdiag/vendor') : [];
const out = 'PDFS=' + JSON.stringify(pdfs) + '\nVENDOR=' + JSON.stringify(vend);
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p19_fixtures.txt', out, 'utf8');
console.log('WROTE ' + pdfs.length + ' pdfs, ' + vend.length + ' vendor');