// Regression: current engine must match the ORIGINAL engine for all 7 existing locales.
import { readFileSync } from 'node:fs';

function load(file) {
  const src = readFileSync(file, 'utf8').replace(/\bexport\s+/g, '');
  return new Function(src + '\nreturn { numberToWords };')().numberToWords;
}
const orig = load(new URL('./backup/numberToWords.js.orig', import.meta.url));
const cur = load(new URL('../numberToWords.js', import.meta.url));

const locales = ['en', 'es', 'ar', 'fr', 'ru', 'de', 'tr'];
const values = ['0', '5', '10', '12', '19', '21', '45', '100', '250', '999',
  '1000', '1573', '1250.5', '5.5', '-7', '1234567', '2000000000', '1000000000000'];
let diff = 0;
for (const l of locales) {
  for (const v of values) {
    const a = orig(v, l), b = cur(v, l);
    if (a !== b) { diff++; console.log(`DIFF [${l}] ${v}: orig=${JSON.stringify(a)} cur=${JSON.stringify(b)}`); }
  }
}
console.log(diff === 0
  ? `REGRESSION PASS: ${locales.length} locales x ${values.length} values identical (${locales.length * values.length} checks).`
  : `REGRESSION FAIL: ${diff} differences.`);