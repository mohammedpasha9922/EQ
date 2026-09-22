const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
console.log('new fn has prevRows:', s.includes('smartPdfOverlayReadTable(box, prevRows)'));
console.log('old cells.push style:', s.includes("cells.push((tb.rows[ri].cells[ci].textContent || '')"));
