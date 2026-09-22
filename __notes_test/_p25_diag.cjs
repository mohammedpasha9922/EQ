const fs = require('fs');
const app = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
let i = -1; const at = [];
while ((i = app.indexOf('PART 25', i + 1)) > -1 && at.length < 20) at.push(i);
console.log('PART25 at', at.join(','));
at.forEach((p) => console.log(p, JSON.stringify(app.slice(p - 30, p + 60))));



