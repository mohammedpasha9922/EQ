const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const i = s.indexOf("} else if (o.type === 'table') {");
console.log('idx', i);
// find end of the branch: the '} else if (o.type' after it that is the image branch
const tail = s.indexOf("} else if (o.type === 'image'", i);
console.log('tail', tail);
const seg = s.slice(i, tail);
console.log('len', seg.length);
console.log(JSON.stringify(seg));