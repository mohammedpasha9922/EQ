import fs from 'fs';
const out = [];
// app_fixed.js tr block start
{ const s = fs.readFileSync('app_fixed.js', 'utf8'); const i = s.indexOf('tr: {'); out.push('APP_FIXED_TR_LINE', s.slice(i - 20, i + 120)); }
// CSS data-language / dir selectors (full list)
{ const s = fs.readFileSync('styles.css', 'utf8'); const lines = s.split('\n'); let inAr=false, cur=''; const blocks=[]; lines.forEach((l, i) => { if (/data-language='ar'/.test(l) && /\./.test(l)) { if (cur) blocks.push(cur); cur = (i+1)+': '+l.trim(); } else if (cur && /^\s*[.#]/.test(l)) cur += '\n'+(i+1)+': '+l.trim().slice(0,170); else if (cur && /^\s*\*\//.test(l)) { blocks.push(cur+'\n'+(i+1)+': '+l.trim()); cur=''; } }); if (cur) blocks.push(cur); out.push('CSS_AR_BLOCKS', blocks.join('\n---\n')); }
// All RTL gates with line numbers
{ const s = fs.readFileSync('app.js','utf8'); const lines=s.split('\n'); lines.forEach((l,i)=>{ if(/===\s*'ar'|'ar'\s*===|state\.isRTL|setAttribute\('dir'|datum|data-language/.test(l)) out.push((i+1)+':'+l.trim().slice(0,180)); }); }
fs.writeFileSync('__phase37b/full_audit.txt', out.join('\n\n'), 'utf8');
console.log('ok');