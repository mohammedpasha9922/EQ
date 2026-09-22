// simple reader for regress output + summary
import fs from 'node:fs';
const base = 'd:/Programs EQ7/EQ/__notes_test/';
const out = base + '_p11_regress_out.txt';
const sum = base + '_p11_regress_summary.txt';
console.log('=== REGRESS OUT ===');
try { console.log(fs.readFileSync(out, 'utf8')); } catch(e) { console.log('NOFILE out: ' + e.message); }
console.log('\n=== REGRESS SUMMARY ===');
try { console.log(fs.readFileSync(sum, 'utf8')); } catch(e) { console.log('NOFILE summary: ' + e.message); }
