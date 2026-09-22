import fs from 'node:fs';
const f = 'd:/Programs EQ7/EQ/__notes_test/p8_fresh2.txt';
try {
  const t = fs.readFileSync(f, 'utf8');
  const lines = t.split('\n').filter((l) => /FAIL|RESULTS_JSON|PREEXISTING|=== PART/.test(l));
  console.log(lines.join('\n'));
} catch (e) { console.log('NOFILE: ' + e.message); }