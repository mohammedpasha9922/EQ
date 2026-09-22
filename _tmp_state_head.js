// TEMP: compare current worktree vs HEAD for the same signals (deleted after use).
const { execSync } = require('child_process');
const fs = require('fs');
const out = [];
const headApp = execSync('git show HEAD:app.js', { maxBuffer: 1 << 28 }).toString('utf8').replace(/^\uFEFF/, '');
const headHtml = execSync('git show HEAD:index.html', { maxBuffer: 1 << 28 }).toString('utf8').replace(/^\uFEFF/, '');

function dupsOf(src) {
  const seen = new Map();
  src.split(/\r?\n/).forEach((l, i) => {
    const m = l.match(/^(function|let|const|var|class)\s+([A-Za-z_$][\w$]*)/);
    if (m) {
      if (!seen.has(m[2])) seen.set(m[2], []);
      seen.get(m[2]).push(String(i + 1));
    }
  });
  return [...seen.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => k + ' @ ' + v.join(','));
}
const d = dupsOf(headApp);
out.push('HEAD duplicate top-level declarations: ' + d.length);
d.forEach((x) => out.push('  ' + x));
out.push('HEAD index.html smart lines: ' + headHtml.split(/\r?\n/).filter((l) => /smartDocsModal|smart-docs-|smart-workspace|smartBlank/.test(l)).length);
out.push('HEAD has openSmartDocs: ' + headApp.includes('function openSmartDocs'));
out.push('HEAD has smartBlankCanvasHolder: ' + headApp.includes('smartBlankCanvasHolder'));
out.push('HEAD app.js lines: ' + headApp.split(/\r?\n/).length);
out.push('HEAD index.html lines: ' + headHtml.split(/\r?\n/).length);
fs.writeFileSync('_tmp_state_head.txt', out.join('\n'), 'utf8');
console.log('written');
