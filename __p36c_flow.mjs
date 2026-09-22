import fs from 'node:fs';
const app = fs.readFileSync('app.js','utf8');
// blank image/table/preview/save seams
for(const n of ['smartBlankInsertImage','insertElement','smartAddImage','smartTableCreate','smartBlankPreview','smartPdfPreview','Review','smartDraftSave','smartPdfExport','buildBlob','smartPdfResultModal','smartPdfPreviewPages']){
  const i = app.indexOf(n);
  if(i<0){ console.log(n+': ABSENT'); continue; }
  console.log('=== '+n+' @'+i+' ===');
  console.log(app.slice(Math.max(0,i-300), i+700).replace(/\r\n/g,'\n').slice(0,1100));
  console.log('');
}
