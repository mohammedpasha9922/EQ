const fs=require('fs');
const lines=fs.readFileSync('app.js','utf8').split('\n');
const pats=['smartBlank','smartImport','smartScan','smartTable','smartLogo','smartAdd','smartDraft','smartTemplate','smartPdf','smartReview'];
const hits={}; pats.forEach(p=>hits[p]=[]);
lines.forEach((l,i)=>{pats.forEach(p=>{if(l.includes(p))hits[p].push((i+1)+': '+l.trim().slice(0,120));});});
let out='';
pats.forEach(p=>{out+='== '+p+' ('+hits[p].length+') ==\n'+hits[p].slice(0,40).join('\n')+'\n';});
fs.writeFileSync('_SCOPE2_OUT.txt',out);
console.log('wrote scope2');
