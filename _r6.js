// Fidelity / scope audit for the Smart Documents clean reset.
const fs = require('fs');

const out = [];
const ref = fs.readFileSync('_ref_head.js', 'utf8');
const cur = fs.readFileSync('app.js', 'utf8');

function decls(src) {
  const s = new Set();
  let m;
  const re1 = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  const re2 = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(?[A-Za-z0-9_$,\s]*\)?\s*=>/gm;
  const re3 = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?function\b/gm;
  while ((m = re1.exec(src))) s.add(m[1]);
  while ((m = re2.exec(src))) s.add(m[1]);
  while ((m = re3.exec(src))) s.add(m[1]);
  return s;
}

const missing = [...decls(ref)].filter((n) => !decls(cur).has(n));
const nonSmart = missing.filter((n) => !/smart/i.test(n));
out.push('=== MISSING NAMES THAT ARE *NOT* smart* (' + nonSmart.length + ') ===');
nonSmart.forEach((n) => {
  const refs = (cur.match(new RegExp('\\b' + n.replace(/\$/g, '\\$') + '\\b', 'g')) || []).length;
  out.push('  ' + n + '  refs_in_current=' + refs);
});

// HTML reference audit
const html = fs.readFileSync('index.html', 'utf8');
const smartIds = [...new Set((html.match(/id="[^"]*smart[^"]*"/gi) || []))];
out.push('');
out.push('=== index.html ids containing "smart" (' + smartIds.length + ') ===');
smartIds.forEach((s) => out.push('  ' + s));

// Any HTML reference to removed functions?
const removedCallers = ['smartBlankApplyDirection', 'smartTextLocaleDir', 'createFolder', 'scanEl'];
out.push('');
out.push('=== removed-name references in index.html ===');
removedCallers.forEach((n) => {
  const c = (html.match(new RegExp(n, 'g')) || []).length;
  out.push('  ' + n + ' -> ' + c);
});

// CSS audit: which smart classes are still used by the remaining markup/JS?
const css = fs.readFileSync('styles.css', 'utf8');
const smartCss = [...new Set((css.match(/\.smart-[a-z0-9_-]+/gi) || []))].map((x) => x.toLowerCase());
const jsAndHtml = cur + '\n' + html;
const used = [], unused = [];
smartCss.forEach((cls) => {
  const bare = cls.slice(1);
  const inMarkup = jsAndHtml.includes(cls);
  const inJsQuery = new RegExp('[\'"]?\\.?' + bare + '\\b').test(jsAndHtml);
  if (inMarkup || inJsQuery) used.push(cls); else unused.push(cls);
});
out.push('');
out.push('=== styles.css smart classes: total=' + smartCss.length + ' used=' + used.length + ' unused=' + unused.length + ' ===');
out.push('  USED: ' + used.join(', '));
out.push('  UNUSED: ' + unused.join(', '));

// Smart Documents entry point wiring
out.push('');
out.push('=== ENTRY POINT WIRING ===');
const drawMatch = html.match(/[^\n]*navSmartDocsBtn[^\n]*/g) || [];
out.push('  index.html navSmartDocsBtn lines: ' + drawMatch.length);
drawMatch.slice(0, 6).forEach((l) => out.push('    ' + l.trim().slice(0, 200)));
const openMatch = cur.match(/[^\n]*openSmartDocs[^\n]*/g) || [];
out.push('  app.js openSmartDocs refs: ' + openMatch.length);
openMatch.slice(0, 8).forEach((l) => out.push('    ' + l.trim().slice(0, 200)));

fs.writeFileSync('_r6_out.txt', out.join('\n'), 'utf8');
console.log('done');
