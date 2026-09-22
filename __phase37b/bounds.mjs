import fs from 'fs';
const out = [];
{ const s = fs.readFileSync('app.js','utf8'); const lines=s.split('\n');
  // find the closing of translations object: after tr block ending
  let trStart=-1, trEnd=-1, objEnd=-1;
  for(let i=0;i<lines.length;i++){ if(/^\s{2,4}tr:\s*\{/.test(lines[i])&&trStart<0)trStart=i;
    if(trStart>=0&&trEnd<0&&/^\s{2,4}\},\s*$/.test(lines[i]))trEnd=i;
  }
  out.push('APP_tr_block lines',(trStart+1)+' to '+(trEnd+1));
  out.push('APP_tr_first',lines[trStart].trim());
  out.push('APP_tr_last',lines[trEnd].trim());
  // find the }; that closes translations (search backward from trStart for "const translations = {")
  let ts=-1; for(let i=trStart;i>=0;i--){ if(/const translations/.test(lines[i])){ts=i;break;} }
  out.push('APP_translations_start_line',(ts+1));
  // now find closing }; after trEnd
  let depth=0,closeLine=-1; for(let i=trEnd;i<lines.length;i++){ if(/{/.test(lines[i]))depth++; if(/}/.test(lines[i]))depth--; if(depth===0&&/\};/.test(lines[i])){closeLine=i;break;} }
  out.push('APP_translations_end_line',(closeLine+1));
  out.push('APP_after_translations', lines[closeLine+1] ? lines[closeLine+1].trim() : '(EOF)');
  for(let i=closeLine-2;i<=closeLine+2;i++) out.push('  '+(i+1)+': '+lines[i]);
}
{ const s = fs.readFileSync('app_fixed.js','utf8'); const lines=s.split('\n');
  let trStart=-1, trEnd=-1;
  for(let i=0;i<lines.length;i++){ if(/^\s{2,4}tr:\s*\{/.test(lines[i])&&trStart<0)trStart=i;
    if(trStart>=0&&trEnd<0&&/^\s{2,4}\},\s*$/.test(lines[i])&&i>trStart)trEnd=i;
  }
  out.push('FIXED_tr_block lines',(trStart+1)+' to '+(trEnd+1));
  out.push('FIXED_tr_first',lines[trStart]?.trim());
  out.push('FIXED_tr_last',lines[trEnd]?.trim());
  let ts=-1; for(let i=trStart;i>=0;i--){ if(/const translations/.test(lines[i])){ts=i;break;} }
  out.push('FIXED_translations_start_line',(ts+1));
  let depth=0,closeLine=-1; for(let i=trEnd;i<lines.length;i++){ if(/{/.test(lines[i]))depth++; if(/}/.test(lines[i]))depth--; if(depth===0&&/\};/.test(lines[i])){closeLine=i;break;} }
  out.push('FIXED_translations_end_line',(closeLine+1));
  out.push('FIXED_after_translations', lines[closeLine+1] ? lines[closeLine+1].trim() : '(EOF)');
}
// CSS [dir='rtl'] and [dir="rtl"] selectors (not data-language)
{ const s=fs.readFileSync('styles.css','utf8'); const lines=s.split('\n');
  lines.forEach((l,i)=>{ if(/\[dir=['"]rtl['"]\]/.test(l)) out.push('CSS_rtl_attr '+(i+1)+': '+l.trim().slice(0,160)); }); }
// CSS block-level dir rules: .smart-blank-view[dir='rtl'] etc
{ const s=fs.readFileSync('styles.css','utf8'); const lines=s.split('\n');
  lines.forEach((l,i)=>{ if(/[.]{1,3}\w+\[dir=/.test(l)) out.push('CSS_elem_dir '+(i+1)+': '+l.trim().slice(0,160)); }); }
fs.writeFileSync('__phase37b/bounds.txt', out.join('\n'),'utf8');
console.log('ok');