// FINAL VERIFICATION v2 — Smart Documents Clean Reset
const fs = require('fs');
const cp = require('child_process');
const out = [];
const say = (s) => out.push(s);

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// 1) SYNTAX
let ok = false, msg = '';
try {
  fs.copyFileSync('app.js', '_v2_chk.mjs');
  cp.execSync('node --check _v2_chk.mjs', { stdio: 'pipe' });
  ok = true;
} catch (e) { msg = String(e.stdout || '') + String(e.stderr || ''); }
try { fs.unlinkSync('_v2_chk.mjs'); } catch (e) {}
say('1) SYNTAX: ' + (ok ? 'PASS' : 'FAIL ' + msg.slice(0, 300)));

// 2) MISSING-BUT-CALLED
function decls(src) {
  const set = new Set();
  let m;
  const re = /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
  while ((m = re.exec(src))) set.add(m[1]);
  const re2 = /(?:^|\n)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g;
  while ((m = re2.exec(src))) set.add(m[1]);
  return set;
}
const base = fs.readFileSync('_chk_app.mjs', 'utf8');
const missing = [];
{
  const b = decls(base), a = decls(app);
  const removed = [...b].filter((f) => !a.has(f));
  removed.forEach((f) => {
    const re = new RegExp('(?<![\\w$.])' + f.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
    if (re.test(app)) missing.push(f);
  });
  say('2) decls base=' + b.size + ' now=' + a.size + ' removed=' + removed.length);
}
say('   MISSING-BUT-CALLED (must be 0): ' + missing.length + ' ' + JSON.stringify(missing));

// 3) ENTRY POINT + WORKSPACE
const bo = html.indexOf('class="smart-docs-body"');
const bc = bo >= 0 ? html.indexOf('</div>', bo) : -1;
const inner = bo >= 0 && bc > bo ? html.slice(html.indexOf('>', bo) + 1, bc) : '';
say('3) ENTRY POINT');
say('   #smartDocsModal                : ' + (html.includes('id="smartDocsModal"') ? 'YES' : 'NO'));
say('   #closeSmartDocs                : ' + (html.includes('id="closeSmartDocs"') ? 'YES' : 'NO'));
say('   open-smart-docs action         : ' + (html.includes('open-smart-docs') ? 'YES' : 'NO'));
say('   openSmartDocs() in app.js      : ' + (/function openSmartDocs\s*\(/.test(app) ? 'YES' : 'NO'));
say('   closeSmartDocs() in app.js     : ' + (/function closeSmartDocs\s*\(/.test(app) ? 'YES' : 'NO'));
say('   workspace inner tags           : ' + inner.replace(/\s+/g, ' ').trim());
say('   workspace visible TEXT          : [' + inner.replace(/<[^>]*>/g, '').trim() + ']');

// 4) OLD SMART UI GONE (html + js)
const oldMarkers = ['smart-doc-card', 'smart-docs-grid', 'smart-docs-heading', 'smart-scan-view',
  'smart-import-view', 'smart-editor-view', 'smart-blank-view', 'smart-templates-view',
  'smartBlankCanvasHolder', 'smartDocumentContent', 'blank-doc', 'smartLogoBar', 'smartAddMenu',
  'smart-sig-canvas', 'smartDraftWarmup', '__smartImport', '__smartAssistant'];
say('4) OLD SMART UI MARKERS IN LIVE FILES (html+js refs; must be 0)');
oldMarkers.forEach((k) => {
  const n = html.split(k).length - 1 + app.split(k).length - 1;
  say('   ' + k.padEnd(24) + ' refs=' + n);
});

// 5) SIBLING FEATURES
const sib = {
  'Calculator #primaryDisplay': 'id="primaryDisplay"',
  'Notes #notesModal': 'id="notesModal"',
  'Notes #newNoteBtn': 'id="newNoteBtn"',
  'Notes PDF #notePreviewPdfBtn': 'id="notePreviewPdfBtn"',
  'PDF Reports #pdfReportsWorkspace': 'id="pdfReportsWorkspace"',
  'Currency #currencyMenuButton': 'id="currencyMenuButton"',
  'Drawer #drawer': 'id="drawer"',
  'FeatureNav #featureNav': 'id="featureNav"',
  'SW register (app.js)': 'registerServiceWorker'
};
say('5) SIBLING FEATURES (index.html / app.js)');
Object.keys(sib).forEach((k) => {
  const present = html.includes(sib[k]) || app.includes(sib[k]);
  say('   ' + k.padEnd(34) + ' : ' + (present ? 'YES' : 'NO'));
});

// 6) CSS
say('6) CSS');
say('   .smart-workspace-empty rule    : ' + (css.includes('.smart-workspace-empty') ? 'YES' : 'NO'));
let deadRules = 0;
const re = /(?:^|\n)([^{}\n][^{}]*)\{/g;
let m;
while ((m = re.exec(css))) {
  const sel = m[1].trim();
  if (/^(\/\*|\*)/.test(sel)) continue;
  if (!/\.smart-(doc|docs|blank|scan|import|editor|templates|table|image|logo|sig)/.test(sel)) continue;
  const classes = sel.match(/\.[a-z0-9_-]+/gi) || [];
  let used = false;
  classes.forEach((c) => {
    const n = c.replace('.', '');
    if (html.includes(n) || app.includes(n)) used = true;
  });
  if (!used) deadRules++;
}
say('   dead .smart-* CSS rules (unreferenced by live html/js): ' + deadRules);
say('   (kept intentionally -> removing them is cosmetic only; see scope report)');

console.log(out.join('\n'));
