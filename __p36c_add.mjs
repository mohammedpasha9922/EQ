import fs from 'node:fs';
const a = fs.readFileSync('app.js','utf8');
let i = a.indexOf('function smartAddInsert');
console.log(a.slice(i, i+3600).replace(/\r\n/g,'\n'));