// Smart Documents Clean Reset — final consolidated audit (read-only).
const fs = require('fs');
const cp = require('child_process');
const out = [];
const say = (s) => out.push(s);

// ---------- 1) drawerToggle attribution ----------
try {
  const head = cp.execSync('git show HEAD:index.html', { encoding: 'utf8' });
  const idx = cp.execSync('git show :index.html', { encoding: 'utf8' });
  const wt = fs.readFileSync('index.html', 'utf8');
  say('drawerToggle counts -> HEAD=' + (head.match(/drawerToggle/g) || []).length +
      ' INDEX=' + (idx.match(/drawerToggle/g) || []).length +
      ' WORKTREE=' + (wt.match(/drawerToggle/g) || []).length);
  for (const f of ['index.html.pdfclear.bak', '_myhead_index.html']) {
    if (fs.existsSync(f)) {
      const t = fs.readFileSync(f, 'utf8');
      say('  ' + f + ': drawerToggle=' + (t.match(/drawerToggle/g) || []).length +
          ' smartDocsModal=' + (t.match(/smartDocsModal/g) || []).length);
    } else say('  ' + f + ': (absent)');
  }
} catch (e) { say('drawerToggle check failed: ' + e.message); }

// ---------- 2) index.html: openers + Smart Documents workspace ----------
const wtLines = fs.readFileSync('index.html', 'utf8').split(/\r?\n/);
say('--- index.html opener-ish lines ---');
wtLines.forEach((l, i) => {
  if (/open-smart-docs|drawerToggle|drawer-toggle|open-drawer|menu-toggle|navToggle/.test(l)) {
    say((i + 1) + ': ' + l.trim().slice(0, 170));
  }
});
say('--- index.html smartDocsModal block (1281-1300) ---');
for (let i = 1280; i < 1300 && i < wtLines.length; i++) say((i + 1) + ': ' + wtLines[i]);

// ---------- 3) index.html: leftover OLD Smart Documents UI markers ----------
const oldMarkers = [
  'smart-doc-card', 'smart-docs-grid', 'smart-docs-heading', 'smart-doc-toolbar',
  'data-toolbar="blank-doc"', 'smartBlankCanvas', 'smartDocumentContent', 'data-tool=',
  'smart-tool-btn', 'smart-add-item', 'smart-doc-text-block', 'smart-doc-signature',
  'smart-doc-logo', 'smart-doc-image', 'smart-doc-table', 'smart-docs-steps',
  'smart-docs-toolbar', 'data-add=', 'smart-scan'
];
say('--- leftover old Smart Documents markers in index.html ---');
for (const m of oldMarkers) {
  const re = new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const n = (fs.readFileSync('index.html', 'utf8').match(re) || []).length;
  say('  ' + m + ' = ' + n);
}

// ---------- 4) app.js: entry point + state seams ----------
const app = fs.readFileSync('app.js', 'utf8');
say('--- app.js key symbols ---');
for (const s of ['function openSmartDocs', 'function closeSmartDocs', 'smartDocsModal',
                 'closeSmartDocsButton', 'smartBlankOpen', 'window.__smartDocsWorkflow',
                 'window.__smartScan', 'renderSmartDocsSteps', 'smartDocsStep']) {
  const n = (app.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  say('  ' + s + ' = ' + n);
}
say('--- app.js references to removed content surfaces (should be 0 or guarded) ---');
for (const s of ['smartBlankCanvasHolder', 'smartDocumentContent', 'smart-doc-text-block',
                 'data-toolbar="blank-doc"', 'smartTableCreate(', 'smartAddInsert(',
                 'smartSignatureInsert(', 'smartPageCurrentCanvas(']) {
  const n = (app.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  say('  ' + s + ' = ' + n);
}

// ---------- 5) missing-but-called (dangling) scan vs pre-reset baseline ----------
const baselineFile = '_adbar_base/app.js';
if (fs.existsSync(baselineFile)) {
  const base = fs.readFileSync(baselineFile, 'utf8');
  const declRe = /^function\s+([A-Za-z_$][\w$]*)/gm;
  const grab = (src) => { const s = new Set(); let m; declRe.lastIndex = 0; while ((m = declRe.exec(src))) s.add(m[1]); return s; };
  const baseDecl = grab(base), curDecl = grab(app);
  const removed = [...baseDecl].filter((n) => !curDecl.has(n));
  const dangling = removed.filter((n) => new RegExp('(?<![\\w$.])' + n + '\\s*\\(').test(app));
  say('--- dangling scan (baseline=' + baselineFile + ') ---');
  say('  baseline fns=' + baseDecl.size + ' current fns=' + curDecl.size +
      ' removed=' + removed.length + ' removed-but-still-called=' + dangling.length);
  if (dangling.length) say('  DANGLING: ' + dangling.join(', '));
} else say('baseline ' + baselineFile + ' absent (skipped)');

fs.writeFileSync('_DONE.txt', out.join('\r\n'), 'utf8');
console.log(out.join('\n'));
