const fs = require('fs');
// --- app.js patch: programmatic cell focus (capture phase beats the drag handler) ---
const ap = 'd:/Programs EQ7/EQ/app.js';
let a = fs.readFileSync(ap, 'utf8');
const an = "  // Track the focused cell for per-cell styling; the store is updated by the\r\n  // existing input handler (smartPdfOverlayReadTable).\r\n  box.addEventListener('focusin', (ev) => {";
const an2 = "  // Track the focused cell for per-cell styling; the store is updated by the\n  // existing input handler (smartPdfOverlayReadTable).\n  box.addEventListener('focusin', (ev) => {";
const focusPatch = "  // PART 23 — clicking a cell must focus it for editing even when the overlay\n  // drag handler preventDefaults the native focus (capture phase runs first).\n  box.addEventListener('pointerdown', (ev) => {\n    const td = ev.target && ev.target.closest ? ev.target.closest('td[contenteditable]') : null;\n    if (!td) return;\n    try { td.focus(); } catch (e) {}\n  }, true);\n  // Track the focused cell for per-cell styling; the store is updated by the\n  // existing input handler (smartPdfOverlayReadTable).\n  box.addEventListener('focusin', (ev) => {";
if (a.indexOf(an) > -1) { a = a.replace(an, focusPatch.replace(/\r\n/g, '\r\n')); console.log('app focus patch (crlf) OK'); }
else if (a.indexOf(an2) > -1) { a = a.replace(an2, focusPatch); console.log('app focus patch (lf) OK'); }
else { console.log('APP ANCHOR NOT FOUND'); process.exit(1); }
fs.writeFileSync(ap, a);
// --- styles.css patch: clamp the toolbar inside the table box (responsive) ---
const cp = 'd:/Programs EQ7/EQ/styles.css';
let c = fs.readFileSync(cp, 'utf8');
const cs = 'max-width: min(92vw, 560px);';
if (c.indexOf(cs) > -1) { c = c.replace(cs, 'max-width: min(100%, 560px);'); fs.writeFileSync(cp, c); console.log('css patch OK'); }
else console.log('css already patched / not found:', c.split('smart-pdf-tbar {').length - 1);
