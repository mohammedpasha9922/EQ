// B: render cases + E: i18n keys in app.js
const fs = require('fs');
const P = 'd:/Programs EQ7/EQ/app.js';
let s = fs.readFileSync(P, 'utf8');
const fail = (m) => { console.error('ABORT: ' + m); process.exit(1); };
const once = (k) => { if (s.split(k).length - 1 !== 1) fail('anchor not unique: ' + k.slice(0, 60)); };
const anchorB = "case 'table': smartPdfOverlayBox(page, o, 'table', smartPdfOverlayTableHtmlP23";
once(anchorB);
const blockB = `case 'highlight': smartPdfOverlayBox(page, o, 'mark-highlight', '<span class="smart-pdf-mkfill" style="background:' + smartPdfEscAttr(o.color || '#fde047') + '"></span>', false); break;
       case 'underline': smartPdfOverlayBox(page, o, 'mark-underline', '<span class="smart-pdf-mkline" style="background:' + smartPdfEscAttr(o.color || '#2563eb') + '"></span>', false); break;
       case 'draw': smartPdfOverlayBox(page, o, 'mark-draw', smartPdfMarkSvgHtml(o), false); break;
       case 'comment': smartPdfOverlayBox(page, o, 'mark-comment', '<button type="button" class="smart-pdf-mkdot" aria-label="' + smartPdfEscAttr(smartPdfMarkT('smartPdfMarkComment', 'Comment')) + '" title="' + smartPdfEscAttr((o.text || '').slice(0, 120)) + '"><span aria-hidden="true">💬</span></button>', false); break;
       ` + anchorB;
s = s.replace(anchorB, blockB);
if (s.split('smartPdfMarkCommentLabel').length - 1 === 0) {
  const enA = "smartPdfMarkDrawHint: 'Draw on the page',";
  if (s.split(enA).length - 1 !== 1) fail('i18n EN anchor');
  s = s.replace(enA, enA + " smartPdfMarkCommentLabel: 'Comment text', smartPdfMarkAddComment: 'Add Comment',");
  const i1 = s.indexOf("smartPdfMarkDrawHint: 'Draw on the page'");
  const i2 = s.indexOf('smartPdfMarkDrawHint:', i1 + 10);
  if (i2 < 0) fail('i18n AR anchor');
  const endQ = s.indexOf("',", i2);
  s = s.slice(0, endQ + 2) + " smartPdfMarkCommentLabel: 'نص التعليق', smartPdfMarkAddComment: 'إضافة تعليق'," + s.slice(endQ + 2);
}
fs.writeFileSync(P, s);
console.log('B/E done, len', s.length);
