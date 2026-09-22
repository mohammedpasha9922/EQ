import fs from 'node:fs';
const a = fs.readFileSync('app.js','utf8');
for(const n of ['pdfPgRot','pdfPgDup','smartPdfPagesList','pdfPgAdded']){
  let i=-1, c=0;
  while(true){ i=a.indexOf(n,i+1); if(i<0||c>6) break; c++;
    console.log('==='+n+' #'+c+' @'+i+'===');
    console.log(a.slice(Math.max(0,i-260),i+420).replace(/[\r\n]+/g,' ').slice(0,720)); console.log('');
  }
}
