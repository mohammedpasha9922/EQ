const fs = require('fs');
const L = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/p24_harness.mjs', 'utf8').split('\n');
let depth = 0, parens = 0, backtick = false, inS = null;
let start = null;
for (let i = 0; i < L.length; i++) {
  const t = L[i];
  const ob = (t.match(/{/g) || []).length, cb = (t.match(/}/g) || []).length;
  depth += ob - cb;
  if (i < 5) continue;
  if (depth === 0 && /^\s*await /.test(t) && !start) { start = i + 1; console.log('first top-level await at line', start); }
  if (ob !== cb && depth !== 0 && /function |=>|switch|for \(/.test(t) === false && ob - cb === 1 && depth === 1 && !start) {}
}
console.log('final depth', depth);
// show around 145-155
for (let i = 144; i < 156; i++) console.log((i + 1) + ': ' + L[i]);
