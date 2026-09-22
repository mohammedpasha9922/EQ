const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let s = fs.readFileSync(p, 'utf8');
const helper = 'async function tableModel(pg) {\n  const ts = await tables();\n  if (pg === undefined) return ts[0] || { rows: [] };\n  return ts.filter((t) => t.page === pg)[0] || { rows: [] };\n}\n';
if (s.split('function tableModel').length - 1 === 0) {
  const ai = s.indexOf('async function selectCell');
  s = s.slice(0, ai) + helper + s.slice(ai);
}
const rep = [
  ["tbar('row-add')", "tbar('row+')"],
  ["tbar('row-del')", "tbar('row-')"],
  ["tbar('col-add')", "tbar('col+')"],
  ["tbar('col-del')", "tbar('col-')"],
  ["tbar('align-c')", "tbar('al-c')"],
  ["tbar('align-r')", "tbar('al-r')"],
  ["tbar('align-l')", "tbar('al-l')"],
  ["tbar('bold')", "tbar('f-b')"],
  ["tbar('italic')", "tbar('f-i')"],
  ["tbar('color', 1)", "tbar('tc', 1)"],
  ["tbar('bg', 4)", "tbar('bg', 0)"],
  ["tbar('border-color', 2)", "tbar('bc', 1)"],
  ['data-tact="row-add"', 'data-tact="row+"'],
];
for (const [a, b] of rep) s = s.split(a).join(b);
let k = s.indexOf("tbar('border-toggle')");
if (k > -1) {
  s = s.slice(0, k) + "tbar('bn')" + s.slice(k + 21);
  k = s.indexOf("tbar('border-toggle')", k);
  if (k > -1) s = s.slice(0, k) + "tbar('by')" + s.slice(k + 21);
}
fs.writeFileSync(p, s);
console.log('tableModel', s.split('function tableModel').length - 1,
  'bn', s.split("tbar('bn')").length - 1,
  'by', s.split("tbar('by')").length - 1,
  'rowAddLeft', s.split('row-add').length - 1,
  'borderToggleLeft', s.split('border-toggle').length - 1);
