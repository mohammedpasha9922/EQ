import fs from 'fs';
const src=fs.readFileSync('app.js','utf8');
const r=/translations\s*=\s*\{([\s\S]*?)\};\s*const smartNames/;
const m=src.match(r);
if(!m){console.log('NO TRANS OBJ');process.exit(1);}
const block=m[1];
const locs=['en','es','ar','fr','ru','de','tr'];
const data={};
for(const loc of locs){
  const lr=/\s*\b"+loc+"\s*:\s*\{([\s\S]*?)\},\s*\b"+loc+"Names\s*:/;
  const lm=block.match(lr);
  if(!lm){console.log(loc+': NO BLOCK');continue;}
  const entries=lm[1];
  const keys=new Set();
  const kv=/\b([a-zA-Z][a-zA-Z0-9]*)\s*:\s*'([^']*)'/g;
  let mm;
  while((mm=kv.exec(entries))!==null)keys.add(mm[1]);
  data[loc]=keys;
  console.log(loc+': keys='+keys.size);
}
const enK=data.en||new Set();
for(const loc of locs.slice(1)){
  const miss=[];
  for(const k of enK)if(!data[loc]?.has(k))miss.push(k);
  if(miss.length)console.log(loc+' MISSING('+miss.length+'):'+miss.join(','));
}
SCRIPT
echo 'written'