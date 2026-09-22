// SMART DOCUMENTS — CLEAN RESET: gut index.html modal body (this phase only).
const fs = require('fs');
const raw = fs.readFileSync('index.html', 'utf8');
const CRLF = raw.includes('\r\n');
const lines = raw.split(/\r?\n/);
// sanity: line 1281 = modal open, line 2220 = modal close
if (!/id="smartDocsModal"/.test(lines[1280]) || lines[2219].trim() !== '</div>') {
  console.error('HTML boundary check failed:', JSON.stringify(lines[1280]), '<->', JSON.stringify(lines[2219]));
  process.exit(1);
}
const shell = [
  '      <!-- SMART DOCUMENTS — CLEAN RESET: empty workspace placeholder only.',
  '           All previous tools (scan, import, editor, templates, drafts,',
  '           review and export) were removed. The entry point is unchanged. -->',
  '      <div class="smart-docs-home" role="dialog" aria-modal="true" aria-labelledby="smartDocsTitle">',
  '        <header class="smart-docs-header">',
  '          <button id="closeSmartDocs" class="notes-back-btn icon-btn" type="button" aria-label="Back">',
  '            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  '          </button>',
  '          <h3 id="smartDocsTitle" data-i18n="smartDocsTitle">\uD83D\uDCC4 Smart Documents</h3>',
  '        </header>',
  '        <div class="smart-docs-body">',
  '          <div class="smart-workspace-empty">Empty workspace</div>',
  '        </div>',
  '      </div>'
];
const out = lines.slice(0, 1281).concat(shell, lines.slice(2219));
fs.writeFileSync('index.html', out.join(CRLF ? '\r\n' : '\n'));
console.log('OK — index.html now', out.length, 'lines (was', lines.length + ')');
