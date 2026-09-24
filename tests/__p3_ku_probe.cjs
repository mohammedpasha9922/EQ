// temp probe: which Smart PDF Phase 02A/03 i18n keys exist in the `ku` locale?
const fs = require('fs');
const a = fs.readFileSync('app.js', 'utf8');
const start = a.indexOf('  ku: {');
const seg = a.slice(start, start + 60000);
const keys = ['smartPdfWorkspaceTitle', 'smartPdfUploadBtn', 'smartPdfUploadHint',
  'smartPdfUploadSuccess', 'smartPdfPageIndicator', 'smartPdfUploadError',
  'smartPdfUploadTooLarge', 'drawerNotes', 'smartPdfWorkspaceSubtitle'];
const out = ['kuStart=' + start];
for (const k of keys) {
  out.push(k + ' quoted=' + (seg.indexOf('"' + k + '"') >= 0) + ' bare=' + (seg.indexOf('\n    ' + k + ':') >= 0));
}
const m = seg.match(/"[a-zA-Z0-9_]*pdf[a-zA-Z0-9_]*"\s*:/gi) || [];
out.push('kuPdfKeys=' + JSON.stringify(m));
fs.writeFileSync('tests/__p3_ku_keys.txt', out.join('\n'));
