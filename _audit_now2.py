import pathlib, re
root = pathlib.Path(r'd:\Programs EQ7\EQ')
pats = ['openCompanyProfile','companyProfileModal','companyProfile','CompanyProfile','COMPANY_PROFILE','cpCompanyName','cpLogo','cpSig','cpStamp','cpFooter','noteExportCompany']
out=[]
for fn in ['index.html','app.js','styles.css']:
    t=(root/fn).read_text(encoding='utf-8',errors='replace')
    out.append(f'===== {fn} ({len(t)} chars)')
    for i,ln in enumerate(t.splitlines(),1):
        for p in pats:
            if p in ln:
                out.append(f'{i}: [{p}] {ln.strip()[:220]}')
                break
(root/'_audit_now2.txt').write_text('\n'.join(out),encoding='utf-8')
print('wrote', len(out))
