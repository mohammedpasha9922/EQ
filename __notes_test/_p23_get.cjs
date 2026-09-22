const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
for (const k of ["act === 'rh+'", "act === 'rh-'", '__smartPdfTableMaxW', 'rowH =', "act === 'bn'", "act === 'by'"]) {
  const at = []; let i = -1; while ((i = s.indexOf(k, i + 1)) > -1) at.push(i);
  console.log(k, '->', at.join(','));
}
