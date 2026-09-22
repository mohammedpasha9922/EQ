import fs from 'node:fs';
const idx = fs.readFileSync('index.html','utf8');
const app = fs.readFileSync('app.js','utf8');
const ids=[...idx.matchAll(/id="([^"]+)"/g)].map(m=>m[1]).filter(s=>/rot|Rot|design|Design|pages|Pages/i.test(s));
console.log('ROT/DESIGN/PAGES IDS: '+ids.join(','));
for(const n of ['smartPageDesign','smartPdfPagesMenu','smartPageRotate','rotate','smartPdfRotate','page-rotate']){
  const i=app.indexOf(n); console.log(n+': '+(i<0?'ABSENT':'@'+i+' :: '+app.slice(Math.max(0,i-200),i+300).replace(/\r\n/g,' ').slice(0,560)));
}
