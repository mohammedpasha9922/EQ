// Check whether the 25 html-only keys are translated in ANY language block of app.js (test-only artifact).
import fs from 'node:fs';
const s = fs.readFileSync('app.js', 'utf8');
const keys = ['pdfReportsSubtitle', 'companyProfileTitle', 'companyName', 'saveBtn', 'pdfDateCurrent', 'pdfDateFormat', 'pdfDateColor', 'pdfDateBack', 'pdfDateInsert', 'pdfDateCustom', 'companyLogo', 'companySignature'];
for (const k of keys) {
  const re = new RegExp('\\b' + k + '\\s*:');
  const count = (s.match(new RegExp('\\b' + k + '\\s*:', 'g')) || []).length;
  console.log(k, '-> occurrences in app.js:', count, re.test(s) ? '' : '(never a translations key)');
}
// which language blocks contain saveBtn?
const langIdx = [...s.matchAll(/^\s{2}(en|ar|es|fr|ru|de|tr|ku):\s*\{/gm)];
console.log('language blocks:', langIdx.map((x) => x[1]).join(', '));
for (const k of ['saveBtn', 'pdfReportsSubtitle']) {
  const owners = [];
  for (const x of langIdx) {
    const start = x.index;
    const next = s.indexOf('\n  },', start);
    const blk = s.slice(start, next > 0 ? next : start + 90000);
    if (new RegExp('\\b' + k + '\\s*:').test(blk)) owners.push(x[1]);
  }
  console.log(`block owners of ${k}:`, owners.join(', ') || '(none)');
}
