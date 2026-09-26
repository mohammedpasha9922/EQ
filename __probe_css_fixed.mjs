// TEMP DIAGNOSTIC (task: reserved top ad space in every view).
// Static CSS inventory: list every rule that declares position: fixed, with its
// selector and the enclosing @media context, so we know which surfaces are
// viewport-anchored overlays (candidates that could cover the global ad bar).
import fs from 'node:fs';

const css = fs.readFileSync('styles.css', 'utf8');
const lines = css.split(/\r?\n/);
let buf = '';
const stack = [];
let line = 0;
for (const raw of lines) {
  line++;
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const text = stripped.split('{');
  if (text.length === 2) {
    const sel = text[0].trim();
    if (sel.startsWith('@')) { stack.push(sel); buf = ''; continue; }
    buf = sel;
  }
  if (stripped.includes('}')) {
    if (buf && /position:\s*fixed/.test(buf + stripped)) {
      console.log(`L${line}: [${stack.join(' > ')}] ${buf.replace(/\s+/g, ' ')}`);
    }
    if (stripped.trim() === '}' || stripped.includes('}')) {
      // closing brace of a rule or of an at-rule block
      const isAtClose = stack.length && buf === '';
      if (isAtClose) stack.pop();
      buf = '';
    }
  }
  if (/position:\s*fixed/.test(stripped)) {
    const sel = stack.slice(-1);
    console.log(`L${line}: [${sel}] ${buf ? buf.replace(/\s+/g, ' ') : '(inline decl block)'}`);
  }
}
