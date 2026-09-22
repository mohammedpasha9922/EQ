import pathlib
root = pathlib.Path('.')
pats = ['openCompanyProfile','companyProfileModal','companyProfile','CompanyProfile','cpCompanyName','cpDraft','collectCompanyProfile','companySetPreview','companyScaleImage','companyFileReadScaled']
files = list(root.glob('*.html')) + list(root.glob('*.js')) + list(root.glob('*.css'))
files = [f for f in files if not str(f).startswith('_')]
lines_out = []
for p in pats:
    hits = []
    for f in files:
        try:
            txt = open(f, encoding='utf-8', errors='replace').read().splitlines()
        except Exception:
            continue
        for i, l in enumerate(txt, 1):
            if p in l:
                hits.append((str(f), i, l.strip()[:140]))
    lines_out.append('PAT %s -> %d' % (p, len(hits)))
    for h in hits[:15]:
        lines_out.append('   %s:%d: %s' % h)
open('_audit_now.txt', 'w', encoding='utf-8').write('\n'.join(lines_out))
print('DONE')
