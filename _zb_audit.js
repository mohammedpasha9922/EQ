// Focused audit #2 — (a) Notes helper declarations, (b) leftover Smart markers classified.
const fs = require('fs');
const NL = String.fromCharCode(10);
const cur = fs.readFileSync('app.js', 'utf8').split(/\r?\n/);
const out = [];

const names = [
  'folderNameExists', 'makeFolderId', 'createFolder', 'isNoteBlockTag',
  'insertNoteImageAtCaret', 'insertNoteImageBlock', 'insertNoteImageDataUrl',
  'noteImageReadAndInsert', 'noteImageToggleMenu', 'addFolder',
  'normalizeNoteTextColor', 'normalizeNoteTextSize', 'normalizeNoteFontFamily',
  'saveFolders', 'renderFolders', 'openSmartDocs', 'closeSmartDocs',
  'smartBlankOpen', 'smartActivePageContent'
];
out.push('=== A) DECLARATION / REFERENCE CHECK ===');
for (const n of names) {
  const decl = [];
  const refs = [];
  const reD = new RegExp('^\\s*(?:async\\s+)?(?:function\\s+|const\\s+|let\\s+|var\\s+)' + n + '\\b');
  const reAny = new RegExp('\\b' + n + '\\b');
  cur.forEach((l, i) => {
    if (reD.test(l)) decl.push(i + 1);
    else if (reAny.test(l)) refs.push(i + 1);
  });
  out.push('  ' + n.padEnd(26) + ' declLines=[' + decl.join(',') + ']  refLines=[' + refs.slice(0, 8).join(',') + (refs.length > 8 ? ',+more' : '') + ']  totalRefs=' + refs.length);
}

// ---------- leftover smart marker classification ----------
const markers = ['smartDraft', 'smartTemplates', 'smartScan', 'smartImport', 'smartAssistant'];
const cls = {};
for (const m of markers) cls[m] = { i18n: 0, comment: 0, code: [] };
cur.forEach((l, i) => {
  for (const m of markers) {
    if (l.indexOf(m) === -1) continue;
    const t = l.trim();
    if (/^\/\//.test(t) || /^\*/.test(t)) { cls[m].comment++; continue; }
    if (/^["']?[A-Za-z_$][\w$]*["']?\s*:/.test(t)) { cls[m].i18n++; continue; }
    if (i18nStyle(t)) { cls[m].i18n++; continue; }
    cls[m].code.push((i + 1) + ': ' + t.slice(0, 130));
  }
});
function i18nStyle(t) { return /^["'][A-Za-z_$][\w$]*["']\s*:/.test(t); }
out.push('');
out.push('=== B) LEFTOVER SMART MARKERS: i18n-keys vs comments vs CODE ===');
for (const m of markers) {
  const c = cls[m];
  out.push('  ' + m + ': i18nKeys=' + c.i18n + ' comments=' + c.comment + ' codeLines=' + c.code.length);
}
out.push('');
out.push('=== C) CODE LINES REFERENCING smart markers (first 60) ===');
for (const m of markers) {
  for (const line of cls[m].code) out.push('  [' + m + '] ' + line);
}
fs.writeFileSync('_zb_audit.txt', out.join(NL), 'utf8');
console.log('WROTE _zb_audit.txt');
