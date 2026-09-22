const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const b = s;
const pr = [
  ["page, o., 'date'", "page, o, 'date'"],
  ["|| '');, true)", "|| ''), true)"],
  ["page, o., 'image'", "page, o, 'image'"],
  ["['', ''], ['', '']]])", "['', ''], ['', '']])"]
];
let c = 0;
pr.forEach(function (x) { while (s.indexOf(x[0]) >= 0) { s = s.replace(x[0], x[1]); c++; } });
console.log('CHANGED=' + (s !== b) + ' CNT=' + c);
if (s !== b) fs.writeFileSync(p, s);
const rep = [
  'function smartPdfOverlayReadTable(box) {',
  "  const tb = box && box.querySelector('table');",
  '  if (!tb) return [];',
  '  const rows = [];',
  '  for (let ri = 0; ri < tb.rows.length; ri++) {',
  '    const cells = [];',
  '    for (let ci = 0; ci < tb.rows[ri].cells.length; ci++) {',
  "      cells.push((tb.rows[ri].cells[ci].textContent || '').trim());",
  '    }',
  '    rows.push(cells);',
  '  }',
  '  return rows;',
  '}'
].join('\n');
if (!re.test(s)) { console.log('FUNC_NOT_FOUND'); process.exit(1); }
s = s.replace(re, rep);
console.log('CHANGED=' + (s !== before));
if (s !== before) fs.writeFileSync(p, s);