const fs = require('fs'); const { execSync } = require('child_process');
const O = []; const L = (s) => O.push(s); const R = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
let syn = '?';
try { fs.copyFileSync('app.js', '_F2.mjs'); execSync('node --check _F2.mjs', { stdio: 'pipe' }); syn = 'PASS'; }
catch (e) { syn = 'FAIL ' + String(e.stdout || e.message).slice(0, 300); }
L('1 SYNTAX app.js(ESM): ' + syn);
const app = R('app.js') || '', html = R('index.html') || '', css = R('styles.css') || '';
L('2 ENTRY: modal=' + html.includes('id="smartDocsModal"') + ' action=' + html.includes('open-smart-docs')
  + ' closeBtn=' + html.includes('id="closeSmartDocs"') + ' openSmartDocs()=' + /function openSmartDocs\s*\(/.test(app)
  + ' closeSmartDocs()=' + /function closeSmartDocs\s*\(/.test(app) + ' escClose=' + app.includes('smartDocsModal.addEventListener'));
const i = html.indexOf('id="smartDocsModal"'); const seg = html.slice(i, i + 1200);
const M = ['smartBlankCanvasHolder', 'smartDocumentContent', 'smartBlankCanvas', 'smart-doc-card', 'smart-docs-grid',
  'data-toolbar="blank-doc"', 'smart-doc-text-block', 'smartAddMenu', 'smartDocsStepper', 'smart-doc-toolbar',
  'smart-doc-signature', 'smart-doc-logo'];
const bad = M.filter((k) => seg.includes(k));
L('3 WORKSPACE: oldMarkersInModal=' + (bad.length ? bad.join(',') : 'NONE')
  + ' | text="' + seg.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '"');
const res = M.filter((k) => html.includes(k) || app.includes(k));
L('4 RESIDUE in html+app: ' + (res.length ? res.join(',') : 'NONE'));
const names = [...app.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((x) => x[1]);
const s = {}, d = []; names.forEach((n) => { if (s[n]) d.push(n); s[n] = 1; });
L('5 DUPLICATE funcs: ' + (d.length ? d.join(',') : 'NONE'));
const base = R('_chk_app.mjs') || R('_app_backup_cp.js') || '';
const ds = (src) => new Set([...src.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((x) => x[1]));
const b = ds(base), c = ds(app);
const KW = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'new', 'await', 'do', 'else', 'in', 'of', 'case', 'delete', 'void', 'yield', 'super', 'import', 'class']);
const called = new Set([...app.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].map((x) => x[1]));
const miss = [...called].filter((n) => !c.has(n) && b.has(n) && !KW.has(n));
L('6 MISSING-BUT-CALLED: ' + (miss.length ? miss.join(',') : 'NONE') + ' (baseline loaded=' + !!base + ')');
const A = { primaryDisplay: 'calculator', generalCalculatorPanel: 'calcPanel', notesManagerModal: 'notes', notesListPanel: 'notesList', notePdfPreviewModal: 'notesPdf', pdfReportsWorkspace: 'pdfReports', currencyMenuButton: 'currency', currencyConverterModal: 'currencyConv', 'ad-placeholder': 'adBar', 'manifest.json': 'manifest', serviceWorker: 'serviceWorker', 'id="drawer"': 'drawer' };
L('7 SIBLINGS (html/js):');
for (const k in A) L('   ' + A[k] + ' [' + k + '] html=' + (html.split(k).length - 1) + ' js=' + (app.split(k).length - 1));
const su = [...new Set([...css.matchAll(/\.smart-[A-Za-z0-9_-]+/g)].map((x) => x[0]))];
L('8 CSS: distinct .smart-* selectors=' + su.length + ' still-referenced=' + su.filter((x) => html.includes(x) || app.includes(x)).length);
L('9 CSS list: ' + su.join(', '));
L('10 SEAMS: ' + (app.match(/window\.__smart[A-Za-z0-9]*/g) || []).join(', '));
fs.writeFileSync('_F2.txt', O.join('\n'), 'utf8');
console.log(O.join('\n'));
