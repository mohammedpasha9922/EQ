// Apply the remaining Phase 37B edits: index.html language selector + styles.css RTL extension.
// Idempotent — skips a step if already applied.
import { readFileSync, writeFileSync } from 'node:fs';

const IDX = new URL('../index.html', import.meta.url);
const CSS = new URL('../styles.css', import.meta.url);

// ---- index.html ----
let idx = readFileSync(IDX, 'utf8');
const kuOpt = '<option value="ku" data-i18n="languageKurdish">کوردی</option>';
if (idx.includes('data-i18n="languageKurdish"')) {
  console.log('index.html: Kurdish option already present, skipped.');
} else {
  const from = '<option value="tr" data-i18n="languageTurkish">Türkçe</option>';
  if (!idx.includes(from)) throw new Error('index.html tr option not found');
  idx = idx.split(from).join(from + '\n            ' + kuOpt);
  writeFileSync(IDX, idx, 'utf8');
  console.log('index.html: added Kurdish option to 2 selector(s).');
}

// ---- styles.css ----
let css = readFileSync(CSS, 'utf8');
function extendCssArToKu(src) {
  return src.replace(/body\[data-language='ar'\]([^{}\n,]*)([,{])/g, (m, sel, term) => {
    const suffix = sel.trim();
    if (suffix === '' && term === '{') return `body[data-language='ar'], body[data-language='ku'] {`;
    // Ar line ends with a comma; the (single) rule-opening brace stays on the ku line only.
    const s = sel.trimEnd();
    return `body[data-language='ar']${s},\nbody[data-language='ku']${s}${term}`;
  });
}
if (/data-language='ku'/.test(css)) {
  console.log('styles.css: Kurdish selectors already present, skipped.');
} else {
  const arBefore = (css.match(/body\[data-language='ar'\]/g) || []).length;
  css = extendCssArToKu(css);
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  if (opens !== closes) throw new Error('CSS brace imbalance: ' + opens + ' vs ' + closes);
  writeFileSync(CSS, css, 'utf8');
  const arAfter = (css.match(/body\[data-language='ar'\]/g) || []).length;
  const kuAfter = (css.match(/body\[data-language='ku'\]/g) || []).length;
  console.log(`styles.css: ar before=${arBefore}, ar after=${arAfter}, ku=${kuAfter}, braces ok`);
}