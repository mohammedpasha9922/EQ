import pathlib
root = pathlib.Path(r'd:\Programs EQ7\EQ')
pats = ['openCompanyProfileBtn', 'companyProfileModal', 'companyProfileSave',
        'companyProfileCancel', 'companyProfileClose', 'cpCompanyName', 'cpAddress',
        'cpPhone', 'cpEmail', 'cpWebsite', 'cpLogoInput', 'cpLogoBtn', 'cpLogoPreview',
        'cpSig', 'cpStamp', 'cpFooter', 'cpDraft', 'collectCompanyProfile',
        'saveCompanyProfileFromModal', 'companySetPreview', 'companyScaleImage',
        'companyFileReadScaled', 'COMPANY_PREVIEW_MAXW', 'openSigCanvas',
        'noteExportCompany', 'full-screen-note-action-bar', '#companyProfileModal']
out = []
for f in ['index.html', 'app.js', 'styles.css']:
    out.append('=== %s ===' % f)
    lines = (root / f).read_text(encoding='utf-8', errors='replace').splitlines()
    found = 0
    for i, l in enumerate(lines):
        for p in pats:
            if p in l:
                out.append('%d: [%s] %s' % (i + 1, p, l.strip()[:200]))
                found += 1
                break
    out.append('--- total hits: %d' % found)
    out.append('')
(root / '_cp_audit2.txt').write_text('\n'.join(out), encoding='utf-8')
print('AUDIT2 DONE')
