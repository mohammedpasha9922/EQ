// Scope audit: compare the pre-reset baseline (_chk_app.mjs) with the current app.js
// and classify every hunk, plus detect dangling references to removed functions.
const fs = require('fs');
const NL = String.fromCharCode(10);

function readLines(p) { return fs.readFileSync(p, 'utf8').split(/\r?\n/); }

if (!fs.existsSync('_chk_app.mjs')) { console.log('BASELINE MISSING: _chk_app.mjs'); process.exit(2); }

const base = readLines('_chk_app.mjs');
const cur = readLines('app.js');
const out = [];

// ---------- 1) declared top-level function names ----------
const declRe = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/;
const nameRe = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/;
function decls(lines) {
  const s = new Set();
  for (const l of lines) {
    let m = declRe.exec(l);
    if (m) { s.add(m[1]); continue; }
    m = nameRe.exec(l);
    if (m) s.add(m[1]);
  }
  return s;
}
const baseD = decls(base), curD = decls(cur);
const removed = [...baseD].filter(n => !curD.has(n));
const added = [...curD].filter(n => !baseD.has(n));

const smartish = n => /^(smart|__smart|openSmartDocs|closeSmartDocs|setSmartDocsStep|renderSmartDocsSteps)/i.test(n);

out.push('=== 1) DECLARATIONS REMOVED (' + removed.length + ') ===');
out.push('  smart* : ' + removed.filter(smartish).length);
out.push('  NON-smart : [' + removed.filter(n => !smartish(n)).join(', ') + ']');
out.push('  smart removed (first 40): [' + removed.filter(smartish).slice(0, 40).join(', ') + ']');

// ---------- 2) dangling references ----------
const curText = cur.join(NL);
const dangling = [];
for (const n of removed) {
  const re = new RegExp('\\b' + n.replace(/\$/g, '\\$') + '\\b', 'g');
  const c = (curText.match(re) || []).length;
  if (c > 0) dangling.push(n + ' x' + c);
}
out.push('');
out.push('=== 2) DANGLING REFERENCES TO REMOVED DECLS (' + dangling.length + ') ===');
out.push(dangling.length ? dangling.join(NL) : '  NONE');

// ---------- 3) old Smart Documents UI markers ----------
const markers = [
  'smart-doc-card', 'smart-docs-card', 'data-toolbar="blank-doc"', 'smartBlankCanvasHolder',
  'smartBlankCanvas', 'smartDocumentContent', 'smart-document-content', 'smart-doc-text-block',
  'smart-doc-table', 'smart-doc-signature', 'smart-doc-image', 'smart-doc-logo', 'smart-doc-divider',
  'smart-doc-border', 'smart-doc-page', 'smartAddMenu', 'smart-add-item', 'smart-tool-btn',
  'smart-doc-toolbar', 'smart-docs-toolbar', 'smartLogoBar', 'smartSigResignBtn',
  'smartDraft', 'smartTemplates', 'smartScan', 'smartImport', 'smartAssistant'
];
const html = fs.readFileSync('index.html', 'utf8');
out.push('');
out.push('=== 3) OLD SMART UI MARKERS (only non-zero listed) ===');
for (const m of markers) {
  const inHtml = html.split(m).length - 1;
  const inJs = curText.split(m).length - 1;
  if (inHtml || inJs) out.push('  ' + m + '  html=' + inHtml + ' js=' + inJs);
}

// ---------- 4) entry point + workspace shape ----------
out.push('');
out.push('=== 4) ENTRY POINT / WORKSPACE ===');
out.push('  drawer action open-smart-docs : ' + (html.includes('data-action="open-smart-docs"') ? 'PRESENT' : 'MISSING'));
out.push('  #smartDocsModal               : ' + (html.includes('id="smartDocsModal"') ? 'PRESENT' : 'MISSING'));
out.push('  #closeSmartDocs               : ' + (html.includes('id="closeSmartDocs"') ? 'PRESENT' : 'MISSING'));
out.push('  smart-docs-body empty         : ' + (/<div class="smart-docs-body">\s*\r?\n\s*<div class="smart-workspace-empty"><\/div>/.test(html) ? 'OK' : 'CHECK'));
out.push('  smart-workspace-empty count   : ' + (html.split('smart-workspace-empty').length - 1));
out.push('  openSmartDocs() defined       : ' + (/(?:^|\n)\s*function openSmartDocs\s*\(/.test(curText) ? 'YES' : 'NO'));
out.push('  closeSmartDocs() defined      : ' + (/(?:^|\n)\s*function closeSmartDocs\s*\(/.test(curText) ? 'YES' : 'NO'));
out.push('  closeSmartDocs wired          : ' + (/addEventListener\('click',\s*closeSmartDocs\)/.test(curText) ? 'YES' : 'NO'));

fs.writeFileSync('_za_scope.txt', out.join(NL), 'utf8');
console.log('WROTE _za_scope.txt dangling=' + dangling.length + ' removed=' + removed.length);
