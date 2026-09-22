// Temporary audit helper — compare current copies vs HEAD baseline
const fs = require('fs');
const { execSync } = require('child_process');

const head = execSync('git show HEAD:app.js').toString();
const lines = fs.readFileSync('app.js', 'utf8').split('\n');

const names = [
  'normalizeNoteTextColor',
  'readExplicitCellBackgroundColor',
  'buildNoteBodyHTML',
  'noteInlineSegmentHTML',
  'noteRunAlignCss',
  'buildNoteBodyHTMLWithBlocks',
  'buildNoteBlocksHTML',
  'escapeNoteCheckText'
];

console.log('=== HEAD occurrence counts ===');
names.forEach((n) => {
  const re = new RegExp('function\\s+' + n + '\\s*\\(', 'g');
  const m = head.match(re);
  console.log(n + ': ' + (m ? m.length : 0));
});

// Compare the three copies in the current file.
// Copy boundaries (decl -> end of escapeNoteCheckText)
const bounds = [
  [7696, 7931],
  [7933, 8140],
  [8142, 8349]
];
const texts = bounds.map(([a, b]) => lines.slice(a - 1, b).join('\n'));
console.log('=== copy equality ===');
console.log('copy1 === copy2 ?', texts[0] === texts[1]);
console.log('copy2 === copy3 ?', texts[1] === texts[2]);
console.log('copy1 length', texts[0].length, 'copy2 length', texts[1].length, 'copy3 length', texts[2].length);

// What is unique to copy1 (first 28-line gap difference)?
const c1 = lines.slice(7714, 7743);
console.log('=== copy1 extra span lines 7715-7743 ===');
console.log(c1.map((l, i) => (7715 + i) + ': ' + l).join('\n'));
