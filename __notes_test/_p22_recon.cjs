const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const b = s;
function insertAfterLine(idx, text) {
  const nl = s.indexOf('\n', idx);
  if (nl === -1) throw new Error('no newline after idx ' + idx);
  s = s.slice(0, nl + 1) + text + '\n' + s.slice(nl + 1);
}
const EN_KEYS = "    smartPdfAdd: 'Add', smartPdfAddText: 'Text', smartPdfAddImage: 'Image', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'Signature', smartPdfAddStamp: 'Stamp', smartPdfAddDate: 'Date', smartPdfAddTable: 'Table',";
const AR_KEYS = "    smartPdfAdd: '\u0625\u0636\u0627\u0641\u0629', smartPdfAddText: '\u0646\u0635', smartPdfAddImage: '\u0635\u0648\u0631\u0629', smartPdfAddLogo: '\u0634\u0639\u0627\u0631', smartPdfAddSignature: '\u062a\u0648\u0642\u064a\u0639', smartPdfAddStamp: '\u062e\u062a\u0645', smartPdfAddDate: '\u062a\u0627\u0631\u064a\u062e', smartPdfAddTable: '\u062c\u062f\u0648\u0644',";
function occIdx(key, n) { let i = -1; for (let k = 0; k < n; k++) { i = s.indexOf(key, i + 1); if (i === -1) throw new Error('occ ' + n + ' missing'); } return i; }
insertAfterLine(occIdx('smartPdfTextColor:', 1), EN_KEYS);
insertAfterLine(occIdx('smartPdfTextColor:', 3), AR_KEYS);
const hasEditsAnchor = 'const m = colors[p]; return m && Object.keys(m).length > 0; });';
if (s.split(hasEditsAnchor).length !== 2) throw new Error('hasEdits anchor');
s = s.replace(hasEditsAnchor,
  'const m = colors[p]; return m && Object.keys(m).length > 0; }) ||\n' +
  "    (function () { const ov = smartImportOverlays || {}; return Object.keys(ov).some((p) => { return (ov[p] || []).length > 0; }); });");
const callAnchor = ', edits, parsed.pages, colors);';
if (s.split(callAnchor).length !== 2) throw new Error('call anchor');
s = s.replace(callAnchor, ', edits, parsed.pages, colors, smartImportOverlays);');
const sigAnchor = 'editsByPage, pages, colorsByPage) {';
if (s.split(sigAnchor).length !== 2) throw new Error('sig anchor');
s = s.replace(sigAnchor, 'editsByPage, pages, colorsByPage, overlaysByPage) {');
if (s !== b) fs.writeFileSync(p, s);
console.log('FIXA OK CHANGED=' + (s !== b));