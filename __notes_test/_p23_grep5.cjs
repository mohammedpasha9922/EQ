const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/index.html', 'utf8');
const m = [...s.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((x) => x[1]);
console.log('css links:', m.join(', '));
const link = m.find((x) => x.indexOf('styles') > -1) || m[0];
console.log('served styles has new layer rule:', fs.readFileSync('d:/Programs EQ7/EQ/' + link.split('?')[0], 'utf8').indexOf('z-index: 40') > -1);
