// Temporary audit helper — count notes-cluster functions across backup snapshots
const fs = require('fs');

const files = [
  '_adbar_base/app.js',
  '_app_backup_cp.js',
  '_chk_app.mjs',
  '_pdfclear_appcheck.mjs',
  '__notes_test/_p9_cut.mjs',
  '_chk_syntax.mjs',
  '_head_app.js',
  '_tmp_head_app.js',
  'app.js'
];

const names = [
  'normalizeNoteTextColor',
  'readExplicitNodeColor',
  'readExplicitCellBackgroundColor',
  'buildNoteBodyHTML',
  'noteInlineSegmentHTML',
  'noteRunAlignCss',
  'buildNoteBodyHTMLWithBlocks',
  'buildNoteBlocksHTML',
  'escapeNoteCheckText',
  'escapeNoteText'
];

files.forEach((f) => {
  if (!fs.existsSync(f)) { console.log('--- ' + f + ': MISSING'); return; }
  const s = fs.readFileSync(f, 'utf8');
  const counts = names.map((n) => {
    const re = new RegExp('function\\s+' + n + '\\s*\\(', 'g');
    const m = s.match(re);
    return n + '=' + (m ? m.length : 0);
  });
  console.log('--- ' + f + ' (' + s.split('\n').length + ' lines)');
  console.log('    ' + counts.join('  '));
});
