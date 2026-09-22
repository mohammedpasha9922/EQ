const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js','utf8').split('\n');
const keys=['smartScanReviewNote','smartScanStatusNeeds','smartScanStatusEdited','smartScanStructTitle','smartScanStructHeading','smartScanStructParagraph','smartScanStructTable','smartScanEditTitle','smartScanEditHint','smartScanCreatePdf','smartScanRescan','smartScanAccept'];
const blocks=[522,1017,1508,2001,2493,2985,3478];
for(const i of blocks){
  const seg=s.slice(i,i+240).join('\n');
  const miss=keys.filter(k=>!new RegExp(k+'(?:\\s*):').test(seg));
  console.log('BLOCK@'+i,' MISSING='+JSON.stringify(miss));
}