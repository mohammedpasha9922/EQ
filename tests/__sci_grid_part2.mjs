import { boot, gridAudit, check, results, page, pageErrors, sleep } from './__sci_grid_part1.mjs';
async function funcAudit(label) {
  const tap = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (!b) throw new Error('missing ' + s); b.click(); return document.querySelector('#primaryDisplay').textContent; }, sel);
  const eq = () => tap('.keypad-btn.equals');
  const clear = () => tap('.control-btn[data-action="clear"]');
  const num = (v) => tap('.keypad-btn.number[data-value="' + v + '"]');
  const sci = (v) => page.evaluate((x) => document.querySelector('.scientific-btn[data-scientific="' + x + '"]').click(), v);
  const read = () => page.evaluate(() => document.querySelector('#primaryDisplay').textContent);
  await clear(); await num('2'); await page.evaluate(() => document.querySelector('.keypad-btn.operator[data-value="+"]').click()); await num('3'); await eq();
  let d = await read();
  check(label + ' basic 2+3=5 unchanged', d === '5', 'display=' + d);
  await clear(); await num('9');
  await page.evaluate(() => document.querySelector('.scientific-btn[data-scientific="sqrt("]').click());
  await eq(); d = await read();
  check(label + ' sqrt works', d === '3', 'display=' + d);
  await clear(); await sci('sin'); await num('3'); await num('0'); await sci(')'); await eq(); d = await read();
  check(label + ' sin(30)=0.5 works', d === '0.5', 'display=' + d);
  await clear(); await sci('pi'); await eq(); d = await read();
  check(label + ' pi works', /3\.14/.test(d), 'display=' + d);
  await page.evaluate(() => document.querySelector('#scientificToggle').click());
  await sleep(300);
  const closed = await page.evaluate(() => !document.querySelector('#scientificPanel').classList.contains('open'));
  check(label + ' toggle closes panel', closed);
}
export { funcAudit };
