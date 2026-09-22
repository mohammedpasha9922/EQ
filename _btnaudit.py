import re
files = ['index.html', 'app.js']
ids = ['saveFullScreenNote', 'sendNoteBtn', 'notePreviewPdfBtn', 'exportNotePdfBtn',
       'closeFullScreenNote', 'noteTitleInput', 'noteSavedIndicator',
       'openCompanyProfileBtn', 'companyProfileModal', 'noteExportCompany']
out = []
for f in files:
    lines = open(f, encoding='utf-8', errors='ignore').read().splitlines()
    for ident in ids:
        hits = [str(i+1) for i, l in enumerate(lines) if ident in l]
        out.append('%s %s x%d [%s]' % (f, ident, len(hits), ','.join(hits[:12])))
open('_btn_audit.txt', 'w', encoding='utf-8').write('\n'.join(out))
print('ok')
