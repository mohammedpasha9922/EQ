const fs = require('fs');
const HERE = 'd:/Programs EQ7/EQ/__notes_test';
const chunks = ['_p24_ch1.mjs','_p24_ch2.mjs','_p24_ch3.mjs','_p24_ch4.mjs','_p24_ch5.mjs','_p24_ch6.mjs','_p24_ch7.mjs','_p24_ch8.mjs'];
let out = '';
for (const c of chunks) { out += fs.readFileSync(HERE + '/' + c, 'utf8').replace(/\r?\n$/, '\n'); }
fs.writeFileSync(HERE + '/p24_harness.mjs', out);
console.log('rebuilt p24_harness.mjs bytes=', out.length);
