const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
let count = 0;

// --- Fix A: define smartPdfEscAttr after smartPdfEscHtml ---
const escFn = 'function smartPdfEscHtml(s)\n{\n  return String(s == null ? \'\' : s).replace(/[&<>\\"]/g, (c) => ({ \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\', \'"\': \'&quot;\' }[c])); \n}';
const escAttr = '\n// Attribute-context escaper for the same overlay markup (adds single-quote).\nfunction smartPdfEscAttr(s)\n{\n  return String(s == null ? \'\' : s).replace(/[&<>\\"\']/g, (c) => ({ \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\', \'"\': \'&quot;\', "\'": \'&#39;\' }[c]));\n}';

if (s.includes('function smartPdfEscAttr')) { console.log('A: already present'); }
else if (s.includes('function smartPdfEscHtml')) {
  if (s.includes(escFn)) { s = s.replace(escFn, escFn + escAttr); count++; console.log('A: inserted escAttr'); }
  else { console.log('A: escHtml body mismatch; injecting after closing brace via marker'); 
    const mark = 'function smartPdfOverlayTableHtml(rows)';
    if (s.includes(mark)) { s = s.replace(mark, escAttr.trim() + '\n' + mark); count++; }
    else { console.log('A: FAILED - marker not found'); }
  }
} else { console.log('A: escHtml not found'); }

// --- Fix B: date padStart (Number) ---
const badDate = "String(d.getDate().padStart(2, '0'))";
const goodDate = "String(d.getDate()).padStart(2, '0')";
if (s.includes(badDate)) { s = s.replace(badDate, goodDate); count++; console.log('B: fixed padStart'); }
else if (!s.includes(goodDate)) { console.log('B: not found already fixed?' + s.includes('getDate()).padStart')); }
else { console.log('B: already good'); }

// --- Fix C: inverted if(input) in smartPdfPickImage ---
const badIf = "var input = smartImportEl('smartPdfAddImageInput');\n    if (input) {";
const goodIf = "var input = smartImportEl('smartPdfAddImageInput');\n    if (!input) {";
if (s.includes(badIf)) { s = s.replace(badIf, goodIf); count++; console.log('C: fixed inverted if'); }
else if (s.includes(goodIf)) { console.log('C: already good'); }
else { console.log('C: if-pattern not found exactly'); }

fs.writeFileSync(p, s);
console.log('TOTAL_CHANGES=' + count);