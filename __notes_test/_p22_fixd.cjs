const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const b = s;
const helperAnchor = 'async function smartPdfAddItem(type) {';
if (s.split(helperAnchor).length !== 2) throw new Error('additem anchor');
const HELPER = [
  '// PART 22 - convert an object/blob URL into a data URL so a picked image can be',
  '// embedded into the exported PDF (pdf-lib embeds data URLs, not blob URLs).',
  'async function smartPdfUrlToDataUrl(url) {',
  '  try {',
  "    if (!url || url.slice(0, 5) === 'data:') return url || '';",
  '    const res = await fetch(url);',
  '    const blob = await res.blob();',
  '    return await new Promise((resolve) => {',
  '      try {',
  '        const fr = new FileReader();',
  '        fr.onload = () => resolve(String(fr.result || \'\'));',
  "        fr.onerror = () => resolve('');",
  '        fr.readAsDataURL(blob);',
  "      } catch (e) { resolve(''); }",
  '    });',
  "  } catch (e) { return ''; }",
  '}',
  helperAnchor
].join('\n');
s = s.replace(helperAnchor, HELPER);
const imgAnchor = 'o.dataUrl = url2; o.w = baseW * 0.3; break;';
if (s.split(imgAnchor).length !== 2) throw new Error('img anchor');
s = s.replace(imgAnchor, 'o.dataUrl = await smartPdfUrlToDataUrl(url2); o.w = baseW * 0.3; break;');
if (s !== b) fs.writeFileSync(p, s);
console.log('FIXD OK CHANGED=' + (s !== b));