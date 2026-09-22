// Final attribution probe: was #drawerToggle removed by THIS phase (Smart Docs reset)
// or was it already absent from the pre-existing dirty worktree?
const fs = require('fs');
const cp = require('child_process');
const out = [];
const L = (s) => out.push(s);

function read(f) { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } }
function gitShow(rev, p) { try { return cp.execSync(`git show ${rev}:${p}`, { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { return null; } }

const worktree = read('index.html');
const indexVer = gitShow('', 'index.html');
const headVer = gitShow('HEAD', 'index.html');
const baks = ['index.html.pdfclear.bak', '_myhead_index.html'];

L('=== presence matrix (drawerToggle / featureNavBar / smartDocsModal) ===');
const rows = [['WORKTREE', worktree], ['INDEX', indexVer], ['HEAD', headVer]];
for (const b of baks) rows.push([b, read(b)]);
for (const [name, txt] of rows) {
  if (txt === null) { L(`${name}: <missing>`); continue; }
  L(`${name}: drawerToggle=${(txt.match(/drawerToggle/g) || []).length} featureNavBar=${(txt.match(/featureNavBar/g) || []).length} smartDocsModal=${(txt.match(/smartDocsModal/g) || []).length} app-logo=${(txt.match(/app-logo/g) || []).length}`);
}

L('');
L('=== header structural fingerprint (line with h1.app-logo + following 6 lines) ===');
function headerBlock(txt) {
  if (!txt) return '<missing>';
  const lines = txt.split('\n');
  const i = lines.findIndex((l) => /class="app-logo"/.test(l));
  if (i < 0) return '<no app-logo line>';
  return lines.slice(i, i + 26).map((l) => l.trim()).join('\n');
}
for (const [name, txt] of rows) {
  L(`--- ${name} ---`);
  L(headerBlock(txt));
  L('');
}

L('=== HEAD/INDEX drawerToggle line + 2 lines of context ===');
function ctx(txt, label) {
  if (!txt) { L(`${label}: <missing>`); return; }
  const lines = txt.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('drawerToggle')) {
      L(`${label} @${i + 1}:`);
      for (let k = Math.max(0, i - 2); k <= Math.min(lines.length - 1, i + 2); k++) L(`   ${k + 1}: ${lines[k].trim()}`);
    }
  });
}
ctx(indexVer, 'INDEX');
ctx(headVer, 'HEAD');
ctx(worktree, 'WORKTREE');

L('');
L('=== does any snapshot contain the other drawer openers? ===');
for (const [name, txt] of rows) {
  if (!txt) continue;
  const ids = ['drawerToggle', 'drawerOpenButton', 'openDrawer', 'drawer-menu-btn', 'menuButton'];
  L(`${name}: ` + ids.map((id) => `${id}=${(txt.match(new RegExp(id, 'g')) || []).length}`).join(' '));
}

L('');
L('=== git status for index.html (is the removal staged or unstaged?) ===');
try { L(cp.execSync('git status --porcelain -- index.html', { encoding: 'utf8' })); } catch (e) { L('status failed'); }

L('');
L('=== diff: worktree vs INDEX, lines mentioning drawer (U0) ===');
try {
  const d = cp.execSync('git diff -U0 -- index.html', { encoding: 'utf8', maxBuffer: 1 << 28 });
  const keep = d.split('\n').filter((l) => l.startsWith('@@') || /drawer/i.test(l));
  L(keep.join('\n'));
} catch (e) { L('diff failed'); }

fs.writeFileSync('_FINQ_out.txt', out.join('\n'), 'utf8');
console.log('WROTE _FINQ_out.txt');
