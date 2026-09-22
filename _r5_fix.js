// Atomic regression fix:
//  (1) restore Notes helpers dropped by the Smart Documents reset restore
//  (2) remove the now-dead Smart Documents locale hook (guarded no-op)
const fs = require('fs');

const src0 = fs.readFileSync('app.js', 'utf8');
let src = src0;
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const log = [];

function assertOne(re, label) {
  const c = (src.match(re) || []).length;
  log.push('ANCHOR ' + label + ' occurrences=' + c);
  if (c !== 1) throw new Error('ANCHOR NOT UNIQUE: ' + label + ' (' + c + ')');
}

// ---------- anchors ----------
const reAddFolder = /\r?\nfunction addFolder\(\) \{\r?\n  const t = translations\[state\.locale\] \|\| translations\.en;/;
const reExtract = /\r?\nfunction extractNoteBodyAndFormatting\(root\) \{/;
const reRemnant = /\r?\n  \/\/ PART 11[^\r\n]*\r?\n  \/\/ \(scoped to #smartBlankView only[^\r\n]*\r?\n  if \(typeof smartBlankApplyDirection === 'function'\) smartBlankApplyDirection\(\);/;

assertOne(reAddFolder, 'addFolder');
assertOne(reExtract, 'extractNoteBodyAndFormatting');
assertOne(reRemnant, 'smart-docs locale remnant');

// ---------- (1) Notes helpers, original order + text ----------
const notesHelpers =
  eol +
  'function folderNameExists(name, excludeId) {' + eol +
  '  const norm = name.trim().toLowerCase();' + eol +
  '  return state.folders.some(f => f.id !== excludeId && f.name.trim().toLowerCase() === norm);' + eol +
  '}' + eol +
  eol +
  'function makeFolderId() {' + eol +
  "  return 'folder-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);" + eol +
  '}' + eol;

src = src.replace(reAddFolder, notesHelpers + 'function addFolder() {' + eol + '  const t = translations[state.locale] || translations.en;');

const isNoteBlockTag =
  eol +
  'function isNoteBlockTag(tag) {' + eol +
  "  return tag === 'DIV' || tag === 'P' || tag === 'LI' || tag === 'H1' || tag === 'H2' ||" + eol +
  "    tag === 'H3' || tag === 'H4' || tag === 'BLOCKQUOTE';" + eol +
  '}' + eol;

src = src.replace(reExtract, isNoteBlockTag + 'function extractNoteBodyAndFormatting(root) {');

// ---------- (2) remove dead Smart Documents locale hook ----------
src = src.replace(reRemnant, '');

// ---------- guards ----------
if (src === src0) throw new Error('NO CHANGE APPLIED');
if (!/\r?\nfunction folderNameExists\(name, excludeId\) \{/.test(src)) throw new Error('folderNameExists missing after fix');
if (!/\r?\nfunction makeFolderId\(\) \{/.test(src)) throw new Error('makeFolderId missing after fix');
if (!/\r?\nfunction isNoteBlockTag\(tag\) \{/.test(src)) throw new Error('isNoteBlockTag missing after fix');
if (/smartBlankApplyDirection/.test(src)) throw new Error('smartBlankApplyDirection still referenced');

fs.writeFileSync('app.js', src, 'utf8');
log.push('BEFORE_BYTES=' + src0.length + ' AFTER_BYTES=' + src.length);
log.push('APPLIED_OK');
fs.writeFileSync('_r5_out.txt', log.join('\n'), 'utf8');
console.log('done');
