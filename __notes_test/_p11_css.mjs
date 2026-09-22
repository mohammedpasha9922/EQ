import fs from 'node:fs';
const f = 'd:/Programs EQ7/EQ/styles.css';
let s = fs.readFileSync(f, 'utf8');
const start = s.indexOf('/* --- PART 11: Note → PDF Export dialog (session-only options) --- */');
const endMarker = '/* --- Note Table --- */';
const end = s.indexOf(endMarker, start);
if (start === -1 || end === -1) { console.log('MARKERS NOT FOUND', start, end); process.exit(1); }
const NEW = `/* --- PART 11: Note → PDF Export dialog (session-only options) --- */
.note-export-pdf-backdrop {
  position: fixed;
  inset: 0;
  z-index: 4600;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  padding: 16px;
}
.note-export-pdf-backdrop.show { display: flex; }
.note-export-pdf {
  background: var(--surface, #ffffff);
  color: var(--text, #0f172a);
  border: 1px solid var(--border, #cbd5e1);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.22);
  width: 100%;
  max-width: 400px;
  max-height: 92vh;
  overflow: auto;
  font-family: inherit;
}
.note-export-pdf-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #cbd5e1);
}
.note-export-pdf-header .icon-btn { flex: 0 0 auto; }
.note-export-pdf-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  flex: 1;
}
.note-export-pdf-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.note-export-field { display: flex; flex-direction: column; gap: 6px; }
.note-export-label { font-size: 13px; font-weight: 600; color: var(--text-muted, #475569); }
.note-export-field select,
.note-export-field input[type="text"] {
  width: 100%;
  padding: 9px 10px;
  font-size: 14px;
  border: 1px solid var(--border, #cbd5e1);
  border-radius: 8px;
  background: var(--surface, #ffffff);
  color: inherit;
  font-family: inherit;
}
.note-export-field input[type="text"]:focus,
.note-export-field select:focus { outline: 2px solid var(--accent, #0d9488); outline-offset: 1px; }
.note-export-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 0;
}
.note-export-check input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent, #0d9488); }
.note-export-pdf-actions {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-top: 1px solid var(--border, #cbd5e1);
}
.note-export-btn {
  flex: 1;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
}
.note-export-btn.primary {
  background: var(--accent, #0d9488);
  color: #ffffff;
}
.note-export-btn.primary:hover { filter: brightness(1.05); }
.note-export-btn.secondary {
  background: transparent;
  color: inherit;
  border-color: var(--border, #cbd5e1);
}
.note-export-btn.secondary:hover { background: var(--surface-subtle, #f1f5f9); }

`;
s = s.slice(0, start) + NEW + s.slice(end);
fs.writeFileSync(f, s);
console.log('CSS PATCH OK');