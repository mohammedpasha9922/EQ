import fs from 'node:fs';
const t = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/p8_part3_run.txt', 'utf8');
const e = fs.readFileSync('d:/Programs EQ7/EQ/__notes_test/p8_part3_err.txt', 'utf8');
console.log('OUT:' + (t ? t.slice(0, 800) : 'EMPTY'));
console.log('ERR:' + (e ? e.slice(0, 300) : 'EMPTY'));