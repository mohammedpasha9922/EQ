const fs = require('fs');
const p = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(p, 'utf8');
const old = "cells.push((tb.rows[ri].cells[ci].textContent || '').trim());";
const n = s.split(old).length - 1;
console.log('old occurrences:', n);
