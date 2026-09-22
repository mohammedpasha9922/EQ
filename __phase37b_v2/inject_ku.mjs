// PHASE 37B — inject validated Kurdish Sorani (ku) into production files.
// Only applies changes strictly necessary for Kurdish language support.
import { readFileSync, writeFileSync } from 'node:fs';
import { ku } from './ku_data.mjs';

const APP = new URL('../app.js', import.meta.url);
const IDX = new URL('../index.html', import.meta.url);
const CSS = new URL('../styles.css', import.meta.url);
const NTW = new URL('../numberToWords.js', import.meta.url);
const NTWCORE = new URL('../src/core/NumberToWords.js', import.meta.url);

// ---------- ku translations JS block ----------
const entries = Object.keys(ku);
const lines = entries.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(ku[k])},`);
const kuBlock = `  ku: {\n${lines.join('\n')}\n  }`;

// ---------- RTL gate replacements (app.js) ----------
const rtlEdits = [
  ["html.dir = locale === 'ar' ? 'rtl' : 'ltr';",
   "html.dir = (locale === 'ar' || locale === 'ku') ? 'rtl' : 'ltr';"],
  ["state.isRTL = locale === 'ar';",
   "state.isRTL = (locale === 'ar' || locale === 'ku');"],
  ["html.dir = state.locale === 'ar' ? 'rtl' : 'ltr';",
   "html.dir = (state.locale === 'ar' || state.locale === 'ku') ? 'rtl' : 'ltr';"],
  ["state.isRTL = state.locale === 'ar';",
   "state.isRTL = (state.locale === 'ar' || state.locale === 'ku');"],
  ["function pdfReportLocaleDir(locale) { return locale === 'ar' ? 'rtl' : 'ltr'; }",
   "function pdfReportLocaleDir(locale) { return (locale === 'ar' || locale === 'ku') ? 'rtl' : 'ltr'; }"],
  ["bar.setAttribute('dir', state.locale === 'ar' ? 'rtl' : 'ltr');",
   "bar.setAttribute('dir', (state.locale === 'ar' || state.locale === 'ku') ? 'rtl' : 'ltr');"]
];

function applyCount(src, from, to) {
  let n = 0;
  while (src.includes(from)) { src = src.replace(from, to); n++; }
  if (n === 0) throw new Error('PATTERN NOT FOUND: ' + from);
  return [src, n];
}
// ================= APP.JS =================
let app = readFileSync(APP, 'utf8');
let report = [];

// A) ku translations block (before the translations object closes)
app = app.replace(/pdfPgLast: 'Bir belge en az bir sayfa içermelidir'\s*\}\s*\}\;/m,
  () => "pdfPgLast: 'Bir belge en az bir sayfa içermelidir'},\n" + kuBlock + "\n};");
report.push('injected ku translations block');

// B) languageKurdish selector label into the 7 existing language blocks
app = app.replace(/^(\s*)languageTurkish: 'Türkçe',$/gm,
  "$1languageTurkish: 'Türkçe',\n$1languageKurdish: 'کوردی',");
report.push('added languageKurdish to the 7 existing language blocks');

// C) RTL gates
for (const [from, to] of rtlEdits) {
  const [s, n] = applyCount(app, from, to);
  app = s; report.push(`RTL gate x${n}: ${from}`);
}

// D) PDF_REPORT_I18N ku entry
app = app.replace(/companyNameBtn: 'Şirket Adı'\s*\}\s*\}\;/m,
  () => "companyNameBtn: 'Şirket Adı'},\n  ku: { subtitle: 'مێژووی حیسابکردن', colCalc: 'حیسابکردن', colResult: 'ئەنجام', colNote: 'تێبینی', total: 'کۆی گشتی', totalFull: 'کۆی گشتی: ', footerNote: 'EQ7 — حیسابی ژیر، گۆڕینی دراو، ئامرازە داراییەکان، مێژوو و ڕاپۆرتی پرۆفیشناڵی PDF.', titlePh: 'ناونیشانی ڕاپۆرت (هەڵبژاردەیی)', companyNameBtn: 'ناوی کۆمپانیا' }\n};");
report.push('added ku to PDF_REPORT_I18N');

// E) PDF_WEEKDAYS ku entry
app = app.replace(/tr: \['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'\]\s*\}\;/m,
  "tr: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],\n  ku: ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە']\n};");
report.push('added ku to PDF_WEEKDAYS');

writeFileSync(APP, app, 'utf8');

// ================= NUMBER-TO-WORDS (root engine) =================
let ntw = readFileSync(NTW, 'utf8');

// ku number map (after the tr map)
const kuMap = `  ku: {\n    ones: ['سفر','یەک','دوو','سێ','چوار','پێنج','شەش','حەوت','هەشت','نۆ'],\n    teens: ['دە','یازدە','دوازدە','سیانزە','چواردە','پازدە','شازدە','حەفدە','هەژدە','نۆزدە'],\n    tens: ['','','بیست','سی','چل','پەنجا','شەست','حەفتا','هەشتا','نەوەد'],\n    hundred: 'سەد',\n    scales: ['','هەزار','ملیۆن','ملیار','تریلیۆن'],\n    negative: 'نێگەتیڤ',\n    decimal: 'خاڵ'\n  }`;
ntw = ntw.replace(/decimal: 'virgül'\s*\}\s*\}\;/m, () => "decimal: 'virgül'},\n" + kuMap + "\n};");
report.push('added ku number map');

// converters before convertChunk
const converters = `function convertKurdishChunk(value) {
  const ones = ['سفر','یەک','دوو','سێ','چوار','پێنج','شەش','حەوت','هەشت','نۆ'];
  const teens = ['دە','یازدە','دوازدە','سیانزە','چواردە','پازدە','شازدە','حەفدە','هەژدە','نۆزدە'];
  const tens = ['','','بیست','سی','چل','پەنجا','شەست','حەفتا','هەشتا','نەوەد'];
  if (value < 10) return ones[value];
  if (value < 20) return teens[value - 10];
  if (value < 100) {
    const t = Math.floor(value / 10);
    const r = value % 10;
    return r === 0 ? tens[t] : \`\${tens[t]} و \${ones[r]}\`;
  }
  const h = Math.floor(value / 100);
  const r = value % 100;
  const base = h === 1 ? 'سەد' : \`\${ones[h]} سەد\`;
  return r === 0 ? base : \`\${base} و \${convertKurdishChunk(r)}\`;
}

function convertKurdishIntegerToWords(integerValue) {
  const scales = ['', 'هەزار', 'ملیۆن', 'ملیار', 'تریلیۆن'];
  if (integerValue === 0n) return 'سفر';
  const groups = [];
  let remaining = integerValue;
  while (remaining > 0n) { groups.unshift(Number(remaining % 1000n)); remaining = remaining / 1000n; }
  const parts = [];
  groups.forEach((group, index) => {
    const scaleIndex = groups.length - index - 1;
    const scaleName = scales[scaleIndex] || '';
    if (group === 0) return;
    const groupWords = group < 1000 ? convertKurdishChunk(group) : convertKurdishIntegerToWords(BigInt(group));
    if (!scaleName) parts.push(groupWords);
    else if (group === 1 && scaleName === 'هەزار') parts.push('هەزار');
    else parts.push(\`\${groupWords} \${scaleName}\`.trim());
  });
  return parts.join(' و ');
}

`;
ntw = ntw.replace(/function convertChunk\(value, locale\) \{/, converters + 'function convertChunk(value, locale) {');
report.push('added Kurdish converters');

// convertChunk ku branch
ntw = ntw.replace("  if (locale === 'ar') return convertArabicChunk(value);\n  if (locale === 'tr') return convertTurkishChunk(value, map);",
  "  if (locale === 'ar') return convertArabicChunk(value);\n  if (locale === 'tr') return convertTurkishChunk(value, map);\n  if (locale === 'ku') return convertKurdishChunk(value);");
report.push('added ku branch in convertChunk');

// convertIntegerToWords ku branch
ntw = ntw.replace("  if (locale === 'ar') return convertArabicIntegerToWords(integerValue);\n\n  const groups",
  "  if (locale === 'ar') return convertArabicIntegerToWords(integerValue);\n  if (locale === 'ku') return convertKurdishIntegerToWords(integerValue);\n\n  const groups");
report.push('added ku branch in convertIntegerToWords');

// invalid-number message ku case
ntw = ntw.replace(": locale === 'tr' ? 'geçersiz sayı' : 'ungültige Zahl';",
  ": locale === 'tr' ? 'geçersiz sayı' : locale === 'ku' ? 'ژمارەی نادروست' : 'ungültige Zahl';");
report.push('added ku invalid-number message');

writeFileSync(NTW, ntw, 'utf8');

// ================= src/core/NumberToWords.js =================
let core = readFileSync(NTWCORE, 'utf8');
core = core.replace("return ['en', 'es', 'ar', 'fr', 'ru', 'de', 'tr'];",
  "return ['en', 'es', 'ar', 'fr', 'ru', 'de', 'tr', 'ku'];");
writeFileSync(NTWCORE, core, 'utf8');
report.push('added ku to getSupportedLocales');

console.log(report.join('\n'));
// ================= INDEX.HTML =================
let idx = readFileSync(IDX, 'utf8');
const opt = `<option value="ku" data-i18n="languageKurdish">کوردی</option>`;
const [idx2, nSel] = applyCount(idx,
  '<option value="tr" data-i18n="languageTurkish">Türkçe</option>',
  '<option value="tr" data-i18n="languageTurkish">Türkçe</option>\n            ' + opt);
idx = idx2;
writeFileSync(IDX, idx, 'utf8');
report.push(`added Kurdish option to language selector(s) x${nSel}`);

// ================= STYLES.CSS =================
let css = readFileSync(CSS, 'utf8');

// Extend every body[data-language='ar'] rule so it also applies to Kurdish.
// Preserves the exact Arabic rule and adds an identical Kurdish selector.
function extendCssArToKu(src) {
  return src.replace(/body\[data-language='ar'\]([^{}\n,]*)([,{])/g, (m, sel, term) => {
    const suffix = sel.trim();
    if (suffix === '' && term === '{') {
      // The base rule "body[data-language='ar'] {" -> merge both in one selector group.
      return `body[data-language='ar'], body[data-language='ku'] {`;
    }
    return `body[data-language='ar']${sel}${term}\nbody[data-language='ku']${sel}${term === '{' ? '{' : ','}`;
  });
}

const before = (css.match(/body\[data-language='ar'\]/g) || []).length;
css = extendCssArToKu(css);
const afterAr = (css.match(/body\[data-language='ar'\]/g) || []).length;
const afterKu = (css.match(/body\[data-language='ku'\]/g) || []).length;

// brace balance sanity check
const opens = (css.match(/\{/g) || []).length;
const closes = (css.match(/\}/g) || []).length;
if (opens !== closes) throw new Error('CSS brace imbalance after transform: ' + opens + ' vs ' + closes);

writeFileSync(CSS, css, 'utf8');
report.push(`CSS: ar occurrences before=${before}, after ar=${afterAr}, ku=${afterKu}, braces balanced`);

console.log('\nDONE.\n' + report.join('\n'));