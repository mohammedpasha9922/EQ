import fs from 'fs';
const s=fs.readFileSync('styles.css','utf8');
const lines=s.split('\n');
const out=[];
let depth=0, inBlock=false, cur='', prevRaw='';
const isAR=(l)=>/body\[data-language='ar'\]/.test(l);
const isBrace=(l)=>/^([\t ]*)\{/.test(l);
const isClose=(l)=>/^[ \t]*\}/.test(l.trim());
for(let i=0;i<lines.length;i++){
  const raw=lines[i], l=raw.trim();
  if(isAR(raw)){
    cur=(i+1)+': '+raw.trim();
    depth=0; inBlock=true; prevRaw=l; continue;
  }
  if(inBlock){
    prevRaw=l;
    if(isBrace(raw)) depth++;
    if(isClose(raw)){ depth--; if(depth===0){ out.push(cur+'\n'+(i+1)+': '+raw.trim()); cur=''; inBlock=false; } }
    if(cur && depth>=0){ cur+='\n'+(i+1)+': '+raw.trim().slice(0,200); }
  }
}
fs.writeFileSync('__phase37b/css_ar_blocks.txt', out.join('\n\n-----\n'), 'utf8');
console.log('wrote', out.length, 'blocks');
// also dump [dir='rtl'] and [dir="rtl"] single selectors
const rtlAttr=[];
for(let i=0;i<lines.length;i++){ if(/\[dir=['"]rtl['"]\]/.test(lines[i])) rtlAttr.push((i+1)+': '+lines[i].trim().slice(0,150)); }
fs.writeFileSync('__phase37b/css_rtl_attr.txt', rtlAttr.join('\n'), 'utf8');
console.log('rtl_attr', rtlAttr.length);
// also elem[dir=] blocks
const elemDir=[];
let d=false, dc='', ds=0;
for(let i=0;i<lines.length;i++){ const l=lines[i], t=l.trim();
  if(/[.]{1,3}\w+\[dir=/.test(l) && !/^[ \t]*\}/.test(t)){ dc=(i+1)+': '+t; d=true; continue; }
  if(d){ if(/^[ \t]*\}/.test(t)){elemDir.push(dc+'\n'+(i+1)+': '+t); d=false;} else dc+='\n'+(i+1)+': '+t.slice(0,170); }
}
fs.writeFileSync('__phase37b/css_elem_dir.txt', elemDir.join('\n\n-----\n'), 'utf8');
console.log('elem_dir blocks', elemDir.length);