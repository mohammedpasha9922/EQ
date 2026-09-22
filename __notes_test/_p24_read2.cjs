const fs = require('fs');
const s = fs.readFileSync('d:/Programs EQ7/EQ/app.js', 'utf8');
const anchors = {
  imgCase: "} else if (o.type === 'image' && o.dataUrl) {",
  scale: 'function smartPdfOverlayScale',
  target: 'function smartPdfOverlayTarget',
  find: 'function smartPdfOverlayFind',
  del: 'function smartPdfOverlayDelete',
};
for (const k in anchors) console.log(k, s.split(anchors[k]).length - 1);
console.log('SCALE:', s.slice(s.indexOf(anchors.scale), s.indexOf(anchors.scale) + 260));
console.log('TARGET:', s.slice(s.indexOf(anchors.target), s.indexOf(anchors.target) + 520));
console.log('DRAFT:', s.slice(s.indexOf('function smartDraftSave'), s.indexOf('function smartDraftSave') + 1600));
