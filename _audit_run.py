import re
pats = ['companyprofile', 'company-profile', 'company_profile']
out = []
for f in ['index.html', 'app.js', 'styles.css']:
    try:
        lines = open(f, encoding='utf-8', errors='ignore').read().splitlines()
    except Exception as e:
        out.append(f"ERROR {f}: {e}")
        continue
    for i, l in enumerate(lines, 1):
        ll = l.lower()
        if any(p in ll for p in pats):
            out.append("%s:%d:%s" % (f, i, l.strip()[:200]))
open('_audit.txt', 'w', encoding='utf-8').write("\n".join(out))
open('_audit_count.txt', 'w').write(str(len(out)))
