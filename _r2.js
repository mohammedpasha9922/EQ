// Locate original sources for the 4 missing-but-called functions, across the
// available pre-reset copies, and show current call sites.
const fs = require('fs');

const targets = ['folderNameExists', 'makeFolderId', 'isNoteBlockTag', 'smartBlankApplyDirection'];
const candidates = ['_ref_head.js', '_adbar_base/app.js', '_chk_app.mjs', '_app_backup_cp.js', '_tmp_head_app.js'];

const out = [];

function extractFn(src, name) {
  const re = new RegExp('^(?:async\\s+)?function\\s+' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'm');
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index;
  // brace matching from first '{' after the signature
  let i = src.indexOf('{', m.index + m[0].length - 1);
  if (i < 0) return null;
  let depth = 0;
  let inStr = null, inTpl = false, inLine = false, inBlock = false, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (inTpl) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '`') { inTpl = false; continue; }
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '`') { inTpl = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return { start, end: j + 1, text: src.slice(start, j + 1), line: src.slice(0, start).split('\n').length }; }
  }
  return null;
}

const cur = fs.readFileSync('app.js', 'utf8');
const curLines = cur.split('\n');

for (const name of targets) {
  out.push('################ ' + name + ' ################');
  for (const file of candidates) {
    if (!fs.existsSync(file)) { out.push('  [' + file + '] MISSING FILE'); continue; }
    const src = fs.readFileSync(file, 'utf8');
    const f = extractFn(src, name);
    if (f) {
      out.push('  --- found in ' + file + ' (line ' + f.line + ', len ' + f.text.length + ') ---');
      out.push(f.text);
      out.push('  --- end ' + file + ' ---');
    } else {
      out.push('  [not found in ' + file + ']');
    }
  }
  out.push('');
  out.push('  ==== CURRENT CALL SITES in app.js ====');
  curLines.forEach((l, i) => {
    const re = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b');
    if (re.test(l)) {
      const a = Math.max(0, i - 4), b = Math.min(curLines.length, i + 5);
      out.push('  @' + (i + 1) + ': ' + curLines[i].trim());
      out.push('     ctx[' + (a + 1) + '-' + b + ']: ' + curLines.slice(a, b).map((x) => x.trim()).join(' ⏎ ').slice(0, 700));
    }
  });
  out.push('');
}

fs.writeFileSync('_r2_out.txt', out.join('\n'), 'utf8');
console.log('done');
