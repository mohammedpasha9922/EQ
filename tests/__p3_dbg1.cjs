// probe: git history + what got deleted in app.js/styles.css vs HEAD
const { execSync } = require('child_process');
const fs = require('fs');
const R = 'd:/Programs EQ7/EQ';
const run = (cmd) => { try { return execSync(cmd, { cwd: R, maxBuffer: 256*1024*1024 }).toString(); } catch (e) { return 'ERR:' + (((e.stdout||'').toString()) + (e.message||'')); } };
const out = [];
out.push('### LOG ###');
out.push(run('git log --oneline -12'));
out.push('### BRANCH ###');
out.push(run('git branch --show-current'));
out.push('### app.js deleted sample (first 60 removed lines, U0) ###');
const d = run('git diff -U0 --ignore-cr-at-eol -- app.js').split('\n');
out.push('diffTotalLines=' + d.length);
out.push(d.filter((l)=>/^-/.test(l)&&!/^---/.test(l)).slice(0,60).join('\n'));
out.push('### app.js added sample (first 60 added lines) ###');
out.push(d.filter((l)=>/^\+/.test(l)&&!/^\+\+\+/.test(l)).slice(0,60).join('\n'));
fs.writeFileSync(R + '/tests/__p3_whatdel.txt', out.join('\n').slice(0, 12000));



