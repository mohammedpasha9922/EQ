// D: PART 24 CSS in styles.css
const fs = require('fs');
const C = 'd:/Programs EQ7/EQ/styles.css';
let css = fs.readFileSync(C, 'utf8');
if (css.split('.smart-pdf-mkdot').length - 1 === 0) {
  const cssBlock = `
/* PART 24 - Mark menu (Highlight/Underline/Draw/Comment) + mark rendering (PDF editor only) */
.smart-pdf-mark-wrap { position: relative; }
.smart-pdf-mark-menu { position: absolute; top: calc(100% + 6px); inset-inline-start: 0; background: #fff; border: 1px solid var(--border, #d7dee8); border-radius: 10px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.16); padding: 4px; display: flex; flex-direction: column; min-width: 150px; z-index: 60; }
.smart-pdf-mark-menu[hidden] { display: none; }
.smart-pdf-mark-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 0; background: transparent; border-radius: 8px; font: inherit; cursor: pointer; text-align: start; }
.smart-pdf-mark-item:hover, .smart-pdf-mark-item:focus-visible { background: var(--surface-subtle, #eef2f7); outline: none; }
.smart-pdf-page.smart-pdf-mark-draw { cursor: crosshair; touch-action: none; }
.smart-pdf-page.smart-pdf-mark-draw .smart-pdf-overlay-layer, .smart-pdf-page.smart-pdf-mark-draw .smart-pdf-text { pointer-events: none; }
.smart-pdf-mark-draw-hint { position: absolute; top: 8px; inset-inline-start: 8px; display: flex; align-items: center; gap: 6px; background: #1d4ed8; color: #fff; font-size: 12px; padding: 4px 6px 4px 10px; border-radius: 999px; z-index: 50; }
.smart-pdf-mark-draw-hint .smart-pdf-tbtn { background: #ffffff; color: #1d4ed8; }
.smart-pdf-ov-mark-highlight { background: transparent !important; border: 0 !important; padding: 0 !important; box-shadow: none !important; }
.smart-pdf-mkfill { display: block; width: 100%; height: 100%; opacity: 0.5; border-radius: 2px; }
.smart-pdf-ov-mark-underline { background: transparent !important; border: 0 !important; padding: 0 !important; min-height: 6px; box-shadow: none !important; }
.smart-pdf-mkline { display: block; width: 100%; height: 2px; }
.smart-pdf-ov-mark-underline .smart-pdf-mkline { position: absolute; left: 0; right: 0; bottom: 0; }
.smart-pdf-ov-mark-draw { background: transparent !important; border: 0 !important; padding: 0 !important; box-shadow: none !important; }
.smart-pdf-ov-mark-comment { background: transparent !important; border: 0 !important; padding: 0 !important; width: 30px !important; min-width: 30px; min-height: 30px; box-shadow: none !important; }
.smart-pdf-mkdot { width: 26px; height: 26px; border-radius: 50% 50% 50% 4px; border: 1px solid #b45309; background: #f59e0b; color: #fff; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.smart-pdf-mkdot:focus-visible { outline: 2px solid rgba(37, 99, 235, 0.75); outline-offset: 1px; }
.smart-pdf-mkpop { position: fixed; z-index: 80; background: #fff; border: 1px solid var(--border, #d7dee8); border-radius: 10px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.18); padding: 10px; width: min(280px, 86vw); }
.smart-pdf-mkpop-label { display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-muted, #475569); }
.smart-pdf-mkpop textarea { width: 100%; min-height: 64px; font: inherit; border: 1px solid var(--border, #d7dee8); border-radius: 6px; padding: 6px; box-sizing: border-box; resize: vertical; }
.smart-pdf-mkpop-row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
`;
  const anchorCss = '.smart-pdf-tsep { width: 1px; height: 18px; background: var(--border, #d7dee8);}';
  if (css.split(anchorCss).length - 1 !== 1) { console.error('ABORT: css anchor'); process.exit(1); }
  css = css.replace(anchorCss, anchorCss + '\n' + cssBlock.trimEnd());
  fs.writeFileSync(C, css);
  console.log('styles.css: PART 24 CSS inserted');
} else console.log('styles.css: already has PART 24 CSS, skipped');
