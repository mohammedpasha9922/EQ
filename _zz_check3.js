const fs = require('fs');
const out = [];
const files = ['_chk_app.mjs', '_adbar_base/app.js', '_app_backup_cp.js', '_tmp_head_app.js', 'app.js'];
const names = ['folderNameExists', 'makeFolderId', 'isNoteBlockTag'];
files.forEach(f => {
  if (!fs.existsSync(f)) { out.push('--- ' + f + ' : NOT FOUND'); return; }
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  out.push('--- ' + f + ' (' + lines.length + ' lines)');
  names.forEach(fn => {
    const d = lines.findIndex(l => new RegExp('^(?:async\\s+)?function\\s+' + fn + '\\b|^(?:const|let|var)\\s+' + fn + '\\b').test(l));
    const uses = [];
    lines.forEach((l, i) => { if (new RegExp('\\b' + fn + '\\s*\\(').test(l)) uses.push(i + 1); });
    out.push('  ' + fn + ' decl=' + (d >= 0 ? (d + 1) : 'MISSING') + ' uses=' + uses.join(','));
  });
  const addF = lines.findIndex(l => /^(?:async\s+)?function\s+addFolder\b/.test(l));
  out.push('  addFolder decl=' + (addF >= 0 ? (addF + 1) : 'MISSING'));
});
fs.writeFileSync('_zz_check3_out.txt', out.join('\n'), 'utf8');
console.log('WROTE _zz_check3_out.txt lines=' + out.length);
