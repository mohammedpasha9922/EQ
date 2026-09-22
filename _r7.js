// Entry-point + CSS usage audit for the Smart Documents clean reset.
const fs = require('fs');
const out = [];
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

// 1) Where is "Smart Documents" text in index.html (the entry point)?
out.push('=== index.html lines containing "Smart Documents" ===');
html.split(/\r?\n/).forEach((l, i) => {
  if (/Smart Documents/i.test(l)) out.push('  ' + (i + 1) + ': ' + l.trim().slice(0, 220));
});

// 2) Drawer / navigation entries near that span
out.push('');
out.push('=== index.html lines around smartDocsTitle span ===');
const lines = html.split(/\r?\n/);
lines.forEach((l, i) => {
  if (/smartDocsTitle/.test(l)) {
    for (let k = Math.max(0, i - 6); k <= Math.min(lines.length - 1, i + 3); k++) {
      out.push('  ' + (k + 1) + ': ' + lines[k].trim().slice(0, 220));
    }
    out.push('  ---');
  }
});

// 3) How is Smart Documents opened from app.js?
out.push('');
out.push('=== app.js lines with openSmartDocs / smartDocsButton / drawer button ===');
js.split(/\r?\n/).forEach((l, i) => {
  if (/openSmartDocs|smartDocsButton|smartDocsEntry|navSmartDocs|data-open-smart|data-action=["']smart/i.test(l)) {
    out.push('  ' + (i + 1) + ': ' + l.trim().slice(0, 220));
  }
});

// 4) Dynamic class construction that could reference smart-* classes
out.push('');
out.push('=== dynamic "smart-" class construction in app.js ===');
js.split(/\r?\n/).forEach((l, i) => {
  if (/['"]smart-['"]\s*\+|['"]smart-['"]\s*\)|`smart-|'smart-'\s*\+|"smart-"\s*\+/.test(l)) {
    out.push('  ' + (i + 1) + ': ' + l.trim().slice(0, 220));
  }
});

// 5) Where are the "used" smart classes referenced?
out.push('');
['smart-doc-text-block', 'smart-docs-icon', 'smart-doc-heading', 'smart-docs-header', 'smart-docs-body', 'smart-docs-home', 'smart-docs-backdrop'].forEach((cls) => {
  out.push('=== refs for .' + cls + ' ===');
  const hh = (html.match(new RegExp(cls.replace(/-/g, '\\-'), 'g')) || []).length;
  const jj = (js.match(new RegExp(cls.replace(/-/g, '\\-'), 'g')) || []).length;
  out.push('  index.html=' + hh + '  app.js=' + jj);
  js.split(/\r?\n/).forEach((l, i) => {
    if (l.includes(cls)) out.push('    js ' + (i + 1) + ': ' + l.trim().slice(0, 180));
  });
  html.split(/\r?\n/).forEach((l, i) => {
    if (l.includes(cls)) out.push('    html ' + (i + 1) + ': ' + l.trim().slice(0, 180));
  });
});

fs.writeFileSync('_r7_out.txt', out.join('\n'), 'utf8');
console.log('done');
