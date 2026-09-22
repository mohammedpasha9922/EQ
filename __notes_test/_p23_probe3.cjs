const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
function show(name, key) {
  const i = s.indexOf(key);
  console.log('--- ' + name + ' idx=' + i);
  if (i >= 0) console.log(JSON.stringify(s.slice(i, i + 90)));
}
show('addItem-table-case', "    case 'table':");
show('export-helev-let', 'let helv = null;');
show('test-seam', '  colors: () => smartImportColors');
// find exact addItem rows line
const j = s.indexOf("o.rows = [['', ''],");
console.log('rows-line idx', j);
if (j >= 0) console.log(JSON.stringify(s.slice(Math.max(0, j - 10), j + 40)));