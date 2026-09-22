// Even-distribution analysis from real rects: equal gaps, equal end margins and
// a bar width that exactly fits the remaining buttons (i.e. the space of the
// removed Company Profile button is fully reclaimed, no empty slot remains).
function analyse(m) {
  const rs = [...m.rects].sort((a, b) => a.left - b.left);
  const inner = [];
  for (let i = 0; i + 1 < rs.length; i++) inner.push(+(rs[i + 1].left - rs[i].right).toFixed(2));
  const parts = m.bar ? m.bar.pad.split(' ') : ['0'];
  const padX = parseFloat(parts.length >= 2 ? parts[1] : parts[0]) || 0;
  const contentW = m.bar ? +(m.bar.w - padX * 2).toFixed(2) : null;
  const gap = m.bar ? (parseFloat(m.bar.gap) || 0) : 0;
  const btnW = rs.length ? rs[0].w : 0;
  const expected = +(rs.length * btnW + (rs.length - 1) * gap).toFixed(2);
  return {
    inner,
    innerSpread: inner.length ? +(Math.max(...inner) - Math.min(...inner)).toFixed(2) : null,
    outerLeft: m.bar ? +(rs[0].left - m.bar.left - padX).toFixed(2) : null,
    outerRight: m.bar ? +(m.bar.right - padX - rs[rs.length - 1].right).toFixed(2) : null,
    overlap: rs.some((r, i) => i + 1 < rs.length && r.right > rs[i + 1].left + 0.5),
    contentW, expected,
    leftoverSpace: contentW === null ? null : +(contentW - expected).toFixed(2),
    sizeSpread: +(Math.max(...rs.map((r) => r.w)) - Math.min(...rs.map((r) => r.w))).toFixed(2)
  };
}

// ============================================================== BOOT + OPEN
check('app boots (calculator display reads 0)', await boot());
const opened = await openNotesEditor();
check('Notes manager opens via drawer -> Notes', opened.managerShown);
check('Notes editor opens (new note)', opened.editorShown, JSON.stringify(opened));

// =========================================================== RESPONSIVE MATRIX
const VIEWPORTS = [1280, 768, 430, 390, 360];
const LOCALES = ['en', 'ar', 'ku'];
const ID_LABELS = { en: 'English LTR', ar: 'Arabic RTL', ku: 'Kurdish RTL' };
const summary = {};

for (const locale of LOCALES) {
  await setLang(locale);
  for (const w of VIEWPORTS) {
    await page.setViewport({ width: w, height: 900 });
    await sleep(350);
    const tag = `${ID_LABELS[locale]} @${w}`;
    let m = await measureHeader();
    if (!m.modalShown) { await openNotesEditor(); m = await measureHeader(); }
    const a = analyse(m);
    summary[tag] = {
      dir: m.dir, bodyLang: m.bodyLang, headerDir: m.headerDir, headerH: m.headerH,
      ids: m.ids, barW: m.bar ? m.bar.w : null, gaps: a.inner, innerSpread: a.innerSpread,
      outerL: a.outerLeft, outerR: a.outerRight, leftover: a.leftoverSpace, overlap: a.overlap,
      hits: m.hitTest, docOverflow: m.docOverflow, editorOverflow: m.editorOverflow, sizeSpread: a.sizeSpread
    };
    check(`${tag} — editor shown`, m.modalShown);
    check(`${tag} — exactly 4 circular buttons in the action bar`, m.barButtonCount === 4, `ids=${m.ids.join(',')}`);
    check(`${tag} — remaining buttons are Save/Send/Preview/Export in order`,
      JSON.stringify(m.ids) === JSON.stringify(SELECTOR_ORDER.map((s) => s.slice(1))), m.ids.join(','));
    check(`${tag} — Company Profile button ABSENT`, !m.cpBtn && m.cpLabelCount === 0,
      `byId=${m.cpBtn} labelMatches=${m.cpLabelCount}`);
    check(`${tag} — Company Profile modal + form fields ABSENT`,
      !m.cpModal && m.cpFieldCount === 0 && !m.cpAnywhere,
      `modal=${m.cpModal} fields=${m.cpFieldCount} anyCp=${m.cpAnywhere}`);
    check(`${tag} — no button overlap`, !a.overlap, `gaps=${a.inner.join('|')}`);
    check(`${tag} — buttons evenly distributed (equal gap spread <= 1.5px)`,
      a.innerSpread !== null && a.innerSpread <= 1.5, `spread=${a.innerSpread} gaps=${a.inner.join('|')}`);
    check(`${tag} — equal margin at both ends of the bar`,
      Math.abs(a.outerLeft - a.outerRight) <= 1.5, `L=${a.outerLeft} R=${a.outerRight}`);
    check(`${tag} — no empty slot where the removed button used to be`,
      Math.abs(a.leftoverSpace) <= 1.5, `content=${a.contentW} expected=${a.expected} leftover=${a.leftoverSpace}`);
    check(`${tag} — every remaining button is clickable (elementFromPoint hit test)`,
      m.hitTest.every((h, i) => h === m.ids[i].slice(1)), JSON.stringify(m.hitTest));
    check(`${tag} — button size + circular style unchanged`,
      a.sizeSpread === 0 && m.rects.every((r) => r.w === r.h && parseFloat(r.radius) >= 19),
      `sizeSpread=${a.sizeSpread} radius=${m.rects[0] && m.rects[0].radius}`);
    check(`${tag} — title row + Saved indicator intact`,
      m.titleRowW > 0 && m.titleInputW > 40 && m.savedIndicatorVisible,
      `titleRow=${m.titleRowW} input=${m.titleInputW} saved=${m.savedIndicatorVisible}`);
    check(`${tag} — Notes toolbar untouched`, m.toolbarPresent && m.toolbarButtons > 0, `buttons=${m.toolbarButtons}`);
    check(`${tag} — no horizontal overflow`,
      m.docOverflow <= 0 && m.bodyOverflow <= 0 && m.editorOverflow <= 0,
      `doc=${m.docOverflow} body=${m.bodyOverflow} editor=${m.editorOverflow}`);
  }
}
