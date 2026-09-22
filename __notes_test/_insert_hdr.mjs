import fs from 'fs';
const f = 'd:/Programs EQ7/EQ/app.js';
const L = fs.readFileSync(f, 'utf8').split('\n');
// line 6633 (idx 6632) is "}" closing smartScanMarkEdited; insert the function header after it.
L.splice(6633, 0,
  'function smartScanReadEditDocFromDom() {',
  '  const doc = smartScanEditDoc;',
  '  // PART   17 — persist user edits back into state.smartScanResult immediately (not',
  '  //   only on Accept), so the recognized-document model is the single source of',
  '  //   truth while the user reviews/edits.'
);
fs.writeFileSync(f, L.join('\n'));
console.log('INSERTED');