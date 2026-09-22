const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('// ===== PART 24 — PDF Mark (Highlight / Underline / Draw / Comment) =====');
if (start < 0) { console.log('START NOT FOUND'); process.exit(1); }
const call = s.lastIndexOf('smartPdfMarkMenuInit();');
if (call < 0) { console.log('CALL NOT FOUND'); process.exit(1); }
// end = after 'smartPdfMarkMenuInit();' + the following '  }' that closes the block
const endMarker = 'smartPdfMarkMenuInit();  }';
const end = s.indexOf(endMarker, call);
if (end < 0) { console.log('END MARKER NOT FOUND'); process.exit(1); }
const endPos = end + endMarker.length;
const removed = s.slice(start, endPos);
s = s.slice(0, start) + s.slice(endPos);
fs.writeFileSync(p, s);
console.log('Removed region B mark block: bytes', start, '->', endPos, 'removedLen', removed.length);
// verify seams/tables survived
console.log('addItem seam survived:', s.indexOf('window.__smartImport.addItem') > -1);
console.log('table seam survived:', s.indexOf('window.__smartPdfTables') > -1);
console.log('smartEditorSendBtn survived:', s.indexOf('const smartEditorSendBtn = document.getElementById') > -1);
console.log('smartBlankBack survived:', s.indexOf('const smartBlankBack = document.getElementById') > -1);
console.log('old alt StartDraw gone:', s.split('function smartPdfMarkStartDraw').length - 1 >= 1);
console.log('alt-only refs remaining:', ['smartPdfAddMarkAnnotation','smartPdfMarkPageWrap','smartPdfMarkDrawMode','smartPdfMarkToast','smartPdfMarkClearDraw','smartPdfMarkOpenComment'].map(n => n + '=' + (s.split(n).length - 1)).join(' '));