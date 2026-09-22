// Check ku block coverage of every data-i18n key used in index.html (test-only artifact).
import fs from 'node:fs';
const s = fs.readFileSync('app.js', 'utf8');
const m = s.match(/\bku:\s*\{/);
console.log('ku block found at index:', m ? m.index : 'NONE');
const blk = m ? s.slice(m.index, m.index + 80000) : '';
console.log('pdfReportsSubtitle in ku block:', /pdfReportsSubtitle/.test(blk));
console.log('pdfWorkspaceTitle in ku block:', /pdfWorkspaceTitle/.test(blk));

// all data-i18n keys in index.html
const html = fs.readFileSync('index.html', 'utf8');
const htmlKeys = [...new Set([...html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)].map((x) => x[1]))];
console.log('data-i18n keys in index.html:', htmlKeys.length);

// en reference
const ref = JSON.parse(fs.readFileSync('__phase37b/en_keys.json', 'utf8'));
const refKeys = Object.keys(ref);
const htmlNotInRef = htmlKeys.filter((k) => !refKeys.includes(k));
console.log('html data-i18n keys NOT in en_keys.json (' + htmlNotInRef.length + '):', htmlNotInRef.join(', ') || '(none)');

// ku block keys: crude parse of the injected block
const blkText = blk.slice(0, blk.indexOf('\n  },'));
const blkKeys = [...blkText.matchAll(/^\s{4}"?([A-Za-z0-9_]+)"?:/gm)].map((x) => x[1]);
console.log('ku block parsed keys:', blkKeys.length);
const htmlNotInKu = htmlKeys.filter((k) => !blkKeys.includes(k));
console.log('html data-i18n keys NOT in ku block (' + htmlNotInKu.length + '):', htmlNotInKu.join(', ') || '(none)');
