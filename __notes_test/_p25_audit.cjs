const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
function show(at, len, label) { console.log('=== ' + label + ' @' + at + ' ==='); console.log(s.slice(at, at + len)); }
// page store init + parse
show(365474 - 200, 700, 'smartImportParsed first');
show(373300, 1100, 'getDocument / pages=[] init');
show(368100, 400, 'smartImportParsed reset');
// current page handling
show(401300, 700, 'smartImportCurrentPage use 1');
show(424300, 700, 'smartImportCurrentPage use 2');
// export pipeline
show(447900, 1500, 'overlaysByPage in export');
show(460800, 900, 'editedBlob');
