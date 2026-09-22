const fs = require('fs');
const M = JSON.parse(fs.readFileSync('__phase37b/ku_map.json', 'utf8'));
const EN = JSON.parse(fs.readFileSync('__phase37b/en_keys.json', 'utf8'));
const missing = [];
for (const k of Object.keys(EN)) { if (!(k in M)) missing.push(k); }
fs.writeFileSync('__phase37b/missing_keys.txt', missing.join('\n'), 'utf8');
console.log('ku_map.json keys:', Object.keys(M).length, '/', Object.keys(EN).length);
console.log('missing keys:', missing.length);
if (missing.length < 40) console.log('missing:', missing.join(', '));
