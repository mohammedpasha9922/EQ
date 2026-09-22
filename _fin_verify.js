// FINAL VERIFICATION — Smart Documents Clean Reset (read-only audit)
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const R = [];
const say = (s) => { R.push(s); };

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// ---------- 1) SYNTAX ----------
let syntaxOk = false, syntaxMsg = '';
try {
  fs.copyFileSync('app.js', '_fin_chk.mjs');
  cp.execSync('node --check _fin_chk.mjs', { stdio: 'pipe' });
  syntaxOk = true;
} catch (e) {
  syntaxMsg = String(e.stdout || '') + String(e.stderr || '') + String(e.message || '');
}
try { fs.unlinkSync('_fin_chk.mjs'); } catch (e) {}
say('=== 1) SYNTAX: ' + (syntaxOk ? 'PASS (node --check exit 0)' : 'FAIL: ' + syntaxMsg.slice(0, 400)));

// ---------- 2) MISSING-BUT-CALLED (vs pre-reset baseline) ----------
const BASELINE = '_chk_app.mjs';
let base = null;
try { base = fs.readFileSync(BASELINE, 'utf8'); } catch (e) { base = null; }
say('=== 2) BASELINE ' + BASELINE + ': ' + (base ? 'present (' + base.split('\n').length + ' lines)' : 'MISSING'));

function decls(src) {
  const set = new Set();
  const re = /(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(src))) set.add(m[1]);
  const re2 = /(?:^|\n)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/g;
  while ((m = re2.exec(src))) set.add(m[1]);
  return set;
}

if (base) {
  const baseFns = decls(base);
  const appFns = decls(app);
  const removed = [...baseFns].filter((f) => !appFns.has(f));
  const stillCalled = removed.filter((f) => {
    const re = new RegExp('(?<![\\w$.])' + f.replace(/\$/g, '\\$') + '\\s*\\(', 'g');
    return re.test(app);
  });
  say('   baseline top-level decls: ' + baseFns.size + ' | current: ' + appFns.size + ' | removed: ' + removed.length);
  say('   REMOVED-BUT-STILL-CALLED: ' + stillCalled.length + ' ' + JSON.stringify(stillCalled));
}

// ---------- 3) ENTRY POINT / WORKSPACE ----------
const modalIdx = html.indexOf('id="smartDocsModal"');
const bodyOpen = html.indexOf('class="smart-docs-body"');
const bodyClose = bodyOpen >= 0 ? html.indexOf('</div>', bodyOpen) : -1;
const bodyInner = bodyOpen >= 0 && bodyClose > bodyOpen
  ? html.slice(html.indexOf('>', bodyOpen) + 1, bodyClose)
  : null;
const bodyTextOnly = bodyInner === null ? '' : bodyInner.replace(/<[^>]*>/g, '').trim();

say('=== 3) ENTRY POINT / WORKSPACE');
say('   #smartDocsModal in index.html        : ' + (modalIdx > 0 ? 'YES' : 'NO'));
say('   #closeSmartDocs in index.html        : ' + (html.includes('id="closeSmartDocs"') ? 'YES' : 'NO'));
say('   drawer action open-smart-docs        : ' + (/data-action=["']open-smart-docs["']/.test(html) ? 'YES' : 'NO'));
say('   openSmartDocs() defined in app.js    : ' + (/function openSmartDocs\s*\(/.test(app) ? 'YES' : 'NO'));
say('   closeSmartDocs() defined in app.js   : ' + (/function closeSmartDocs\s*\(/.test(app) ? 'YES' : 'NO'));
say('   closeSmartDocs wired to button       : ' + (/closeSmartDocsButton\.addEventListener\(["']click["'],\s*closeSmartDocs\)/.test(app) ? 'YES' : 'NO'));
say('   workspace inner HTML length          : ' + (bodyInner ? bodyInner.length : -1));
say('   workspace inner TEXT (must be empty) : [' + bodyTextOnly + ']');

// ---------- 4) OLD SMART UI MARKERS ----------
const markHtml = ['smart-steps', 'smart-step-label', 'smart-doc-card', 'smart-docs-grid',
  'smart-blank-canvas', 'smartBlankCanvasHolder', 'smartDocumentContent', 'data-toolbar="blank-doc"',
  'smart-sig-canvas', 'smartLogoBar', 'smartAddMenu', 'smart-table-tools', 'smart-signature-panel',
  'smartDocContent', 'smart-workspace-empty'];
say('=== 4) OLD SMART UI MARKERS IN index.html (all should be 0 except smart-workspace-empty)');
markHtml.forEach((k) => {
  const n = html.split(k).length - 1;
  say('   ' + k.padEnd(26) + ' html=' + n);
});

// ---------- 5) SIBLING FEATURES INTACT ----------
const sib = {
  'Calculator (#primaryDisplay)': 'id="primaryDisplay"',
  'Notes (#notesPanel)': 'id="notesPanel"',
  'Notes PDF (#notePreviewPdfBtn)': 'id="notePreviewPdfBtn"',
  'PDF Reports (#pdfReportsWorkspace)': 'id="pdfReportsWorkspace"',
  'Currency (#currencyMenuButton)': 'id="currencyMenuButton"',
  'Drawer (#drawer)': 'id="drawer"',
  'Ad Bar (#adBarContainer)': 'id="adBarContainer"',
  'Service worker reg': 'serviceWorker'
};
say('=== 5) SIBLING FEATURES (index.html presence)');
Object.keys(sib).forEach((k) => say('   ' + k.padEnd(34) + ' : ' + (html.includes(sib[k]) ? 'YES' : 'NO')));

// ---------- 6) FILES COUNT ----------
say('=== 6) SIZES');
say('   app.js      lines=' + app.split('\n').length);
say('   index.html  lines=' + html.split('\n').length);
say('   styles.css  lines=' + css.split('\n').length);
say('   styles.css has .smart-workspace-empty rule: ' + css.includes('.smart-workspace-empty'));

console.log(R.join('\n'));
