// D: PART 24 CSS in styles.css (anchor found by prefix, EOL-agnostic)
const fs = require('fs');
const C = 'd:/Programs EQ7/EQ/styles.css';
let css = fs.readFileSync(C, 'utf8');
const eol = css.includes('\r\n') ? '\r\n' : '\n';
if (css.split('.smart-pdf-mkdot').length - 1 > 0) { console.log('CSS already applied, skip'); process.exit(0); }
const lines = [];
lines.push('/* PART 24 - Mark menu (Highlight/Underline/Draw/Comment) + mark rendering (PDF editor only) */');
lines.push('.smart-pdf-mark-wrap { position: relative; }');
lines.push('.smart-pdf-mark-menu { position: absolute; top: calc(100% + 6px); inset-inline-start: 0; background: #fff; border: 1px solid var(--border, #d7dee8); border-radius: 10px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.16); padding: 4px; display: flex; flex-direction: column; min-width: 150px; z-index: 60; }');
lines.push('.smart-pdf-mark-menu[hidden] { display: none; }');
lines.push('.smart-pdf-mark-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 0; background: transparent; border-radius: 8px; font: inherit; cursor: pointer; text-align: start; }');
lines.push('.smart-pdf-mark-item:hover, .smart-pdf-mark-item:focus-visible { background: var(--surface-subtle, #eef2f7); outline: none; }');
lines.push('.smart-pdf-page.smart-pdf-mark-draw { cursor: crosshair; touch-action: none; }');
lines.push('.smart-pdf-page.smart-pdf-mark-draw .smart-pdf-overlay-layer, .smart-pdf-page.smart-pdf-mark-draw .smart-pdf-text { pointer-events: none; }');
lines.push('.smart-pdf-mark-draw-hint { position: absolute; top: 8px; inset-inline-start: 8px; display: flex; align-items: center; gap: 6px; background: #1d4ed8; color: #fff; font-size: 12px; padding: 4px 6px 4px 10px; border-radius: 999px; z-index: 50; }');
lines.push('.smart-pdf-mark-draw-hint .smart-pdf-tbtn { background: #ffffff; color: #1d4ed8; }');
lines.push('.smart-pdf-ov-mark-highlight { background: transparent !important; border: 0 !important; padding: 0 !important; box-shadow: none !important; }');
lines.push('.smart-pdf-mkfill { display: block; width: 100%; height: 100%; opacity: 0.5; border-radius: 2px; }');
lines.push('.smart-pdf-ov-mark-underline { background: transparent !important; border: 0 !important; padding: 0 !important; min-height: 6px; box-shadow: none !important; }');
lines.push('.smart-pdf-mkline { display: block; width: 100%; height: 2px; }');
lines.push('.smart-pdf-ov-mark-underline .smart-pdf-mkline { position: absolute; left: 0; right: 0; bottom: 0; }');
lines.push('.smart-pdf-ov-mark-draw { background: transparent !important; border: 0 !important; padding: 0 !important; box-shadow: none !important; }');
lines.push('.smart-pdf-ov-mark-comment { background: transparent !important; border: 0 !important; padding: 0 !important; width: 30px !important; min-width: 30px; min-height: 30px; box-shadow: none !important; }');
lines.push('.smart-pdf-mkdot { width: 26px; height: 26px; border-radius: 50% 50% 50% 4px; border: 1px solid #b45309; background: #f59e0b; color: #fff; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }');
lines.push('.smart-pdf-mkdot:focus-visible { outline: 2px solid rgba(37, 99, 235, 0.75); outline-offset: 1px; }');
lines.push('.smart-pdf-mkpop { position: fixed; z-index: 80; background: #fff; border: 1px solid var(--border, #d7dee8); border-radius: 10px; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.18); padding: 10px; width: min(280px, 86vw); }');
lines.push('.smart-pdf-mkpop-label { display: block; font-size: 12px; margin-bottom: 4px; color: var(--text-muted, #475569); }');
lines.push('.smart-pdf-mkpop textarea { width: 100%; min-height: 64px; font: inherit; border: 1px solid var(--border, #d7dee8); border-radius: 6px; padding: 6px; box-sizing: border-box; resize: vertical; }');
lines.push('.smart-pdf-mkpop-row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }');
const anchor = '.smart-pdf-tsep';
const i = css.indexOf(anchor);
if (i < 0) { console.error('ABORT: css anchor'); process.exit(1); }
const j = css.indexOf(eol, i) + eol.length;
css = css.slice(0, j) + lines.join(eol) + eol + css.slice(j);
fs.writeFileSync(C, css);
console.log('styles.css: PART 24 CSS inserted');
