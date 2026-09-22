import fs from 'fs';
const s = fs.readFileSync('app.js', 'utf8').replace(/\r\n/g, '\n');

// Count various RTL gate patterns
const stateAr = s.match(/state\.locale\s*===\s*'ar'/g);
console.log('state.locale === ar:', stateAr ? stateAr.length : 0);

const localeAr = s.match(/locale\s*===\s*'ar'/g);
console.log('locale === ar:', localeAr ? localeAr.length : 0);

const arTernary = s.match(/===\s*'ar'\s*\?/g);
console.log("=== 'ar' ?:", arTernary ? arTernary.length : 0);

const isRTL = s.match(/state\.isRTL/g);
console.log('state.isRTL:', isRTL ? isRTL.length : 0);

// Total lines with 'ar' in RTL context
const lines = s.split('\n');
let rtlLines = [];
lines.forEach((l, i) => {
  if (l.includes("=== 'ar'") || l.includes("=== 'ar' ?") || l.includes("=== 'ar'") || l.includes("'ar' ?")) {
    rtlLines.push({line: i + 1, text: l.trim().substring(0, 80)});
  }
});
console.log('RTL gate lines:', rtlLines.length);
rtlLines.forEach(r => console.log('  ' + r.line + ': ' + r.text));
