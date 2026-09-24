// temp probe: is the smart_pdf_phase_static failure pre-existing at HEAD?
const { execSync } = require('child_process');
const fs = require('fs');
const head = execSync('git show HEAD:index.html', { cwd: 'd:/Programs EQ7/EQ', maxBuffer: 1024 * 1024 * 120 }).toString();
const headApp = execSync('git show HEAD:app.js', { cwd: 'd:/Programs EQ7/EQ', maxBuffer: 1024 * 1024 * 400 }).toString();
const seg = head.slice(head.indexOf('id="smartDocsModal"'), head.indexOf('id="drawerOverlay"'));
const out = [
  'headSegLen=' + seg.length,
  'hasUploadBtn=' + seg.includes('id="smartPdfUploadBtn"'),
  'hasFileInput=' + seg.includes('id="smartPdfFileInput"'),
  'hasWorkspace=' + seg.includes('id="smartPdfWorkspace"'),
  'hasScroll=' + seg.includes('id="smartPdfScroll"'),
  'hasPages=' + seg.includes('id="smartPdfPages"'),
  'headHasSmartDocsAction=' + head.includes('data-action="open-smart-docs"'),
  'headHasSmartPdfUploadBtn=' + head.includes('id="smartPdfUploadBtn"'),
  'headHasSmartPdfWorkspace=' + head.includes('id="smartPdfWorkspace"'),
  'headAppHasSmartPdfOpenFile=' + headApp.includes('function smartPdfOpenFile'),
  'headAppHasSmartPdfRenderAllPages=' + headApp.includes('function smartPdfRenderAllPages'),
  'headCssHasSmartPdfScroll=' + execSync('git show HEAD:styles.css', { cwd: 'd:/Programs EQ7/EQ', maxBuffer: 1024 * 1024 * 120 }).toString().includes('.smart-pdf-scroll')
];
fs.writeFileSync('d:/Programs EQ7/EQ/tests/__p3_head_seg.txt', out.join('\n'));
