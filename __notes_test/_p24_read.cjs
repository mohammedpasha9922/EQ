const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
function show(tag, from, len) { console.log('=== ' + tag + ' ==='); console.log(s.slice(from, from + len)); }
show('RenderOverlays', 423690, 2400);
show('OverlayBox', 418924, 2200);
show('AddItem', 426257, 1800);
show('overlaysByPage', 446800, 500);
