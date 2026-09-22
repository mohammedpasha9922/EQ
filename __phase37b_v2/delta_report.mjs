// Phase 37B delta vs pre-injection backups (test-only artifact).
import fs from 'node:fs';
const pairs = [
  ['app.js', 'app.js.orig'],
  ['index.html', 'index.html.orig'],
  ['styles.css', 'styles.css.orig'],
  ['numberToWords.js', 'numberToWords.js.orig'],
  ['src/core/NumberToWords.js', 'Num2WordsCore.js.orig'],
];
for (const [now, bak] of pairs) {
  if (fs.existsSync('__phase37b_v2/backup/' + bak)) {
    const a = fs.readFileSync('__phase37b_v2/backup/' + bak, 'utf8');
    const c = fs.readFileSync(now, 'utf8');
    console.log(`${now}: backup ${a.split('\n').length} lines (${a.length} B) -> now ${c.split('\n').length} lines (${c.length} B) | delta ${c.length - a.length} B`);
  } else {
    console.log(`${now}: no backup found`);
  }
}

