import pathlib, re
root = pathlib.Path(r'd:\Programs EQ7\EQ')
files = ['index.html', 'app.js', 'styles.css']
pats = ['openCompanyProfile', 'companyProfileModal', 'companyProfile',
        'CompanyProfile', 'company-profile', 'companyProfileBtn',
        'cpCompanyName', 'cpLogo', 'cpSignature', 'cpStamp',
        'noteExportCompany', 'Use Company Profile']
out = []
for f in files:
    t = root.joinpath(f).read_text(encoding='utf-8', errors='replace')
    out.append('='*20 + ' ' + f)
    for p in pats:
        hits = [(m.start(), t[max(0,m.start()-60):m.start()+60].replace('\n','\\n')) for m in re.finditer(re.escape(p), t)]
        out.append(f'  {p}: {len(hits)}')
        for pos, ctx in hits[:25]:
            ln = t[:pos].count('\n')+1
            out.append(f'    L{ln}: ...{ctx}...')
root.joinpath('_cp_audit_now.txt').write_text('\n'.join(out), encoding='utf-8')
print('wrote audit')
