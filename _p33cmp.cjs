const fs=require('fs');
function cmp(head,work,label){
  const a=fs.readFileSync(head,'utf8').replace(/\r\n/g,'\n');
  const b=fs.readFileSync(work,'utf8').replace(/\r\n/g,'\n');
  console.log('=== '+label+' ===');
  console.log('head_len='+a.length+' work_len='+b.length+' same='+(a===b));
  if(a!==b){
    // find first diff offset
    let i=0; while(i<Math.min(a.length,b.length)&&a[i]===b[i]) i++;
    console.log('first_diff_at='+i);
    console.log('HEAD_CTX>>>'+JSON.stringify(a.slice(Math.max(0,i-200),i+400)).slice(0,1200));
    console.log('WORK_CTX>>>'+JSON.stringify(b.slice(Math.max(0,i-200),i+400)).slice(0,1200));
  }
}
cmp('_p33head_index.html','index.html','index.html');
cmp('_p33head_app.js','app.js','app.js');
cmp('_p33head_styles.css','styles.css','styles.css');
