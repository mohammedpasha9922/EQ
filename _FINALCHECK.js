// Smart Documents Clean Reset - final consolidated verification (read-only).
const fs = require('fs');
const out = [];
const say = (s) => out.push(s);

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

// ---------- 1) Entry point + workspace (index.html) ----------
say('=== 1) ENTRY POINT / WORKSPACE (index.html) ===');
const modalIdx = html.indexOf('id="smartDocsModal"');
say('smartDocsModal present        : ' + (modalIdx !== -1));
const block = modalIdx === -1 ? '' : html.slice(modalIdx, html.indexOf('drawerOverlay', modalIdx) === -1 ? modalIdx + 2000 : html.indexOf('drawerOverlay', modalIdx));
const ids = [...block.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
say('workspace ids inside modal   : ' + JSON.stringify(ids));
say('closeSmartDocs button kept   : ' + /id="closeSmartDocs"/.test(block));
say('title kept (Smart Documents): ' + /Smart Documents/.test(block));
say('empty placeholder present    : ' + /class="smart-workspace-empty"/.test(block));
const bodyInner = (block.match(/<div class="smart-docs-body">([\s\S]*?)<\/div>\s*<\/div>/) || [])[1] || '';
say('workspace body inner HTML    : ' + JSON.stringify(bodyInner.trim()));
say('body has NO buttons/inputs   : ' + !/<(button|input|select|textarea|canvas|img|svg)\b/i.test(bodyInner));

// ---------- 2) Old Smart Documents DOM must be gone ----------
say('');
say('=== 2) OLD SMART DOCS DOM (index.html) - expect all 0 ===');
const domMarkers = [
  'smartBlankCanvasHolder', 'smartBlankCanvas', 'smartDocumentContent',
  'data-toolbar="blank-doc"', 'smartAddMenu', 'smartLogoBar', 'smart-doc-card',
  'smart-tool-btn', 'smartDocsStep', 'smart-doc-text-block', 'smart-doc-table',
  'smart-doc-signature', 'smart-doc-image', 'smart-doc-logo', 'smartLogoBar',
  'smartScan', 'smartDocHome', 'smartDocsHome', 'smartToolbar'
];
domMarkers.forEach((m) => {
  const n = html.split(m).length - 1;
  say('  ' + m.padEnd(26) + ': ' + n);
});

// ---------- 3) Entry point wiring (app.js) ----------
say('');
say('=== 3) ENTRY POINT WIRING (app.js) ===');
say('openSmartDocs() defined        : ' + /function openSmartDocs\s*\(/.test(app));
say('closeSmartDocs() defined       : ' + /function closeSmartDocs\s*\(/.test(app));
const openers = [...html.matchAll(/data-action="open-smart-docs"/g)].length;
say('data-action="open-smart-docs"  : ' + openers + ' (index.html)');
say('openSmartDocs call sites       : ' + (app.split('openSmartDocs(').length - 1));
say('modal show/aria wiring         : ' + /smartDocsModal\.classList\.add\('show'\)/.test(app));

// ---------- 4) Residual smart-doc-* references in app.js (CSS safety) ----------
say('');
say('=== 4) RESIDUAL smart-* SPELLINGS IN app.js (CSS safety) ===');
const cssFrags = ['smart-doc-text-block', 'smart-doc-table', 'smart-doc-signature', 'smart-doc-image',
  'smart-doc-logo', 'smart-doc-divider', 'smart-doc-border', 'smart-doc-page', 'smart-doc-heading',
  'smart-doc-content', 'smart-document-content'];
cssFrags.forEach((f) => {
  const n = app.split(f).length - 1;
  if (n) say('  ' + f.padEnd(24) + ': ' + n);
});
say('  (fragments with 0 hits omitted)');

// ---------- 5) Shared helpers must still exist ----------
say('');
say('=== 5) SHARED / SIBLING FEATURE INTEGRITY (app.js) ===');
const shared = [
  'function smartImportLoadPdfJs', 'function smartImportLoadPdfLib',
  'function openPdfReportsWorkspace', 'function addFolder', 'function folderNameExists',
  'function makeFolderId', 'function isNoteBlockTag', 'function normalizeNoteTextColor',
  'function openNotesManager', 'function openCurrencyConverter', 'function openSettings'
];
shared.forEach((s) => {
  const re = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(', 'g');
  say('  ' + s.padEnd(38) + ': ' + (re.test(app) ? 'present' : 'MISSING'));
});

// ---------- 6) Missing-but-called scan ----------
say('');
say('=== 6) MISSING-BUT-CALLED (top-level fn) vs baselines ===');
const current = new Set([...app.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]));
const builtinSafe = new Set(['require', 'fetch', 'parseInt', 'parseFloat', 'isNaN', 'setTimeout',
  'setInterval', 'clearTimeout', 'clearInterval', 'alert', 'confirm', 'prompt', 'String', 'Number',
  'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'RegExp', 'Error', 'Promise', 'Map', 'Set',
  'Blob', 'File', 'FileReader', 'Image', 'Audio', 'URL', 'getComputedStyle', 'requestAnimationFrame',
  'cancelAnimationFrame', 'btoa', 'atob', 'encodeURIComponent', 'decodeURIComponent', 'structuredClone']);
const baselines = ['_chk_app.mjs', '_adbar_base/app.js', '_app_backup_cp.js', '_head_app.js'];
let report = 'no baseline available';
for (const b of baselines) {
  if (!fs.existsSync(b)) continue;
  const base = fs.readFileSync(b, 'utf8');
  const baseFns = new Set([...base.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]));
  const missing = [...baseFns].filter((f) => !current.has(f) && !builtinSafe.has(f));
  const stillCalled = missing.filter((f) => new RegExp('(?<![.\\w$])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(', 'g').test(app));
  report = 'baseline=' + b + ' removedFns=' + missing.length + ' stillCalled=' + stillCalled.length;
  if (stillCalled.length) report += ' -> ' + JSON.stringify(stillCalled);
  break;
}
say('  ' + report);

// ---------- 7) i18n key usage for removed UI ----------
say('');
say('=== 7) SMART i18n KEYS (informational) ===');
['smartDocsTitle', 'smartDocsDesc', 'smartDocsHeading', 'smartTableCreate'].forEach((k) => {
  const n = app.split(k).length - 1;
  say('  ' + k.padEnd(20) + ': ' + n);
});

fs.writeFileSync('_FINALCHECK_OUT.txt', out.join('\n'), 'utf8');
console.log('WROTE _FINALCHECK_OUT.txt (' + out.length + ' lines)');
