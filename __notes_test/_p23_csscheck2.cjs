const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/_head_app.js', 'utf8');
for (const k of ['smart-pdf-overlay-layer', 'smart-pdf-ov-table', 'smart-pdf-overlay-del', 'smart-pdf-overlay-grip', '.smart-pdf-overlay {']) {
  const i = s.indexOf(k);
  console.log(k, '->', i > -1 ? 'APP.JS has it' : 'NOT in app.js');
}
// search styles.css (HEAD)
const sc = fs.readFileSync('d:/Programs EQ7/EQ/styles.css', 'utf8');
const i = sc.indexOf('smart-pdf-overlay-layer');
console.log('styles.css overlay-layer at', i, ':', i > -1 ? sc.slice(i - 60, i + 120) : 'MISSING');



