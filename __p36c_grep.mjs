import fs from 'node:fs';
const app = fs.readFileSync('app.js','utf8');
const lines = app.split('\n');
const out=[];
for(let i=0;i<lines.length;i++){
  if(/PART\s?36|36B|pdfV1|PDF V1|PDF_V1|pdf-v1/i.test(lines[i])){
    out.push('--- line '+(i+1)+': '+lines[i].slice(0,220));
    for(let j=i+1;j<Math.min(i+6,lines.length);j++) out.push('    '+(j+1)+': '+lines[j].slice(0,200));
  }
}
console.log(out.join('\n').slice(0,12000));
console.log('TOTAL matches='+out.length);
