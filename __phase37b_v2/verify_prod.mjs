// PHASE 37B — post-injection production verification.
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const IDX = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

// Root engine uses ESM export but the repo package.json is "type":"commonjs", so Node
// cannot `import` it directly (a pre-existing harness limitation). Eval its plain text.
const ntwSrc = readFileSync(new URL('../numberToWords.js', import.meta.url), 'utf8')
  .replace(/\bexport\s+/g, '');
const { numberToWords } = new Function(ntwSrc + '\nreturn { numberToWords };')();
const coreSrc = readFileSync(new URL('../src/core/NumberToWords.js', import.meta.url), 'utf8');

let pass = 0, fail = 0, notVerified = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else fail++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
}
function warn(name, detail) { notVerified++; console.log(`  [NOT VERIFIED] ${name}${detail ? ' — ' + detail : ''}`); }

console.log('== APP.JS translations object ==');
// extract + eval the translations object
const start = APP.indexOf('const translations = {');
let depth = 0, end = -1, i = start, inStr = false, inLineCom = false, inBlockCom = false;
while (i < APP.length) {
  const c = APP[i], n = APP[i + 1];
  if (inLineCom) { if (c === '\n' || c === '\r') inLineCom = false; i++; continue; }
  if (inBlockCom) { if (c === '*' && n === '/') { inBlockCom = false; i += 2; continue; } i++; continue; }
  if (inStr) { if (c === '\\') { i += 2; continue; } if (c === '\'' || c === '"' || c === '`') inStr = false; i++; continue; }
  if (c === '/' && n === '/') { inLineCom = true; i += 2; continue; }
  if (c === '/' && n === '*') { inBlockCom = true; i += 2; continue; }
  if (c === '\'' || c === '"' || c === '`') { inStr = true; i++; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
  i++;
}
const objText = APP.slice(start + 'const translations = '.length, end + 1)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
let T;
try { T = new Function('return ' + objText + ';')(); } catch (e) { console.log('  [FATAL] translations parse failed:', e); process.exit(1); }

const langs = Object.keys(T);
check('8 languages registered', langs.length === 8 && langs.includes('ku') && langs.includes('ar'), langs.join(','));
const kuKeys = Object.keys(T.ku || {});
check('ku block has 625+ keys', kuKeys.length >= 625, kuKeys.length + ' keys');
const kuSet = new Set(kuKeys);
check('ku covers every en key', Object.keys(T.en).every((k) => kuSet.has(k)));
check('no duplicate ku keys', kuKeys.length === kuSet.size);
check('ar block untouched (still 625-ish + names)', Object.keys(T.ar).length >= 625, Object.keys(T.ar).length);
for (const l of ['en', 'es', 'ar', 'fr', 'ru', 'de', 'tr']) {
  if (!T[l].languageKurdish) { check(`languageKurdish missing in ${l}`, false); }
}
check('languageKurdish present in all 7 existing blocks',
  ['en', 'es', 'ar', 'fr', 'ru', 'de', 'tr'].every((l) => T[l].languageKurdish === 'کوردی'));

console.log('== APP.JS RTL / PDF i18n ==');
check('applyLanguage dir gate includes ku', APP.includes("html.dir = (locale === 'ar' || locale === 'ku')"));
check('applyLanguage isRTL gate includes ku', APP.includes("state.isRTL = (locale === 'ar' || locale === 'ku');"));
check('initialize dir gate includes ku', APP.includes("html.dir = (state.locale === 'ar' || state.locale === 'ku')"));
check('initialize isRTL gate includes ku', APP.includes("state.isRTL = (state.locale === 'ar' || state.locale === 'ku');"));
check('pdfReportLocaleDir includes ku', APP.includes("(locale === 'ar' || locale === 'ku') ? 'rtl' : 'ltr'"));
check('history-PDF title bar dir includes ku', APP.includes("bar.setAttribute('dir', (state.locale === 'ar' || state.locale === 'ku')"));
check('PDF_REPORT_I18N has ku', APP.includes("colCalc: 'حیسابکردن'"));
check('PDF_WEEKDAYS has ku', APP.includes("'یەکشەممە','دووشەممە'"));

console.log('== INDEX.HTML ==');
check('topBar select has ku option', (IDX.match(/value="ku" data-i18n="languageKurdish">کوردی<\/option>/g) || []).length === 2);

console.log('== STYLES.CSS RTL ==');
const arRules = (CSS.match(/body\[data-language='ar'\]/g) || []).length;
const kuRules = (CSS.match(/body\[data-language='ku'\]/g) || []).length;
check('ku selectors added (ku>0)', kuRules > 0, 'ar=' + arRules + ' ku=' + kuRules);
check('arabic ar rules preserved', arRules >= 44);
check('css braces balanced', (CSS.match(/\{/g) || []).length === (CSS.match(/\}/g) || []).length);
check('base rule merged for ar+ku', CSS.includes("body[data-language='ar'], body[data-language='ku'] {"));

console.log('== NUMBER-TO-WORDS ==');
check('getSupportedLocales includes ku', coreSrc.includes("'tr', 'ku']"), coreSrc.includes("'tr', 'ku']") ? "['en','es','ar','fr','ru','de','tr','ku']" : 'ku missing');
// natural Sorani checks
const samples = {
  '0': 'سفر', '5': 'پێنج', '10': 'دە', '12': 'دوازدە', '19': 'نۆزدە', '21': 'بیست و یەک',
  '45': 'چل و پێنج', '100': 'سەد', '250': 'دوو سەد و پەنجا', '1000': 'هەزار',
  '1573': 'هەزار و پێنج سەد و حەفتا و سێ', '1.5': 'یەک خاڵ پێنج'
};
for (const [n, want] of Object.entries(samples)) {
  const got = numberToWords(n, 'ku');
  check(`ku numberToWords(${n})`, got === want, `${got}`);
}
check('ku negative', numberToWords('-7', 'ku') === 'نێگەتیڤ حەوت', numberToWords('-7', 'ku'));
check('existing en unaffected', numberToWords('1573', 'en') === 'one thousand five hundred seventy three', JSON.stringify(numberToWords('1573', 'en')));
check('existing ar unaffected', numberToWords('1573', 'ar') === 'ألف وخمسمائة وثلاثة وسبعون');
check('existing tr unaffected', numberToWords('1573', 'tr') === 'Bin beş yüz yetmiş üç');

console.log(`\nRESULT: ${pass} PASS, ${fail} FAIL${notVerified ? ', ' + notVerified + ' NOT VERIFIED' : ''}`);