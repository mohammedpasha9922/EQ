import fs from 'node:fs';
const a = fs.readFileSync('app.js','utf8');
let i = a.indexOf('window.__smartSave =');
console.log('--- __smartSave ---'); console.log(a.slice(i, i+1600));
i = a.indexOf('function smartImportOpen');
console.log('--- smartImportOpen ---'); console.log(a.slice(i, i+1200));