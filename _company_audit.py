import re

out = []
pat = re.compile(r"ompany", re.I)
for f in ["index.html", "styles.css", "app.js"]:
    lines = open(f, encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")
    out.append("======== %s" % f)
    for i, l in enumerate(lines, 1):
        if pat.search(l):
            out.append("%d| %s" % (i, l.strip()[:220]))

open("_company_audit.txt", "w", encoding="utf-8").write("\n".join(out))
print("lines:", len(out))