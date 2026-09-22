// SMART DOCUMENTS CLEAN RESET — final consolidated verification
const fs = require('fs');
const out = [];
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

out.push('=== 1) ENTRY POINT (must exist) ===');
out.push('index.html has #smartDocsModal      : ' + /id="smartDocsModal"/.test(html));
out.push('index.html has #closeSmartDocs      : ' + /id="closeSmartDocs"/.test(html));
out.push('index.html has Smart Documents label: ' + /Smart Documents/.test(html));
out.push('index.html opener data-action       : ' + (/open-smart-docs/.test(html) ? 'PRESENT' : 'MISSING'));
out.push('app.js openSmartDocs() defined      : ' + /function openSmartDocs\(/.test(app));
out.push('app.js closeSmartDocs() defined     : ' + /function closeSmartDocs\(/.test(app));
out.push('app.js open handler wired           : ' + /open-smart-docs/.test(app));

out.push('');
out.push('=== 2) WORKSPACE IS EMPTY / CLEAN ===');
const body = html.match(/<div id="smartDocsModal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
out.push('smart-docs-body present             : ' + /class="smart-docs-body"/.test(html));
out.push('smart-workspace-empty present       : ' + /class="smart-workspace-empty"/.test(html));
const emptyDiv = html.match(/<div class="smart-workspace-empty">([\s\S]*?)<\/div>/);
out.push('workspace-empty inner content       : ' + JSON.stringify(emptyDiv ? emptyDiv[1] : 'NOT FOUND'));

out.push('');
out.push('=== 3) OLD SMART DOCUMENTS UI MUST BE GONE (index.html) ===');
const oldHtmlMarkers = ['smart-doc-card', 'smart-docs-grid', 'smart-docs-heading', 'smartBlankCanvas',
  'smartBlankCanvasHolder', 'smartDocumentContent', 'data-toolbar="blank-doc"', 'smart-tool-btn',
  'smartAddMenu', 'smart-toolbar', 'smart-doc-text-block', 'smart-doc-table', 'smart-doc-signature',
  'smart-doc-image', 'smart-doc-logo', 'smart-doc-divider', 'smart-doc-border', 'smart-doc-page',
  'smartLogoBar', 'smartScan', 'smartImport'];
oldHtmlMarkers.forEach((m) => out.push('  ' + m.padEnd(28) + ': ' + (html.indexOf(m) === -1 ? 'REMOVED' : 'STILL PRESENT')));

out.push('');
out.push('=== 4) FORBIDDEN NEW FEATURES (must NOT exist) ===');
['pdfViewer', 'pdfEditor', 'pdfUpload', 'smartDocSave', 'smartDocExport', 'smartDocShare',
 'smartToolbarSave', 'smartExportPdf'].forEach((m) => out.push('  ' + m.padEnd(28) + ': ' + (app.indexOf(m) === -1 ? 'ABSENT' : 'PRESENT!')));

out.push('');
out.push('=== 5) SIBLING FEATURES INTACT ===');
const sib = {
  'Calculator (openCalculator/mode)': /generalCalculatorPanel/.test(app) && /primaryDisplay/.test(app),
  'Currency (currencyService)': /currencyServiceInstance|CurrencyService/.test(app),
  'Notes (notesManagerModal wiring)': /notesManagerModal/.test(html) && /renderNotes|saveNote/.test(app),
  'Notes PDF': /notePdfPreviewModal/.test(html),
  'PDF Reports': /pdfReportsWorkspace/.test(html),
  'PDF V1': /pdfV1/.test(app),
  'Navigation/drawer': /id="drawer"/.test(html) && /id="drawerOverlay"/.test(html),
  'Ad Bar placeholder': /ad-placeholder|adBar/.test(html),
  'Service Worker': /serviceWorker/.test(app),
  'Manifest link': /manifest\.json/.test(html)
};
Object.keys(sib).forEach((k) => out.push('  ' + k.padEnd(36) + ': ' + (sib[k] ? 'OK' : 'CHECK')));

out.push('');
out.push('=== 6) SHARED HELPERS KEPT (used outside Smart Docs) ===');
['smartImportLoadPdfJs', 'smartImportLoadPdfLib'].forEach((m) => out.push('  ' + m.padEnd(28) + ': ' + (app.indexOf('function ' + m) !== -1 ? 'KEPT' : 'REMOVED')));
['folderNameExists', 'makeFolderId', 'isNoteBlockTag', 'addFolder', 'normalizeNoteTextColor'].forEach((m) =>
  out.push('  Notes helper ' + m.padEnd(22) + ': ' + (app.indexOf('function ' + m) !== -1 ? 'DECLARED' : 'MISSING!')));

out.push('');
out.push('=== 7) CSS ===');
out.push('styles.css smart-* rules kept (shared/modal shell): ' + (css.match(/smart-/g) || []).length);

fs.writeFileSync('_CLOSE_out.txt', out.join('\r\n'), 'utf8');
process.stdout.write(out.join('\n'));
