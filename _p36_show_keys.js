const fs = require('fs');
const src = fs.readFileSync('app.js', 'utf8');
function grab(loc) {
  const m = src.indexOf('  ' + loc + ': {');
  const start = src.indexOf('{', m);
  let i = start, depth = 0, end = -1;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    else if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      const q = src[i]; i++;
      while (i < src.length) { if (src[i] === '\\') i++; else if (src[i] === q) break; i++; }
    }
  }
  return eval('(' + src.slice(start, end + 1) + ')');
}
const en = grab('en'), ar = grab('ar');
const keys = ['smartPdfAdd','smartPdfAddText','smartPdfAddImage','smartPdfAddLogo','smartPdfAddSignature','smartPdfAddStamp','smartPdfAddDate','smartPdfAddTable','smartPdfMark','smartPdfMarkHighlight','smartPdfMarkUnderline','smartPdfMarkDraw','smartPdfMarkComment','smartPdfMarkDone','smartPdfMarkCancel','smartPdfCommentTitle','smartPdfCommentText','smartPdfCommentAdd','smartPdfMarkSelectText','smartPdfMarkDrawHint','smartPdfMarkCommentLabel','smartPdfMarkAddComment','pdfTblRow','pdfTblRowDel','pdfTblCol','pdfTblColDel','pdfTblAlignL','pdfTblAlignC','pdfTblAlignR','pdfTblBold','pdfTblItalic','pdfTblTextColor','pdfTblBg','pdfTblBorder','pdfTblNoBorder','pdfTblRowH','pdfTblControls','smartPdfPages','pdfPgAdd','pdfPgDel','pdfPgRot','pdfPgDup','pdfPgAdded','pdfPgDeleted','pdfPgRotated','pdfPgDuplicated','pdfPgLast'];
for (const k of keys) console.log(k + '\tEN="' + en[k] + '"\tAR="' + ar[k] + '"');
