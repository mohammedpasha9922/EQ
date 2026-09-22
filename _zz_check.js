const fs = require('fs');
const out = [];
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const appLines = app.split(/\r?\n/);
const htmlLines = html.split(/\r?\n/);

// 1) duplicate top-level declarations
const decl = {};
const dupes = [];
appLines.forEach((l, i) => {
  const m = l.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
  if (m) {
    if (decl[m[1]]) dupes.push(m[1] + ' @' + decl[m[1]] + ' & ' + (i + 1));
    else decl[m[1]] = i + 1;
  }
});
out.push('DUPES=' + dupes.length);
dupes.slice(0, 20).forEach(d => out.push('  DUP ' + d));

// 2) Notes helpers existence
['folderNameExists', 'makeFolderId', 'isNoteBlockTag', 'normalizeNoteTextColor', 'renderFolders', 'addFolder'].forEach(fn => {
  const re = new RegExp('^(?:async\\s+)?function\\s+' + fn + '\\b');
  const found = appLines.findIndex(l => re.test(l));
  out.push('DECL ' + fn + ' = ' + (found >= 0 ? (found + 1) : 'MISSING'));
});

// 3) Smart Documents entry point + wiring
out.push('SMART openSmartDocs=' + (appLines.findIndex(l => /function openSmartDocs\s*\(/.test(l)) + 1));
out.push('SMART closeSmartDocs=' + (appLines.findIndex(l => /function closeSmartDocs\s*\(/.test(l)) + 1));
out.push('SMART modalRef=' + (appLines.findIndex(l => /getElementById\('smartDocsModal'\)/.test(l)) + 1));
out.push('SMART closeBtnRef=' + (appLines.findIndex(l => /getElementById\('closeSmartDocs'\)/.test(l)) + 1));

// 4) Old Smart Documents UI markers that must be gone
const oldMarkers = [
  'smart-docs-toolbar', 'data-toolbar="blank-doc"', 'smartBlankCanvas', 'smartBlankCanvasHolder',
  'smartDocumentContent', 'smartDocCard', 'smart-doc-card', 'smartToolBtn', 'smart-tool-btn',
  'smartAddMenu', 'smartLogoBar', 'smartSignaturePad', 'smartTableCreate', 'smartTemplates',
  'smartDraft', '__smartImport', '__smartAssistant', '__smartBlank', '__smartLogo', '__smartSig'
];
oldMarkers.forEach(m => {
  const inApp = app.split(m).length - 1;
  const inHtml = html.split(m).length - 1;
  out.push('MARKER ' + m + ' app=' + inApp + ' html=' + inHtml);
});

// 5) Workspace placeholder inside modal
const modalStart = htmlLines.findIndex(l => l.includes('id="smartDocsModal"'));
const modalEnd = htmlLines.findIndex((l, i) => i > modalStart && l.includes('</div>') && htmlLines[i + 1] === '');
const modalBlock = htmlLines.slice(modalStart, modalEnd + 1).join('\n');
out.push('--- MODAL BLOCK (' + (modalStart + 1) + '..' + (modalEnd + 1) + ') ---');
out.push(modalBlock);
out.push('MODAL innerButtons=' + (modalBlock.match(/<button/g) || []).length);
out.push('MODAL hasPlaceholder=' + /smart-workspace-empty/.test(modalBlock));
out.push('MODAL hasToolbar=' + /toolbar/i.test(modalBlock));
out.push('MODAL hasCanvas=' + /canvas/i.test(modalBlock));

// 6) Sibling features entry points intact
const siblings = {
  calculator: /function (calculate|updateDisplay|handleNumber)\b/,
  notes: /function openNotes\b|function showNotesView\b|id="notesModal"/,
  notesPdfPreview: /notePdfPreviewModal/,
  pdfReports: /pdfReportsWorkspace/,
  currency: /currencyMenuButton|currencyConverterModal/,
  ageCalc: /age/i,
  drawerNav: /drawerMenuItem|navNotesBtn/
};
Object.keys(siblings).forEach(k => {
  out.push('SIBLING ' + k + ' app=' + siblings[k].test(app) + ' html=' + siblings[k].test(html));
});

// 7) CSS classes still referenced for smart workspace
['smart-docs-backdrop', 'smart-docs-home', 'smart-docs-header', 'smart-docs-body', 'smart-workspace-empty'].forEach(c => {
  let cssCount = 0;
  const cssFiles = fs.readdirSync('.').filter(f => /\.css$/.test(f));
  cssFiles.forEach(f => { cssCount += fs.readFileSync(f, 'utf8').split(c).length - 1; });
  out.push('CSS ' + c + ' app=' + (app.split(c).length - 1) + ' html=' + (html.split(c).length - 1) + ' css=' + cssCount);
});

fs.writeFileSync('_zz_check_out.txt', out.join('\n'), 'utf8');
console.log('WROTE _zz_check_out.txt lines=' + out.length);
