// Temporary audit helper — print selected diff hunks that touch non-Smart-Documents areas
const fs = require('fs');
const lines = fs.readFileSync('_v_diff_u0.txt', 'utf8').split('\n');

// Build hunk list
const hunks = [];
let cur = null;
lines.forEach((l) => {
  if (l.startsWith('@@')) { cur = { header: l, body: [] }; hunks.push(cur); }
  else if (cur) cur.body.push(l);
});

const targets = [
  'noteDividerBtn',
  'buildNotePdfHtml',
  'tryNativePrintNote',
  'performNotePdfExport',
  'folderNameExists',
  'makeFolderId',
  'addFolder',
  'deleteFolder',
  'const state = {'
];

const seen = new Set();
targets.forEach((t) => {
  hunks.forEach((h, i) => {
    if (h.header.includes(t)) {
      if (seen.has(i)) return;
      seen.add(i);
      console.log('==================== hunk #' + i);
      console.log(h.header);
      console.log(h.body.filter((b) => b !== '').slice(0, 60).join('\n'));
      console.log('');
    }
  });
});
