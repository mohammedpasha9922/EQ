import fs from 'node:fs';
const f = 'd:/Programs EQ7/EQ/__notes_test/p11_run2.txt';
try {
  const t = fs.readFileSync(f, 'utf8');
  console.log('RUN_SIZE=' + t.length);
  const lines = t.split('\n').filter((l) => /PASS|FAIL|NOTVER|RESULTS_JSON|Error|error/i.test(l));
  console.log(lines.join('\n'));
} catch (e) {
  console.log('NOFILE: ' + e.message);
  // check err file
  try {
    const e2 = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/p11_err.txt', 'utf8');
    console.log('ERR_SIZE=' + e2.length);
    console.log(e2.slice(0, 2000));
  } catch (e3) { console.log('NO_ERR_FILE: ' + e3.message); }
}
const r = 'd:/Programs EQ7/EQ/__notes_test/p11_results.txt';
try {
  const t = fs.readFileSync(r, 'utf8');
  console.log('=== RESULTS FILE (last 60 lines) ===');
  console.log(t.split('\n').slice(-60).join('\n'));
} catch (e) { /* not yet written */ }
