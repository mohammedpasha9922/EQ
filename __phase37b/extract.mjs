import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8');
const start = s.indexOf('const translations = {');
if (start < 0) { console.error('no translations'); process.exit(1); }
// find the closing "};" of the object by brace counting from the first '{'
let i = s.indexOf('{', start);
let depth = 0, inStr = null, end = -1;
for (; i < s.length; i++) {
  const c = s[i], p = s[i - 1];
  if (inStr) {
    if (c === '\\') { i++; continue; }
    if (c === inStr) inStr = null;
    continue;
  }
  if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
}
const objSrc = s.slice(s.indexOf('{', start), end + 1);
const translations = (0, eval)('(' + objSrc + ')');
const locales = Object.keys(translations);
console.log('locales:', locales.join(','));
const enKeys = Object.keys(translations.en);
for (const L of locales) {
  const keys = Object.keys(translations[L]);
  const missing = enKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !enKeys.includes(k));
  console.log(L, 'keys=', keys.length, 'missing=', missing.length, 'extra=', extra.length);
  if (missing.length) console.log('  missing:', missing.join(',').slice(0, 400));
  if (extra.length) console.log('  extra:', extra.join(',').slice(0, 400));
}
// language* keys sample
console.log('LANGKEYS', enKeys.filter(k => /^language/.test(k)).join(','));
fs.mkdirSync('__phase37b', { recursive: true });
fs.writeFileSync('__phase37b/en_keys.json', JSON.stringify(translations.en, null, 1), 'utf8');
console.log('TOTAL_EN_KEYS', enKeys.length);
console.log('objSrc range:', start, end);