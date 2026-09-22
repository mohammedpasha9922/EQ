const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8').split('\n');
const pats = [
  'function smartPdfEditorBuild',
  'function smartPdfEditor',
  'smartPdfPage',
  'smartPdfZoom',
  'function smartPdf',
  'smartPdfSave',
  'smartPdfExport',
  'smartPdfSend',
  'smartPdfEditorBack',
  'contenteditable',
  'smart-pdf-page',
  'smartPdfPageNav',
  'smartPdfRenderPage'
];
const out = [];
for (const p of pats) {
  const hits = [];
  for (let i = 0; i < s.length; i++) if (s[i].indexOf(p) >= 0) hits.push((i + 1) + ': ' + s[i].trim().slice(0, 110));
  out.push('== ' + p + ' (' + hits.length + ') ==');
  out.push(hits.slice(0, 12).join('\n'));
}
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p19c.txt', out.join('\n'), 'utf8');
console.log('WROTE');