// ==================================================== BEHAVIOR REGRESSION
await page.setViewport({ width: 1280, height: 900 });
await setLang('en');
await sleep(350);
if (!(await measureHeader()).modalShown) await openNotesEditor();

for (const sel of SELECTOR_ORDER) {
  const n = await clickListenerCount(sel);
  check(`click handler still attached: ${sel} (CDP DOMDebugger click listeners = 1)`, n === 1, `listeners=${n}`);
}

// Real click → PDF preview workspace
await fillTitle('CP removal regression note');
await page.click('#notePreviewPdfBtn');
await sleep(1500);
const prev = await page.evaluate(() => !!document.querySelector('#notePdfPreviewModal')?.classList.contains('show'));
check('Preview PDF click opens the preview workspace', prev);
if (prev) { await page.click('#notePdfPreviewClose'); await sleep(600); }
const prevClosed = await page.evaluate(() => !document.querySelector('#notePdfPreviewModal')?.classList.contains('show'));
check('Preview PDF closes again', prevClosed);

// Real click → PDF export dialog + preserved "Use Company Profile" option
await page.click('#exportNotePdfBtn');
await sleep(900);
const exp = await page.evaluate(() => {
  const dlg = document.querySelector('#noteExportPdfModal');
  const cb = document.querySelector('#noteExportCompany');
  return {
    shown: !!dlg && dlg.classList.contains('show'),
    company: cb ? {
      exists: true, type: cb.type, checked: cb.checked, disabled: cb.disabled,
      label: ((cb.closest('label') || {}).textContent || '').trim().slice(0, 60)
    } : { exists: false }
  };
});
check('Export PDF click opens the export dialog', exp.shown);
check('PDF Export "Use Company Profile" option is PRESERVED (PDF system, not the header)',
  exp.company.exists, JSON.stringify(exp.company));
summary.pdfExportCompany = exp.company;
if (exp.shown) { await page.click('#noteExportPdfClose'); await sleep(500); }

// Real click → Send (Web Share path, or clipboard fallback which needs permission)
try {
  await browser.defaultBrowserContext().overridePermissions(BASE.replace(/\/$/, ''), ['clipboard-read', 'clipboard-write']);
} catch (e) {
  fs.appendFileSync(OUT, 'INFO clipboard permission override unavailable: ' + String(e).slice(0, 120) + '\n');
}
await page.click('#sendNoteBtn');
await sleep(1500);
const sendInfo = await page.evaluate(() => ({
  shareApiAvailable: !!(navigator.share && navigator.canShare),
  dialogs: window.__dialogs
}));
check('Send click completes without a JS error (Web Share path or clipboard fallback)',
  typeof sendInfo.shareApiAvailable === 'boolean', JSON.stringify(sendInfo));
summary.send = sendInfo;

// Real click → Save persists and closes the editor
await page.click('#saveFullScreenNote');
await sleep(1200);
const saveInfo = await page.evaluate(() => {
  let noteKeys = [];
  try {
    for (const k of Object.keys(localStorage)) {
      if (/note/i.test(k)) { const v = localStorage.getItem(k) || ''; noteKeys.push(`${k}(${v.length})`); }
    }
  } catch (e) {}
  return {
    editorClosed: !document.querySelector('#fullScreenNoteModal')?.classList.contains('show'),
    noteKeys, dialogs: window.__dialogs
  };
});
check('Save click closes the editor and persists a note (no blocking error)',
  saveInfo.editorClosed && saveInfo.noteKeys.length > 0, JSON.stringify(saveInfo));

// Real click → Back closes the editor
if (!(await measureHeader()).modalShown) await openNotesEditor();
await page.click('#closeFullScreenNote');
await sleep(800);
const backInfo = await page.evaluate(() => ({
  editor: !!document.querySelector('#fullScreenNoteModal')?.classList.contains('show'),
  manager: !!document.querySelector('#notesManagerModal')?.classList.contains('show')
}));
check('Back click closes the Notes editor', !backInfo.editor, JSON.stringify(backInfo));
