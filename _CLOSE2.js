// Check smartToolbarSave occurrences + syntax + stale i18n keys
const fs = require('fs');
const lines = fs.readFileSync('app.js', 'utf8').split(/\r?\n/);
const out = [];
out.push('=== smartToolbarSave occurrences in app.js ===');
lines.forEach((l, i) => { if (l.indexOf('smartToolbarSave') !== -1) out.push('  app.js:' + (i + 1) + ': ' + l.trim()); });
out.push('');
out.push('=== smartToolbar* i18n keys present (translation-only leftover?) ===');
out.push('  keys found: ' + (fs.readFileSync('app.js', 'utf8').match(/smartToolbar\w*:/g) || []).join(', '));
out.push('  getElementById targeting smartToolbarSave: ' +
  (/getElementById\(['"]smartToolbarSave['"]\)/.test(fs.readFileSync('app.js', 'utf8')) ? 'YES!!' : 'NO'));

out.push('');
out.push('=== stale Smart Documents i18n keys (candidates for cleanup) ===');
const keys = ['smartDocsCard', 'smartDocsStep', 'smartDocsHeading', 'smartDocsDesc', 'smartToolbar',
  'smartTable', 'smartBlank', 'smartScan', 'smartImport', 'smartDraft', 'smartTemplate'];
keys.forEach((k) => {
  const n = (fs.readFileSync('app.js', 'utf8').match(new RegExp(k + '\\w*:', 'g')) || []).length;
  out.push('  ' + k.padEnd(16) + ' keys: ' + n);
});

fs.writeFileSync('_CLOSE2_out.txt', out.join('\r\n'), 'utf8');
process.stdout.write(out.join('\n'));
