import fs from 'node:fs';
const a = fs.readFileSync('app.js','utf8');
function show(n){ const i=a.indexOf(n); if(i<0){console.log(n+':ABSENT');return;} console.log('==='+n+'==='); console.log(a.slice(i-200,i+900).replace(/\r\n/g,'\n').slice(0,1200)); console.log(''); }
show('function smartDraftSave');
show('function smartPdfBuildBlob');
show('function smartPdfRenderPreview');
show('function smartBlankOpen');
show('function smartPageCopy');
show('function smartPageMove');
