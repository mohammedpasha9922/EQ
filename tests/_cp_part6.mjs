// ==================================================================== ARTIFACTS
for (const locale of LOCALES) {
  await setLang(locale);
  for (const w of VIEWPORTS) {
    await page.setViewport({ width: w, height: 900 });
    await sleep(300);
    if (!(await measureHeader()).modalShown) await openNotesEditor();
    await page.screenshot({ path: path.join(SHOTS, `notes-header-${locale}-${w}.png`) });
  }
}
const shots = fs.readdirSync(SHOTS).filter((f) => /^notes-header-/.test(f));
check('screenshots captured for every locale x viewport',
  shots.length === LOCALES.length * VIEWPORTS.length, `${shots.length} files: ${shots.join(',')}`);

// ================================================================== JS ERRORS
const realErrors = pageErrors.filter((t) =>
  /app\.js|SyntaxError|ReferenceError|TypeError|is not defined|is not a function|Cannot read|unexpected/i.test(t));
check('no JS errors from app.js and no runtime exceptions during the whole run',
  realErrors.length === 0, JSON.stringify(pageErrors.slice(0, 6)));
summary.pageErrors = pageErrors;

// ==================================================================== SUMMARY
fs.writeFileSync(path.join(ROOT, '__cp_removal_summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
fs.appendFileSync(OUT, `\nTOTAL: ${passCount} PASS / ${failCount} FAIL\n`);
console.log(`TOTAL: ${passCount} PASS / ${failCount} FAIL`);
fs.writeFileSync(path.join(ROOT, '_shots.txt'), shots.join('\n'), 'utf-8');
await browser.close();
server.close();
process.exit(failCount ? 1 : 0);
