// ============================================ LOCALIZATION INVARIANCE (jitter)
const geomByLang = {};
const arRuleHits = await page.evaluate(() => {
  const hits = [];
  for (const s of Array.from(document.styleSheets)) {
    let rules; try { rules = s.cssRules; } catch (e) { continue; }
    for (const r of rules || []) {
      if (r.selectorText && /data-language=['"]ar['"][^,{]*full-screen-note-header/i.test(r.selectorText)) {
        hits.push(r.cssText.replace(/\s+/g, ' ').slice(0, 160));
      }
    }
  }
  return hits;
});
check('Arabic header row-reverse rule is the PRE-EXISTING styles.css rule (no Company Profile reference)',
  arRuleHits.length === 1 && /row-reverse/.test(arRuleHits[0]) && !/company/i.test(arRuleHits[0]),
  JSON.stringify(arRuleHits));

for (const w of [1280, 390]) {
  await page.setViewport({ width: w, height: 900 });
  await sleep(300);
  for (const locale of LOCALES) {
    await setLang(locale);
    await sleep(350);
    let m = await measureHeader();
    if (!m.modalShown) { await openNotesEditor(); m = await measureHeader(); }
    geomByLang[`${locale}@${w}`] = m;
  }
  const en = geomByLang[`en@${w}`], ar = geomByLang[`ar@${w}`], ku = geomByLang[`ku@${w}`];
  const barKey = (m) => JSON.stringify({
    count: m.barButtonCount, ids: m.ids, widths: m.rects.map((r) => r.w),
    barW: m.bar ? m.bar.w : -1, gap: m.bar ? m.bar.gap : null, hit: m.hitTest
  });
  check(`@${w} — action bar geometry is IDENTICAL in EN / AR / KU (no jitter on language change)`,
    barKey(en) === barKey(ar) && barKey(en) === barKey(ku),
    `en=${barKey(en)} | ar=${barKey(ar)} | ku=${barKey(ku)}`);
  check(`@${w} — header geometry identical for English LTR and Kurdish RTL`,
    Math.abs(en.headerH - ku.headerH) <= 1.5 && en.headerFlexDir === ku.headerFlexDir,
    `en=${en.headerH}/${en.headerFlexDir} ku=${ku.headerH}/${ku.headerFlexDir}`);
  summary[`jitter@${w}`] = {
    headerH: { en: en.headerH, ar: ar.headerH, ku: ku.headerH },
    headerFlexDir: { en: en.headerFlexDir, ar: ar.headerFlexDir, ku: ku.headerFlexDir },
    barW: { en: en.bar.w, ar: ar.bar.w, ku: ku.bar.w },
    visualOrder: {
      en: [...en.rects].sort((a, b) => a.left - b.left).map((r) => r.id),
      ar: [...ar.rects].sort((a, b) => a.left - b.left).map((r) => r.id),
      ku: [...ku.rects].sort((a, b) => a.left - b.left).map((r) => r.id)
    },
    note: 'AR keeps its PRE-EXISTING AR-only row-reverse header rule (styles.css, present in HEAD); EN and KU are column.'
  };
}
