// Repo-wide audit of smart-* CSS class usage (to decide safe CSS cleanup).
const fs = require('fs');
const path = require('path');
const out = [];

function walk(dir, list = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('__')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, list);
    else if (/\.(js|mjs|html|css|json)$/i.test(e.name)) list.push(p);
  }
  return list;
}

const files = walk('.');
out.push('=== FILES SCANNED: ' + files.length + ' ===');

const css = fs.readFileSync('styles.css', 'utf8');
out.push('styles.css size: ' + css.length + ' bytes, lines=' + css.split(/\r?\n/).length);
out.push('has .smart-workspace-empty rule: ' + /\.smart-workspace-empty/.test(css));

// smart-* classes defined in styles.css
const defs = [...new Set((css.match(/\.smart-[a-z0-9_-]+/gi) || []))].map((x) => x.toLowerCase());
out.push('smart-* classes defined in styles.css: ' + defs.length);

// repo-wide usage (excluding styles.css itself and my temp scripts)
const users = files.filter((f) => f.replace(/\\/g, '/') !== 'styles.css' && !/^\.\/_[a-z0-9_]+\.(js|mjs|txt)$/i.test(f.replace(/\\/g, '/')));
out.push('');
out.push('=== repo-wide references per smart-* class (outside styles.css) ===');
const stillUsed = [];
const unusedNow = [];
defs.forEach((cls) => {
  const bare = cls.slice(1);
  const hits = [];
  users.forEach((f) => {
    let src;
    try { src = fs.readFileSync(f, 'utf8'); } catch (e) { return; }
    if (src.includes(bare)) hits.push(f.replace(/\\/g, '/'));
  });
  if (hits.length) { stillUsed.push({ cls, hits }); } else unusedNow.push(cls);
});

out.push('--- STILL USED (' + stillUsed.length + ') ---');
stillUsed.forEach((u) => out.push('  ' + u.cls + '  <- ' + u.hits.join(', ')));
out.push('--- UNUSED REPO-WIDE (' + unusedNow.length + ') ---');
out.push('  ' + unusedNow.join(', '));

fs.writeFileSync('_r8_out.txt', out.join('\n'), 'utf8');
console.log('done');
