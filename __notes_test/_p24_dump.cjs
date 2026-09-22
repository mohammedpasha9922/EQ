const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
fs.writeFileSync('d:/Programs EQ7/EQ/__notes_test/_p24_blockfull.txt', s.slice(923500, 937500));
console.log('dumped');
