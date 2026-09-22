// Scope audit for Smart Documents Clean Reset.
const fs = require('fs');
const out = [];
const L = (s) => out.push(s);

const files = ['app.js', 'index.html', 'styles.css', 'numberToWords.js', 'currencyService.js'];
files.forEach((f) => {
  if (!fs.existsSync(f)) { L('MISSING ' + f); return; }
  const c = fs.readFileSync(f, 'utf8');
  ['smartImportLoadPako', 'smartImportParsePdf', 'smartImportLoadPdfJs', 'smartImportLoadPdfLib']
    .forEach((k) => L(f + ' :: ' + k + ' = ' + (c.split(k).length - 1)));
});

// who else references the removed pako/parse helpers anywhere in the repo (js/mjs/html)
const walk = (dir, acc) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    if (e.name === 'node_modules' || e.name === '.git') return;
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|mjs|cjs|html)$/.test(e.name)) acc.push(p);
  });
  return acc;
};
const all = walk('.', []);
L('== files referencing removed helpers outside app.js');
['smartImportLoadPako', 'smartImportParsePdf'].forEach((k) => {
  const hits = all.filter((p) => p !== './app.js' && fs.readFileSync(p, 'utf8').includes(k));
  L('   ' + k + ' -> ' + (hits.length ? hits.join(', ') : 'none'));
});

// Age Calculator + other drawer entries present?
const html = fs.readFileSync('index.html', 'utf8');
L('== drawer/nav entries in index.html');
['open-smart-docs', 'open-notes', 'open-currency', 'open-settings', 'open-pdf-reports', 'age', 'engineering', 'pdf-v1', 'pdfV1']
  .forEach((k) => L('   ' + k + ' = ' + (html.split(k).length - 1)));

// CSS still used by the clean workspace shell
const css = fs.readFileSync('styles.css', 'utf8');
L('== styles.css smart selectors (kept shell must be > 0)');
['.smart-docs-backdrop', '.smart-docs-home', '.smart-docs-header', '.smart-docs-body',
 '.smart-workspace-empty', '.smart-docs-icon', '.smart-doc-card', '.smart-tool-btn',
 '.smart-docs-toolbar', '.smart-blank-canvas', '.smart-document-content', '.smart-doc-text-block']
  .forEach((s) => L('   ' + s + ' = ' + (css.split(s).length - 1)));

fs.writeFileSync('_z_scope.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
