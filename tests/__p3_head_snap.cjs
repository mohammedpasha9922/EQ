// Build a HEAD snapshot dir to check whether smart_pdf_phase_static.test.mjs
// failures are pre-existing (independent of the Smart PDF Phase 03 work).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const repo = 'd:/Programs EQ7/EQ';
const dir = path.join(repo, 'tests/__p3_head');
fs.mkdirSync(dir, { recursive: true });
for (const f of ['app.js', 'index.html', 'styles.css', 'package.json', 'manifest.json']) {
  const buf = execSync(`git show HEAD:${f}`, { cwd: repo, maxBuffer: 1024 * 1024 * 400 });
  fs.writeFileSync(path.join(dir, f), buf);
}
for (const f of ['smart_pdf_phase_static.test.mjs', 'part41_smart_pdf_vertical_scroll.test.mjs', 'phase01_pdf_entry.test.mjs']) {
  const src = path.join(repo, 'tests', f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, f));
}
const h = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const rep = [
  'smartDocsModal@' + h.indexOf('id="smartDocsModal"'),
  'smartPdfWorkspace@' + h.indexOf('id="smartPdfWorkspace"'),
  'drawerOverlay@' + h.indexOf('id="drawerOverlay"'),
  'live: smartDocsModal@' + fs.readFileSync(repo + '/index.html', 'utf8').indexOf('id="smartDocsModal"'),
  'live: smartPdfWorkspace@' + fs.readFileSync(repo + '/index.html', 'utf8').indexOf('id="smartPdfWorkspace"'),
  'live: drawerOverlay@' + fs.readFileSync(repo + '/index.html', 'utf8').indexOf('id="drawerOverlay"')
];
fs.writeFileSync(repo + '/tests/__p3_order.txt', rep.join('\n'));
console.log(rep.join('\n'));
