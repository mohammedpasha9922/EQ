import pathlib
root = pathlib.Path(r'd:\Programs EQ7\EQ')
pats = ['companyProfile', 'CompanyProfile', 'openCompanyProfile', 'company-profile', 'COMPANY_PROFILE', 'company_profile']
out = []
for f in ['index.html', 'app.js', 'styles.css']:
    out.append('=== %s ===' % f)
    lines = (root / f).read_text(encoding='utf-8', errors='replace').splitlines()
    found = 0
    for i, l in enumerate(lines):
        if any(p in l for p in pats):
            out.append('%d: %s' % (i + 1, l.strip()[:200]))
            found += 1
    out.append('--- total hits: %d' % found)
    out.append('')
(root / '_cp_audit.txt').write_text('\n'.join(out), encoding='utf-8')
print('AUDIT DONE')
