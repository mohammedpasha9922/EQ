import fs from 'node:fs';
const s = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/p9_images.mjs', 'utf8');
const keys = ['buildNotePdfBlob', 'notePdfPreviewModal', 'srcdoc', 'notePdfExport', 'window.__note', 'buildNotePdfHtml', 'pdf.js', 'html2pdf', 'iframe'];
for (const k of keys) {
  let j = s.indexOf(k);
  let count = 0;
  while (j !== -1) { count++; j = s.indexOf(k, j + 1); }
  console.log(k + ': count=' + count);
}