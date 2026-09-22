// Extract the REAL 'en' block keys from app.js (runtime source of truth) and compare to ku.
import { readFileSync } from 'node:fs';
import { assert } from 'node:console';

let src = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const start = src.indexOf('const translations = {');
if (start < 0) { console.error('no translations'); process.exit(1); }
// Find the matching closing brace for the translations object
let depth = 0, end = -1;
let inStr = false, inLineCom = false, inBlockCom = false;
let i = start;
while (i < src.length) {
  const c = src[i];
  const n = src[i+1];
  if (inLineCom) { if (c === '\n' || c === '\r') inLineCom = false; i++; continue; }
  if (inBlockCom) { if (c === '*' && n === '/') { inBlockCom = false; i+=2; continue; } i++; continue; }
  if (inStr) {
    if (c === '\\') { i += 2; continue; }
    if (c === '\'' || c === '"' || c === '`') inStr = false;
    i++; continue;
  }
  if (c === '/' && n === '/') { inLineCom = true; i+=2; continue; }
  if (c === '/' && n === '*') { inBlockCom = true; i+=2; continue; }
  if (c === '\'' || c === '"' || c === '`') { inStr = true; i++; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  i++;
}
const objText = src.slice(start + 'const translations = '.length, end + 1);
// strip remaining comments then eval
const stripped = objText
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const translations = new Function('return ' + stripped + ';')();

const enKeys = Object.keys(translations.en);
const langKeys = Object.keys(translations);
console.log('languages in translations:', langKeys.join(', '));
console.log('app.js en-block key count:', enKeys.length);

import { ku } from './ku_data.mjs';
const kuSet = new Set(Object.keys(ku));
const missingInKu = enKeys.filter((k) => !kuSet.has(k));
const kuNotInEn = Object.keys(ku).filter((k) => !enKeys.includes(k));
console.log('\nKeys present in app.js en block but MISSING in ku (' + missingInKu.length + '):');
console.log(missingInKu.join(', ') || '(none)');
console.log('\nKeys in ku but NOT in app.js en block (' + kuNotInEn.length + '):');
console.log(kuNotInEn.join(', ') || '(none)');

console.log('\nen_keys.json vs app.js en block comparison:');
import { readFileSync as _rfs } from 'node:fs';
const ref = JSON.parse(_rfs(new URL('../__phase37b/en_keys.json', import.meta.url), 'utf8'));
const refKeys = Object.keys(ref);
const inEnOnly = enKeys.filter((k) => !refKeys.includes(k));
const inRefOnly = refKeys.filter((k) => !enKeys.includes(k));
console.log('in app.js en but NOT in en_keys.json (' + inEnOnly.length + '):', inEnOnly.join(', ') || '(none)');
console.log('in en_keys.json but NOT in app.js en (' + inRefOnly.length + '):', inRefOnly.join(', ') || '(none)');
