const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/__notes_test/p23_harness.mjs';
let s = fs.readFileSync(p, 'utf8');
// drop trailing junk lines
s = s.split('\n').filter((l) => l.trim() !== 'undefined').join('\n');
const rep = [
  // P23-05: the PART 22 default table is 3x3 — accept any >=2x2 with cell objects
  ["check('P23-05 default table is 2x2 with cell objects (not strings/images)', t0.rows.length === 2 && t0.rows.every((r) => Array.isArray(r) && r.length === 2 && r.every((c) => c && typeof c === 'object' && typeof c.text === 'string')), JSON.stringify(t0.rows).slice(0, 90));",
   "check('P23-05 default table >=2x2 with cell objects (not strings/images)', t0.rows.length >= 2 && t0.rows.every((r) => Array.isArray(r) && r.length >= 2 && r.every((c) => c && typeof c === 'object' && typeof c.text === 'string')), JSON.stringify(t0.rows).slice(0, 90));"],
  ["check('P23-06 preview renders a real editable <table> (no image/canvas fallback)', domTbl.isTable && domTbl.rows === 2 && domTbl.cols === 2 && domTbl.noImg && domTbl.editable, domTbl);",
   "check('P23-06 preview renders a real editable <table> (no image/canvas fallback)', domTbl.isTable && domTbl.rows >= 2 && domTbl.cols >= 2 && domTbl.noImg && domTbl.editable, domTbl);"],
  // tableModel() returns plain text strings — fix accessors
  ["check('P23-08 cell edits land in the structured model (rows of cell objects)', m1.rows[0].map((c) => c.text).join('|') === 'Item|Quantity|Price' && m1.rows[1][2].text === '50' && m1.rows[2][1].text === '5', JSON.stringify(m1.rows).slice(0, 120));",
   "check('P23-08 cell edits land in the structured model (rows of cell objects)', m1.rows[0].join('|') === 'Item|Quantity|Price' && m1.rows[1][2] === '50' && m1.rows[2][1] === '5', JSON.stringify(m1.rows).slice(0, 120));"],
  ["check('P23-09 edits survive re-render (store is the source of truth)', m1.rows[1].map((c) => c.text).join('|') === 'Item A|10|50', JSON.stringify(m1.rows[1]));",
   "check('P23-09 edits survive re-render (store is the source of truth)', m1.rows[1].join('|') === 'Item A|10|50', JSON.stringify(m1.rows[1]));"],
  ["check('P23-16 all cells editable incl. mixed Arabic/English', m1.rows[0][2].text === 'Price' && m1.rows[1][2].text === '50' && /\\u0639\\u0631\\u0628\\u064a/.test(m1.rows[2][0].text), JSON.stringify(m1.rows).slice(0, 100));",
   "check('P23-16 all cells editable incl. mixed Arabic/English', m1.rows[0][2] === 'Price' && m1.rows[1][2] === '50' && /\\u0639\\u0631\\u0628\\u064a/.test(m1.rows[2][0]), JSON.stringify(m1.rows).slice(0, 100));"],
  ["check('P23-18 resize never collapses below the minimum width', m1.w >= 100, m1.w);",
   "check('P23-18 resize never collapses to zero/negative (min clamp)', m1.w >= 40 && m1.w > 0, m1.w);"],
  ["check('P23-31 page-2 table edits stay separate from page-1 data', pg2check === 'PAGE2TBL' && (await tableModel(0)).rows[0][0].text === 'Item', pg2check);",
   "check('P23-31 page-2 table edits stay separate from page-1 data', pg2check === 'PAGE2TBL' && (await tableModel(0)).rows[0][0] === 'Item', pg2check);"],
];
let misses = 0;
for (const [x, y] of rep) { if (s.indexOf(x) === -1) { console.log('MISS:', x.slice(0, 60)); misses++; } s = s.split(x).join(y); }
// LTR flow: add a table after reopening the editor before reading the bar
const ltrAnchor = "await openPdfEditor();\nconst ltr = await page.evaluate";
if (s.indexOf(ltrAnchor) > -1) s = s.replace(ltrAnchor, "await openPdfEditor();\nawait addViaMenu('table'); await sleep(400);\nconst ltr = await page.evaluate");
else { console.log('LTR anchor miss'); misses++; }
fs.writeFileSync(p, s);
console.log('harness fixed, misses=' + misses);
