// Final verification for Smart Documents Clean Reset (read-only audit).
const fs = require('fs');
const out = [];
const L = (s) => out.push(s);

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const appLines = app.split(/\r?\n/);
const htmlLines = html.split(/\r?\n/);

// 1) duplicate top-level function declarations
const decls = {};
appLines.forEach((line, i) => {
  const m = line.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (m) {
    decls[m[1]] = decls[m[1]] || [];
    decls[m[1]].push(i + 1);
  }
  const c = line.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/);
  if (c) {
    decls[c[1]] = decls[c[1]] || [];
    decls[c[1]].push(i + 1);
  }
});
const dups = Object.keys(decls).filter((k) => decls[k].length > 1);
L('== duplicate top-level declarations: ' + dups.length);
dups.slice(0, 30).forEach((k) => L('   DUP ' + k + ' @ ' + decls[k].join(', ')));

// 2) old Smart Documents UI markers must be gone / no-op
const markers = [
  'smartBlankCanvasHolder', 'smartDocumentContent', 'smartBlankCanvas',
  'smart-docs-toolbar', 'smart-tool-btn', 'smart-doc-card',
  'smart-doc-text-block', 'smart-doc-table', 'smart-doc-signature',
  'smart-doc-image', 'smart-doc-logo', 'smart-doc-divider', 'smart-doc-border',
  'smart-doc-page', 'smartAddMenu', 'smart-add-item',
  'window.__smartBlank', 'window.__smartImport', 'window.__smartLogo',
  'window.__smartTable', 'window.__smartText', 'window.__smartDrafts',
  'window.__smartTemplates', 'window.__smartSignature', 'window.__smartPage',
  'smartBlankResetToHome', 'smartTemplatesReset', 'smartDraftApply',
  'smartNewDocRequest', 'smartNewDocStart', 'smartSignatureInsert',
  'smartAddInsert', 'smartPageCurrentCanvas', 'smart-blank-canvas',
  'smart-document-content'
];
L('== old Smart Documents UI markers (count)');
let leftover = 0;
markers.forEach((m) => {
  const n = app.split(m).length - 1;
  if (n > 0) { leftover += n; L('   LEFTOVER ' + m + ' = ' + n); }
});
L('   total leftover marker hits = ' + leftover);

// 3) entry points preserved
L('== entry points preserved');
['function openSmartDocs', 'function closeSmartDocs', 'closeSmartDocsButton',
 'window.__smartDocsWorkflow', 'window.__smartScan', 'smartBlankOpen',
 'smartActivePageContent'].forEach((k) => {
  L('   ' + k + ' = ' + app.includes(k));
});

// 4) shared helpers that other features use must still exist
L('== shared helpers kept (used outside Smart Documents)');
['function smartImportLoadPdfJs', 'function smartImportLoadPdfLib',
 'function smartImportLoadPako', 'let smartPdfLibPromise',
 'function smartImportParsePdf', 'function addFolder',
 'function normalizeNoteTextColor', 'function buildNoteBodyHTML',
 'function escapeNoteCheckText', 'function buildNoteBlocksHTML'].forEach((k) => {
  L('   ' + k + ' = ' + app.includes(k));
});

// 5) index.html Smart Documents block
L('== index.html Smart Documents lines');
htmlLines.forEach((line, i) => {
  if (/smart/i.test(line)) L('   ' + (i + 1) + ': ' + line.trim().slice(0, 150));
});

// 6) sibling features entry points (must be untouched)
L('== sibling feature entry points');
['pdfReportsWorkspace', 'pdfV1', 'notePdfPreviewModal', 'currencyConverter',
 'ageCalculator', 'engineering'].forEach((k) => {
  L('   ' + k + ' = ' + html.includes(k));
});

fs.writeFileSync('_z_final.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
