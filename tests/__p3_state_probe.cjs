const { execSync } = require('child_process');
const fs = require('fs');
const R = 'd:/Programs EQ7/EQ';
const out = [];
try { out.push('=== STATUS ==='); out.push(execSync('git status --short', { cwd: R }).toString() || '(clean)'); } catch (e) { out.push('status err ' + e.message); }
try { out.push('=== DIFFSTAT ==='); out.push(execSync('git diff --stat', { cwd: R }).toString() || '(no diff)'); } catch (e) { out.push('diffstat err'); }
const app = fs.readFileSync(R + '/app.js', 'utf8');
const html = fs.readFileSync(R + '/index.html', 'utf8');
let css = ''; try { css = fs.readFileSync(R + '/styles.css', 'utf8'); } catch (e) {}
const g = (s, pat) => { const m = s.match(new RegExp(pat, 'g')); return m ? m.length : 0; };
out.push('=== IDS in index.html ===');
for (const id of ['smartPdfWorkspace','smartPdfUploadArea','smartPdfUploadBtn','smartPdfFileInput','smartPdfViewerArea','smartPdfViewerScroll','smartPdfViewerPages','smartPdfPageIndicator','smartPdfTitle','smartPdfBackBtn']) out.push(id + '=' + html.includes('id="' + id + '"'));
out.push('=== app.js markers ===');
for (const k of ['smartPdfPageIndicator','smartPdfUploadError','smartPdfUploadTooLarge','smartPdfViewer','openSmartPdfWorkspace','closeSmartPdfWorkspace','smartImportLoadPdfJs','openPdfReportsWorkspace']) out.push(k + '=' + g(app, k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
out.push('=== css markers ===');
out.push('smart-pdf-viewer=' + css.includes('smart-pdf-viewer'));
out.push('=== workspace section (html idx ' + html.indexOf('id="smartPdfWorkspace"') + ') ===');
const i = html.indexOf('id="smartPdfWorkspace"');
out.push(html.slice(Math.max(0, i - 200), i + 3500));
fs.writeFileSync(R + '/tests/__p3_state.txt', out.join('\n'));
