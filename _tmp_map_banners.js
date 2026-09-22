const L = require('fs').readFileSync('app.js', 'utf8').split(/\r?\n/);
L.forEach((l, i) => {
  if (/^\/\/ ={10,}/.test(l)) {
    const t = (L[i + 1] || '').trim();
    if (t) console.log((i + 1) + ': ' + t.slice(0, 110));
  }
});
