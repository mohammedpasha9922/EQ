const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let s = fs.readFileSync(p, 'utf8');
const rep = [
  // P23-08: rows are now cell objects (not flat strings) — compare .text
  ["check('P23-08 cell edits land in the structured model (rows of cell objects)', m1.rows[0].join('|') === 'Item|Quantity|Price' && m1.rows[1][2] === '50' && m1.rows[2][1] === '5', JSON.stringify(m1.rows).slice(0, 120));",
   "check('P23-08 cell edits land in the structured model (rows of cell objects)', m1.rows[0].map((c) => c.text).join('|') === 'Item|Quantity|Price' && m1.rows[1][2].text === '50' && m1.rows[2][1].text === '5', JSON.stringify(m1.rows).slice(0, 120));"],
  // P23-09
  ["check('P23-09 edits survive re-render (store is the source of truth)', m1.rows[1].join('|') === 'Item A|10|50', JSON.stringify(m1.rows[1]));",
   "check('P23-09 edits survive re-render (store is the source of truth)', m1.rows[1].map((c) => c.text).join('|') === 'Item A|10|50', JSON.stringify(m1.rows[1]));"],
  // P23-16 mixed Arabic
  ["check('P23-16 all cells editable incl. mixed Arabic/English', m1.rows[0][2] === 'Price' && m1.rows[1][2] === '50' && /\\u0639\\u0631\\u0628\\u064a/.test(m1.rows[2][0]), JSON.stringify(m1.rows).slice(0, 100));",
   "check('P23-16 all cells editable incl. mixed Arabic/English', m1.rows[0][2].text === 'Price' && m1.rows[1][2].text === '50' && /\\u0639\\u0631\\u0628\\u064a/.test(m1.rows[2][0].text), JSON.stringify(m1.rows).slice(0, 100));"],
  // P23-31 multi-page separation
  ["check('P23-31 page-2 table edits stay separate from page-1 data', pg2check === 'PAGE2TBL' && (await tableModel(0)).rows[0][0] === 'Item', pg2check);",
   "check('P23-31 page-2 table edits stay separate from page-1 data', pg2check.text === 'PAGE2TBL' && (await tableModel(0)).rows[0][0].text === 'Item', pg2check);"],
];
let applied = 0;
for (const [a, b] of rep) { if (s.includes(a)) { s = s.replace(a, b); applied++; } else { console.log('NOT FOUND:', a.slice(0, 70)); } }
fs.writeFileSync(p, s);
console.log('applied', applied, 'of', rep.length);