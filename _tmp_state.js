// TEMP state audit for the Smart Documents clean reset (deleted after use).
const fs = require('fs');
const out = [];
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const appLines = app.split(/\r?\n/);

// 1) duplicate top-level function/let/const declarations (syntax-error material)
const seen = new Map();
appLines.forEach((l, i) => {
  const m = l.match(/^(function|let|const|var|class)\s+([A-Za-z_$][\w$]*)/);
  if (m) {
    const key = m[2];
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push((i + 1) + ':' + m[1]);
  }
});
const dups = [];
for (const [k, v] of seen.entries()) if (v.length > 1) dups.push(k + ' -> ' + v.join(', '));
out.push('== duplicate top-level declarations: ' + dups.length);
dups.forEach((d) => out.push('  ' + d));

// 2) Smart Documents surface in index.html
const htmlSmart = [];
html.split(/\r?\n/).forEach((l, i) => {
  if (/smartDocsModal|smart-docs-|smart-workspace|smart-doc-|smartBlank|smartDocumentContent|data-toolbar="blank-doc"|smart-tool-btn/.test(l)) {
    htmlSmart.push((i + 1) + ': ' + l.trim().slice(0, 140));
  }
});
out.push('== index.html smart lines: ' + htmlSmart.length);
htmlSmart.forEach((l) => out.push('  ' + l));

// 3) old Smart Documents UI hooks still referenced in app.js (element lookups/renders)
const markers = [
  'smartBlankCanvasHolder', 'smartDocumentContent', 'smartBlankCanvas', 'smart-docs-toolbar',
  'smart-tool-btn', 'smart-doc-text-block', 'smart-doc-table', 'smart-doc-signature', 'smart-doc-image',
  'smart-doc-logo', 'smart-doc-divider', 'smartAddMenu', 'window.__smartBlank', 'window.__smartImport',
  'window.__smartLogo', 'window.__smartTable', 'window.__smartText', 'window.__smartDrafts',
  'window.__smartTemplates', 'window.__smartSignature', 'window.__smartPage', 'smartBlankResetToHome',
  'smartTemplatesReset', 'smartDraftApply', 'smartNewDocRequest', 'smartNewDocStart', 'smartSignatureInsert',
  'smartTableCreate', 'smartAddInsert', 'smartPageCurrentCanvas'
];
out.push('== app.js leftover UI markers:');
markers.forEach((mk) => {
  const hits = [];
  appLines.forEach((l, i) => { if (l.includes(mk)) hits.push(i + 1); });
  out.push('  ' + mk + ' = ' + hits.length + (hits.length ? ' @ ' + hits.slice(0, 12).join(',') : ''));
});

// 4) key entry-point functions present?
['function openSmartDocs', 'function closeSmartDocs', 'closeSmartDocsButton', 'window.__smartDocsWorkflow', 'window.__smartScan']
  .forEach((k) => out.push('  entry: ' + k + ' = ' + app.includes(k)));

fs.writeFileSync('_tmp_state.txt', out.join('\n'), 'utf8');
console.log('written');
