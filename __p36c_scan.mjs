import fs from 'node:fs';
const idx = fs.readFileSync('index.html','utf8');
const app = fs.readFileSync('app.js','utf8');
function hits(src, terms){ const out={}; for(const t of terms){ const re=new RegExp(t,'gi'); const m=src.match(re); out[t]=m?m.length:0; } return out; }
const terms = ['pdfReportsWorkspace','pdfReportsModal','smartBlank','smartPdfExport','smartPageCopy','smartPageMove','smartReviewBtn','smartSaveDraft','Create Blank','Open PDF','Duplicate','Reorder','Rotate','Recent PDFs','Scan','OCR','Drafts','Resume','Logo','Signature','Stamp','Watermark','Header\\/Footer','Native Share'];
console.log('INDEX len='+idx.length);
console.log(JSON.stringify(hits(idx,['pdfReportsWorkspace','pdfReportsModal','pdfPreviewPage','pdfLayoutToggle','smartBlank','smartDocsModal','pdfScanCreateCard','pdfOpenCard','pdfRecent','smartPageCopyBtn','smartPageMove','smartReviewBtn','smartSaveDraftBtn','smartPdfExportBtn'] ),null,2));
console.log('APP len='+app.length+' lines='+app.split('\n').length);
console.log(JSON.stringify(hits(app,['pdfReports','smartBlank','smartPageCopy','smartPageMove','smartPdfExport','buildNotePdfBlob','smartAddImage','smartAddTable','V1 Surface','pdfV1','PDF_V1','PART 36','PART36','36B','36C'] ),null,2));
// list ids around pdf
const ids=[...idx.matchAll(/id="([^"]+)"/g)].map(m=>m[1]).filter(s=>/pdf|Pdf|PDF|smart/i.test(s));
console.log('IDS('+ids.length+'):'+ids.slice(0,200).join(','));
