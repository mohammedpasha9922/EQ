// Opens the Notes editor the same way a user does: drawer → Notes → new note.
async function openNotesEditor() {
  await page.evaluate(() => document.querySelector('[data-action="open-notes"]')?.click());
  await sleep(600);
  const managerShown = await page.evaluate(() => !!document.querySelector('#notesManagerModal')?.classList.contains('show'));
  await page.evaluate(() => document.querySelector('#openNewNoteButton')?.click());
  await sleep(700);
  const editorShown = await page.evaluate(() => !!document.querySelector('#fullScreenNoteModal')?.classList.contains('show'));
  return { managerShown, editorShown };
}

async function fillTitle(text) {
  const input = await page.$('#noteTitleInput');
  if (!input) return false;
  await input.click({ clickCount: 3 });
  await page.keyboard.type(text);
  await sleep(200);
  return true;
}

async function measureHeader() {
  return await page.evaluate(() => {
    const modal = document.querySelector('#fullScreenNoteModal');
    const q = (s) => modal && modal.querySelector(s);
    const bar = q('.full-screen-note-action-bar');
    const header = q('.full-screen-note-header');
    const titleRow = q('.full-screen-note-title-row');
    const titleInput = q('#noteTitleInput');
    const savedInd = q('#noteSavedIndicator');
    const btns = bar ? Array.from(bar.querySelectorAll('button')) : [];
    const rects = btns.map((b) => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return {
        id: b.id, cls: String(b.className),
        aria: (b.getAttribute('aria-label') || '') + ' | ' + (b.getAttribute('title') || ''),
        svgParts: b.querySelectorAll('svg *').length,
        left: r.left, right: r.right, top: r.top, w: +r.width.toFixed(2), h: +r.height.toFixed(2),
        cx: r.left + r.width / 2, cy: r.top + r.height / 2,
        radius: cs.borderRadius, bg: cs.backgroundColor, border: cs.borderTopWidth,
        display: cs.display, visibility: cs.visibility
      };
    });
    const hitTest = rects.map((r) => {
      const el = document.elementFromPoint(r.cx, r.cy);
      if (!el) return 'none';
      const b = el.closest('button');
      return b ? (b.id || 'button') : el.tagName + '.' + String(el.className).slice(0, 24);
    });
    const cpLocalized = Array.from(modal ? modal.querySelectorAll('button') : []).filter((b) =>
      /company\s*profile|ملف\s*الشركة|پڕۆفایل|کۆمپانیا|profil\s*de|empresa|firma|profilo/i
        .test((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '') + ' ' + b.textContent));
    const cpFields = ['cpCompanyName', 'cpAddress', 'cpPhone', 'cpEmail', 'cpWebsite',
      'cpLogoInput', 'cpLogoBtn', 'cpLogoPreview', 'cpSigCanvas', 'cpStampInput',
      'cpFooter', 'companyProfileSave', 'companyProfileCancel']
      .filter((id) => !!document.getElementById(id));
    const exportCb = document.querySelector('#noteExportCompany');
    return {
      modalShown: !!modal && modal.classList.contains('show'),
      docDir: document.documentElement.dir,
      docLang: document.documentElement.lang,
      bodyLang: document.body.getAttribute('data-language'),
      headerDir: header ? getComputedStyle(header).direction : null,
      headerFlexDir: header ? getComputedStyle(header).flexDirection : null,
      headerH: header ? +header.getBoundingClientRect().height.toFixed(2) : -1,
      barButtonCount: btns.length,
      ids: btns.map((b) => b.id),
      arias: btns.map((b) => b.getAttribute('aria-label') || ''),
      rects, hitTest,
      bar: (() => {
        if (!bar) return null;
        const r = bar.getBoundingClientRect();
        const cs = getComputedStyle(bar);
        return {
          left: r.left, right: r.right, w: +r.width.toFixed(2), h: +r.height.toFixed(2),
          pad: cs.padding, gap: cs.gap, justify: cs.justifyContent, flexDir: cs.flexDirection,
          overflow: cs.overflow
        };
      })(),
      titleRowW: titleRow ? +titleRow.getBoundingClientRect().width.toFixed(2) : -1,
      titleInputW: titleInput ? +titleInput.getBoundingClientRect().width.toFixed(2) : -1,
      savedIndicatorVisible: !!savedInd && getComputedStyle(savedInd).display !== 'none',
      toolbarPresent: !!q('.note-format-toolbar'),
      toolbarButtons: (modal ? modal.querySelectorAll('.note-format-toolbar button') : []).length,
      cpBtn: !!document.querySelector('#openCompanyProfileBtn'),
      cpLabelCount: cpLocalized.length,
      cpModal: !!document.querySelector('#companyProfileModal'),
      cpFieldCount: cpFields.length,
      cpAnywhere: document.querySelectorAll('[id*="ompanyProfile"], .company-profile, .company-upload-section, .company-field').length,
      exportCompanyCb: exportCb ? {
        exists: true, checked: !!exportCb.checked, type: exportCb.type,
        label: ((exportCb.closest('label') || {}).textContent || '').trim()
      } : { exists: false },
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      editorOverflow: (() => {
        const el = q('.full-screen-note') || modal;
        return el ? el.scrollWidth - el.clientWidth : -1;
      })()
    };
  });
}
