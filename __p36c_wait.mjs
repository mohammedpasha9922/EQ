import fs from 'node:fs';
const t0=Date.now();
while(Date.now()-t0<120000){
  try{
    const s=fs.readFileSync('__p36c_result.txt','utf8');
    if(s.includes('TOTAL=')){ console.log('DONE FINAL LINES:'); console.log(s.split('\n').slice(-8).join('\n')); process.exit(0); }
  }catch(e){}
  await new Promise(r=>setTimeout(r,1500));
}
console.log('TIMEOUT; current tail:');
const s=fs.readFileSync('__p36c_result.txt','utf8');
console.log(s.split('\n').slice(-6).join('\n'));
process.exit(2);