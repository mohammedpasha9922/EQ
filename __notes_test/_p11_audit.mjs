import fs from 'node:fs';
for (const f of ['p11_run.txt', 'p11_err.txt']) {
  try {
    const t = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/' + f, 'utf16le').replace(/^\uFEFF/, '');
    console.log('=== ' + f + ' (' + t.length + ' chars) ===');
    console.log(t || '(empty)');
  } catch (e) { console.log('=== ' + f + ': NOFILE ==='); }
}

