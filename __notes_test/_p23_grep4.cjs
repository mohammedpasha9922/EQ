const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
for (const k of ['.smart-pdf-overlay-layer', '.smart-pdf-overlay {', '.smart-pdf-overlay{', 'smart-pdf-overlay-layer']) {
  let i = -1;
  while ((i = s.indexOf(k, i + 1)) > -1) {
    console.log(k, '@char', i, ':', JSON.stringify(s.slice(i, i + 180)));
  }
}
