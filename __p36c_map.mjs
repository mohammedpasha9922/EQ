import fs from 'node:fs';
const app = fs.readFileSync('app.js','utf8');
const needles = ['pdfScanCreateCard','pdfOpenCard','pdf-open','pdf-scan-create','smartBlankOpen','smartImport','open-pdf-reports','applyPdfV1','V1_HIDDEN','data-pdf-v1','pdfV1Hide'];
for(const n of needles){
  console.log('=== '+n+' ===');
  let idx=-1, c=0;
  while(true){ idx=app.indexOf(n, idx+1); if(idx<0||c>8) break; c++;
    console.log('  @'+idx+': ...'+JSON.stringify(app.slice(Math.max(0,idx-260), idx+320)).slice(0,700));
  }
}
