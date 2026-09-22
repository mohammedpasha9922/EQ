import fs from 'node:fs';
const a = fs.readFileSync('app.js','utf8');
for(const n of ['importKeepImagesBtn','smartImportKeepImages','Keep Pages as Images','smartImportKeepBtn']){
  let i=-1,c=0;
  while(true){ i=a.indexOf(n,i+1); if(i<0||c>5) break; c++;
    console.log('=='+n+'#'+c+'@'+i+'==');
    console.log(a.slice(Math.max(0,i-220),i+400).replace(/[\r\n]+/g,' ').slice(0,640)); console.log('');
  }
}