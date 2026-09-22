import pathlib, re
root = pathlib.Path(r'd:\Programs EQ7\EQ')
print('--- top-level temp/audit files ---')
for p in sorted(root.glob('_*.txt')) + sorted(root.glob('_*.py')) + sorted(root.glob('_*.mjs')):
    print(p.name)
print('--- tests dir ---')
for p in sorted((root/'tests').glob('*')):
    print(p.name)
print('--- CP refs in main sources ---')
for name in ['index.html','app.js','styles.css']:
    t = (root/name).read_text(encoding='utf-8', errors='replace')
    hits = {}
    for pat in ['openCompanyProfile','companyProfileModal','companyProfileSave','companyProfileCancel','companyProfileClose','companySetPreview','collectCompanyProfile','saveCompanyProfileFromModal','COMPANY_PREVIEW_MAXW','company-profile','cpCompanyName','cpSigCanvas','cpStampInput','cpLogoInput','cpLogoPreview','cpFooter']:
        c = len(re.findall(pat, t))
        if c: hits[pat]=c
    print(name, hits if hits else 'CLEAN')
print('--- kept shared refs ---')
for name in ['index.html','app.js']:
    t = (root/name).read_text(encoding='utf-8', errors='replace')
    for pat in ['noteExportCompany','loadCompanyProfile','saveCompanyProfile(','COMPANY_PROFILE_KEY']:
        print(name, pat, len(re.findall(re.escape(pat), t)))
