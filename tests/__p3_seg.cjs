const fs = require('fs');
const dir = 'd:/Programs EQ7/EQ/';
const h = fs.readFileSync(dir + 'index.html', 'utf8');
const a = fs.readFileSync(dir + 'app.js', 'utf8');
const i1 = h.indexOf('id="smartDocsModal"');
const i2 = h.indexOf('id="drawerOverlay"');
const seg = h.slice(i1, i2);
const out = [
  'i1=' + i1,
  'i2=' + i2,
  'segLen=' + seg.length,
  'segHasUploadBtn=' + seg.includes('id="smartPdfUploadBtn"'),
  'segHasUploadPDFText=' + seg.includes('Upload PDF'),
  'segHasScroll=' + seg.includes('id="smartPdfScroll"'),
  'segHasPages=' + seg.includes('id="smartPdfPages"'),
  'segHasWorkspace=' + seg.includes('id="smartPdfWorkspace"'),
  'appFnOpenFile=' + a.includes('function smartPdfOpenFile'),
  'appFnRenderAllPages=' + a.includes('function smartPdfRenderAllPages'),
  'appFnBuildTextLayer=' + a.includes('function smartPdfBuildTextLayer'),
  'appLoop=' + a.includes('n <= smartPdfState.totalPages'),
  'appSmartPdfState=' + a.includes('smartPdfState'),
  'appConvertToViewportPoint=' + a.includes('convertToViewportPoint'),
  'cssScroll=' + fs.readFileSync(dir + 'styles.css', 'utf8').includes('.smart-pdf-scroll')
];
fs.writeFileSync(dir + 'tests/__p3_seg.txt', out.join('\n'));
