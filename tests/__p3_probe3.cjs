const fs = require('fs');
const lines = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8').split(/\r?\n/);
const out = [];
let inKu = false;
lines.forEach((x, i) => {
  if (/^  ku: \{$/.test(x)) inKu = true;
  if (inKu && /smart|pdfAdd|drawerSmart/i.test(x)) out.push((i + 1) + ': ' + x.trim().slice(0, 130));
  if (inKu && /^  \},/.test(x)) { out.push('KU_END@' + (i + 1)); inKu = false; }
});
fs.writeFileSync('d:/Programs EQ7/EQ/tests/__p3_ku_lines.txt', out.join('\n'));



