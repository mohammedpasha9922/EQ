import fs from 'node:fs';
const cur = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_p9_syntax.mjs', 'utf8').split('\n');
const orig = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_p9_orig.mjs', 'utf8').split('\n');
const dep = (arr) => { let d = 0; const out = []; for (const l of arr) { const o = (l.match(/\{/g) || []).length, c = (l.match(/\}/g) || []).length; d += o - c; out.push(d); } return out; };
const dc = dep(cur), do2 = dep(orig);
let first = -1;
for (let i = 0; i < Math.max(dc.length, do2.length); i++) { const a = dc[i] || 0, b = do2[i] || 0; if (a !== b) { first = i + 1; break; } }
console.log('firstDiffLine', first, 'curDepth', dc[first], 'origDepth', do2[first]);
// print cur lines around the divergence
if (first > -1) { for (let i = first - 4; i <= first + 6; i++) { if (i >= 0 && i < cur.length) console.log((i + 1) + ' | ' + cur[i]); } }