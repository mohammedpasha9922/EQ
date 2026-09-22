import fs from 'node:fs';
const app = fs.readFileSync('app.js','utf8');
const re = /rotat/gi; let m; let n=0;
while((m=re.exec(app))!==null && n<60){ n++;
  const ctx = app.slice(Math.max(0,m.index-140), m.index+140).replace(/[\r\n]+/g,' ');
  console.log(n+': '+ctx.slice(0,300));
}
