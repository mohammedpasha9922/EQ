import fs from 'fs';

/* ============================================================
   KURDISH SORANI (ku) — Natural Sorani, Western digits,
   EQ7 branding preserved. RTL: yes.
   ============================================================ */

// Build the ku block text to inject into translations
const kuLines = [];
const pad = '  ';

function addLine(key, val) {
  kuLines.push(pad + key + ': ' + JSON.stringify(val));
}

addLine('eyebrow', '');
addLine('title', 'EQ7');
addLine('install', 'لە سەر بەندەوە دەست بکەرەوە');
addLine('actions', 'فەرموێنەکان');
addLine('notesManagerTitle', 'بازرگای نۆتەکان');
addLine('notesManagerSubtitle', 'نۆتەکان لە فۆلدرەکاندا تەژەوێر بکە و تەواوی並如 ئەکەنەرێک بکەرەوە.');
addLine('foldersTitle', 'فۆلدرەکان');
addLine('addFolder', '+ فۆلدر');
addLine('newNoteButton', 'نۆتەی تەواوی لمە');
addLine('notesTitle', 'نۆتەکان');
addLine('refreshNotes', 'تازەکردنەوە');
addLine('fullScreenNoteTitle', 'نۆتەی تەواوی لمە');
addLine('noteFolderLabel', 'فۆلدر');
addLine('noteTitleLabel', 'ناوبرە');
addLine('noteTitlePlaceholder', 'ناوبرەی نۆتە');
addLine('folderSelectLabel', 'فۆلدر');
addLine('noteBodyPlaceholder', 'دەستەوە لە نووسین...');
addLine('noteTableInsertPopupTitle', 'خۆشی چەپەڕە');
addLine('noteHeadingMenuLabel', 'سەردان');
addLine('noteHeading1Label', 'سەردان ١');
addLine('noteHeading2Label', 'سەردان ٢');
addLine('noteHeading3Label', 'سەردان ٣');
addLine('noteNormalTextLabel', 'دەقێکی ئاسایی');
addLine('noteTableRowsLabel', 'ڕێزان');
addLine('noteTableColsLabel', 'کۆتایی');
addLine('noteTableHeaderRowLabel', 'ڕێزە دەقەکانی سەردێڕ');
addLine('noteTableInsertBtnLabel', 'خۆشی چەپەڕە');
addLine('noteImageLabel', 'وێنە');
addLine('noteImageUpload', 'بارکردن');
addLine('noteImageCamera', 'بەرنامەی کلیبەرە');
addLine('noteTablePresetCustomLabel', 'تایبەت');
addLine('untitled', 'تەواوی لمە');
addLine('pdfPreviewTitle', 'پێشبینەوەی PDF');
addLine('pdfPrevPage', 'پەڕەی پێشوو');
addLine('pdfNextPage', 'پەڕەی داهاتوو');
addLine('pdfZoomIn', 'زۆرکردن');
addLine('pdfZoomOut', 'کەمکردن');
addLine('pdfZoomFit', 'جێبەجێکردنەوە');
addLine('pdfRotate', 'گەڕان');
addLine('pdfShare', 'پیشاندانی / پاشەکردنی PDF');
addLine('pdfClose', 'پێشکەشکردنی پێشبینەوە');
addLine('pdfMore', 'ئامرازە ئاساییەکان');
addLine('pdfPrint', 'چاپکردن');
addLine('pdfSave', 'پاشەکردنەوە لە ئامرازی');
addLine('pdfAnnoEdit', 'باشەکاریەکانی دەقکردن');
addLine('pdfAnnoText', 'دەق چەپەڕە');
addLine('pdfAnnoHighlight', 'ڕوونکردنەوە');
addLine('pdfAnnoDraw', 'پیشاندانی ێ');
addLine('pdfAnnoUnderline', 'بەستەربوونەوە');
addLine('pdfAnnoStrike', 'سڕینەوەی لاین');
addLine('pdfAnnoRect', 'دو۔ارجەی بەرەو');
addLine('pdfAnnoCircle', 'دایەری دەستە');
addLine('pdfAnnoLine', 'ڕێزە دەقەکانی');
addLine('pdfAnnoClear', 'پارەی باشەکاریەکان');
addLine('pdfAnnoNote', 'نۆتەی چەپەڕە');
addLine('pdfDocOptions', 'هەڵەی دەقەکانی دەق');
addLine('pdfDocTemplate', 'نامەنیشانەکان');
addLine('pdfDocHeader', 'سەرەتای دەق');
addLine('pdfDocFooter', 'ئاخرەی دەق');
addLine('pdfDocWatermark', 'وێنەی دەق');
addLine('pdfDocWmText', 'دەقی وێنە');
addLine('pdfTplBlank', '');
addLine('pdfTplReport', 'تێبینەوە');
addLine('pdfTplInvoice', 'فەرموێنەی فەروە');
addLine('pdfTplReceipt', 'غەڕانەوە');
addLine('pdfTplContract', 'پەیوەندی');
addLine('pdfTplCv', 'CV');
addLine('pdfTplBusiness', 'تێبینەوەی فەرموێنەکان');
addLine('pdfTplEngineering', 'تێبینەوەی مەعاڵەکان');
addLine('pdfTplLetter', 'خۆلە');

fs.writeFileSync('__phase37b/ku_chunk1.txt', kuLines.join('\n'), 'utf8');
console.log('chunk1 written', kuLines.length);