const fs = require('fs');
const src = fs.readFileSync('app.js', 'utf8');
// locate `const translations = {` ... match braces
const start = src.indexOf('const translations = {');
let i = src.indexOf('{', start), depth = 0, end = -1;
for (; i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  else if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
    const q = src[i]; i++;
    while (i < src.length) { if (src[i] === '\\') i++; else if (src[i] === q) break; i++; }
  }
}
const objSrc = src.slice(src.indexOf('{', start), end + 1);
const translations = eval('(' + objSrc + ')');
const locales = Object.keys(translations);
console.log('LOCALES:', locales.join(','));
const base = Object.keys(translations.en);
for (const loc of locales) {
  const keys = Object.keys(translations[loc]);
  const missing = base.filter(k => !(k in translations[loc]));
  const empty = base.filter(k => translations[loc][k] === '' && translations.en[k] !== '');
  const extra = keys.filter(k => !base.includes(k));
  console.log(`\n[${loc}] keys=${keys.length} missing=${missing.length} empty=${empty.length} extra=${extra.length}`);
  if (missing.length) console.log('  MISSING:', missing.join(', '));
  if (empty.length) console.log('  EMPTY:', empty.slice(0, 60).join(', '));
  if (extra.length) console.log('  EXTRA:', extra.slice(0, 30).join(', '));
}
