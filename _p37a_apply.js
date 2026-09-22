// PHASE 37A — targeted EQ -> EQ7 branding application for app.js ONLY.
// Every replacement is (a) pinned to an audited line number and (b) guarded by
// an expected content assertion. Nothing else is touched. Full log written to
// _p37a_apply_log.txt. App aborts WITHOUT writing if any assertion fails.
const fs = require('fs');
const raw = fs.readFileSync('app.js', 'utf8');
const lines = raw.split('\n'); // preserves trailing '\r' on CRLF lines
const log = [];
let fail = 0;

function replIdx(n, desc, expectedRe, from, to) {
  const i = n - 1;
  const line = lines[i];
  if (!line || !expectedRe.test(line)) {
    log.push('ABORT ' + n + ' (' + desc + '): assertion failed -> ' + (line || '').trim().slice(0, 160));
    fail++;
    return;
  }
  const isRe = from instanceof RegExp;
  const found = isRe ? from.test(line) : line.includes(from);
  if (!found) {
    log.push('ABORT ' + n + ' (' + desc + '): pattern not found -> ' + line.trim().slice(0, 160));
    fail++;
    return;
  }
  lines[i] = line.replace(from, to); // first occurrence only
  log.push('OK    ' + n + ' (' + desc + '): ' + lines[i].trim().slice(0, 160));
}

// --- translation branding keys -------------------------------------------------
for (const n of [357, 859, 1359, 1858, 2358, 2858, 3359])
  replIdx(n, "title key", /title: 'EQ',/, ": 'EQ',", ": 'EQ7',");
for (const n of [503, 976, 1504, 1975, 2475, 2975, 3476])
  replIdx(n, "drawerTitle key", /drawerTitle: 'EQ',/, "drawerTitle: 'EQ',", "drawerTitle: 'EQ7',");

// --- share branding (7 locales) ------------------------------------------------
const shareLines = [[441, 'shareTitle en'], [442, 'shareMessage en'], [915, 'shareTitle es'],
  [916, 'shareMessage es'], [1452, 'shareTitle ar'], [1453, 'shareMessage ar'],
  [1924, 'shareTitle fr'], [1925, 'shareMessage fr'], [2424, 'shareTitle ru'],
  [2425, 'shareMessage ru'], [2924, 'shareTitle de'], [2925, 'shareMessage de'],
  [3425, 'shareTitle tr'], [3426, 'shareMessage tr']];
for (const [n, d] of shareLines)
  replIdx(n, d, /^.*(shareTitle|shareMessage):/, /\bEQ\b(?!7)/, 'EQ7');

// --- Help/About branding (7 locales x 7 keys) ----------------------------------
const helpLines = [
  789, 791, 792, 812, 844, 846, 855,          // en
  1287, 1289, 1290, 1310, 1342, 1344, 1353,   // es
  1788, 1790, 1791, 1811, 1843, 1845, 1854,   // ar
  2286, 2288, 2289, 2309, 2341, 2343, 2352,   // fr
  2786, 2788, 2789, 2809, 2841, 2843, 2852,   // ru
  3287, 3289, 3290, 3310, 3342, 3344, 3353,   // de
  3787, 3789, 3790, 3810, 3842, 3844, 3853    // tr
];
const HELP_KEY = /^.*(helpSubtitle|helpAboutDesc|helpWhyTitle|helpSecHistoryDesc|helpInstallDesc1|helpBenefitsTitle|helpLangDesc):/;
for (const n of helpLines)
  replIdx(n, 'help string', HELP_KEY, /\bEQ\b(?!7)/, 'EQ7');

// --- History/Notes PDF + share literals ----------------------------------------
replIdx(5341,  'History PDF brandTitle',   /const brandTitle = 'EQ Calculator';/, "'EQ Calculator'", "'EQ7 Calculator'");
replIdx(15457, 'Notes PDF brandTitle',     /const brandTitle = 'EQ Calculator';/, "'EQ Calculator'", "'EQ7 Calculator'");
replIdx(5440,  'PDF footer link',          /footer-domain.*Open EQ Calculator/, 'Open EQ Calculator', 'Open EQ7 Calculator');
replIdx(5621,  'share title fallback',     /t\.shareTitle \|\| 'EQ Calculator History',/, "'EQ Calculator History'", "'EQ7 Calculator History'");
replIdx(5622,  'share msg fallback',       /t\.shareMessage \|\| 'Exported from EQ Calculator'/, "'Exported from EQ Calculator'", "'Exported from EQ7 Calculator'");
replIdx(5757,  'PDF filename',             /'EQ-Calculator-History\.pdf'/, "'EQ-Calculator-History.pdf'", "'EQ7-Calculator-History.pdf'");
replIdx(5765,  'share title literal',      /title: 'EQ Calculator',/, "title: 'EQ Calculator',", "title: 'EQ7 Calculator',");
replIdx(5766,  'share text literal',       /text: 'Created with EQ Calculator'/, "'Created with EQ Calculator'", "'Created with EQ7 Calculator'");
replIdx(15459, 'Notes PDF footerNote',     /const footerNote = 'Created with EQ Calculator';/, "'Created with EQ Calculator'", "'Created with EQ7 Calculator'");
replIdx(15541, 'Notes PDF title meta',     /<title>EQ Note PDF<\/title>/, '<title>EQ Note PDF</title>', '<title>EQ7 Note PDF</title>');
replIdx(16602, 'notes share fallback',     /t\.shareMessage \|\| 'Exported from EQ Calculator'/, "'Exported from EQ Calculator'", "'Exported from EQ7 Calculator'");
replIdx(17366, 'notes export fallback',    /t\.shareMessage \|\| 'Exported from EQ Calculator'/, "'Exported from EQ Calculator'", "'Exported from EQ7 Calculator'");
replIdx(18579, 'notes text export',        /— Exported from EQ Calculator/, '— Exported from EQ Calculator', '— Exported from EQ7 Calculator');

if (fail) {
  fs.writeFileSync('_p37a_apply_log.txt', log.join('\r\n') + '\r\n\r\n*** ABORTED — ' + fail + ' assertion(s) failed; app.js NOT written ***');
  console.log('ABORTED, failures=' + fail);
  process.exit(1);
}
fs.writeFileSync('app.js', lines.join('\n'));
fs.writeFileSync('_p37a_apply_log.txt', log.join('\r\n') + '\r\n\r\nALL ' + log.length + ' REPLACEMENTS APPLIED');
console.log('applied', log.length, 'replacements');

// Post-check: remaining \bEQ\b occurrences must be only allowed ones.
const leftovers = [];
fs.readFileSync('app.js', 'utf8').split('\n').forEach((l, i) => {
  if (/\bEQ\b(?!7)/.test(l)) leftovers.push((i + 1) + ': ' + l.trim().slice(0, 160));
});
fs.writeFileSync('_p37a_leftovers.txt', leftovers.join('\r\n'));
console.log('leftover EQ occurrences:', leftovers.length);
