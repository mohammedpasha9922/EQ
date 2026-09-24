import fs from 'node:fs';
const h = fs.readFileSync('d:/Programs EQ7/EQ/index.html', 'utf8');
const ids = ['smartPdfUploadBtn', 'smartPdfFileInput', 'smartPdfViewerArea', 'smartPdfUploadArea',
  'smartPdfViewerScroll', 'smartPdfViewerPages', 'smartPdfPageIndicator', 'smartPdfUploadError',
  'smartPdfWorkspace', 'smartDocsModal', 'pdfReportsWorkspace', 'drawerOverlay', 'featureNavBar', 'smartPdfUploadStatus'];
const lines = ids.map((i) => i + ' x' + (h.split('id="' + i + '"').length - 1));
lines.push('--- order ---');
['smartDocsModal', 'smartPdfWorkspace', 'drawerOverlay', 'pdfReportsWorkspace'].forEach((i) => {
  lines.push(i + ' @' + h.indexOf('id="' + i + '"'));
});
fs.writeFileSync('d:/Programs EQ7/EQ/tests/__p3_ids.txt', lines.join('\n'));
