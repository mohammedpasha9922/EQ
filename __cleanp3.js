const fs = require('fs');
const f = process.argv[2] || '__probe3.log';
let s = fs.readFileSync(f, 'utf8').replace(/\u0000/g, '');
fs.writeFileSync(f.replace('.log', '_clean.log'), s);
console.log(s.split('\n').filter(l => /^(after|selected|\[pageerror\])/.test(l)).join('\n'));
