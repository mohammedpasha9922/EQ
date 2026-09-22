import fs from 'node:fs';
const css = fs.readFileSync('styles.css','utf8');
const app = fs.readFileSync('app.js','utf8');
for(const n of ['data-pdf-v1','pdf-v1','pdfV1','smartPdfAdd','smartToolbar','smartBlank','V1']){
  const re = new RegExp(n,'gi'); let m, c=0;
  console.log('=== '+n+' ===');
  while((m=re.exec(css))!==null && c<12){ c++; console.log(' css@'+m.index+': '+JSON.stringify(css.slice(Math.max(0,m.index-200), m.index+300)).slice(0,650)); }
  if(c===0) console.log(' (no css hit)');
}
// app: hiding logic around 36B for Add menu + gate
let idx = app.indexOf('PDF V1 release surface');
console.log(app.slice(Math.max(0,idx-1500), idx+4500).slice(0,7000));
// find smartPdfAddItem function gating
let j = app.indexOf('function smartPdfAddItem');
console.log('--- smartPdfAddItem ---');
console.log(app.slice(j, j+6000).slice(0,6500));
