// Final verification for Smart Documents Clean Reset (read-only audit).
const fs = require('fs');
const path = require('path');
const out = [];
const say = (s) => out.push(s);

const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');

// 1) Entry point present in HTML + drawer button
say('--- ENTRY POINT ---');
say('index.html has smartDocsModal: ' + /id="smartDocsModal"/.test(html));
say('index.html has closeSmartDocs: ' + /id="closeSmartDocs"/.test(html));
say('index.html has data-i18n="smartDocsTitle": ' + /data-i18n="smartDocsTitle"/.test(html));
say('app.js has openSmartDocs(): ' + /function openSmartDocs\s*\(/.test(app));
say('app.js has closeSmartDocs(): ' + /function closeSmartDocs\s*\(/.test(app));
say('app.js wires closeSmartDocsButton: ' + /closeSmartDocsButton\.addEventListener/.test(app));

// 2) Workspace body content (must be empty placeholder)
const bodyMatch = html.match(/<div class="smart-docs-body">([\s\S]{0,400}?)<\/div>\s*<\/div>\s*<\/div>/);
say('smart-docs-body inner (raw): ' + JSON.stringify(bodyMatch ? bodyMatch[1] : null));

// 3) Old Smart Documents tooling markers that must be GONE from index.html
say('--- OLD SMART DOCS UI IN index.html (expect false) ---');
const oldUi = [
  'smartBlankCanvasHolder', 'smartBlankCanvas', 'smartDocumentContent',
  'data-toolbar="blank-doc"', 'smart-doc-card', 'smart-docs-toolbar',
  'smart-tool-btn', 'smart-add-item', 'smartLogoBar', 'smartSigResignBtn'
];
for (const m of oldUi) say(`  ${m}: ${html.includes(m)}`);

// 4) Old tooling JS must be GONE from app.js (editor/scan/tools rendering)
say('--- OLD SMART DOCS JS IN app.js (expect false) ---');
const oldJs = [
  'smartBlankCanvasHolder', 'smartDocumentContent', 'smartTableCreate',
  'smartAddInsert', 'smartSignatureInsert', 'smartPageCurrentCanvas',
  'smartBlankRender', 'smartBlankWire', 'data-toolbar="blank-doc"'
];
for (const m of oldJs) say(`  ${m}: ${app.includes(m)}`);

// 5) Preserved shared seams (used by tests / other features)
say('--- PRESERVED SEAMS (expect true) ---');
for (const m of ['window.__smartDocsWorkflow', 'window.__smartScan', 'openSmartDocs', 'smartBlankOpen']) {
  say(`  ${m}: ${app.includes(m)}`);
}

// 6) Shared PDF loaders must be preserved (used outside smart docs)
say('--- SHARED PDF LOADERS (expect true) ---');
for (const m of ['function smartImportLoadPdfJs', 'function smartImportLoadPdfLib', 'function pdfV1Export']) {
  say(`  ${m}: ${app.includes(m)}`);
}

// 7) Sibling features untouched markers (expect true)
say('--- SIBLING FEATURES (expect true) ---');
for (const m of [
  ['Calculator', 'primaryDisplay'],
  ['Notes', 'renderNotes'],
  ['Notes PDF preview', 'notePdfPreviewModal'],
  ['PDF Reports', 'pdfReportsWorkspace'],
  ['Currency', 'currencyMenuPopover'],
  ['Age Calculator', 'ageCalc'],
  ['Service Worker', 'serviceWorker'],
  ['Manifest', './manifest.json']
]) {
  const inHtml = html.includes(m[1]);
  const inJs = app.includes(m[1]);
  say(`  ${m[0]} (${m[1]}): html=${inHtml} js=${inJs}`);
}

// 8) CSS: is there Smart Documents CSS still referencing removed UI?
say('--- CSS SMART-DOCS RULES ---');
const cssHits = [];
css.split(/\r?\n/).forEach((l, i) => {
  if (/smart-(doc|docs|documents|tool|add|logo|sig)/i.test(l)) cssHits.push(`${i + 1}: ${l.trim().slice(0, 120)}`);
});
say('  total lines: ' + cssHits.length);
cssHits.slice(0, 40).forEach((h) => say('    ' + h));

fs.writeFileSync(path.join(__dirname, '_z_audit.txt'), out.join('\n'), 'utf8');
console.log(out.join('\n'));
