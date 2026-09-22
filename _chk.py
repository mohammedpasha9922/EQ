import re

out = []

# 1) duplicate comment check in app.js
t = open("app.js", encoding="utf-8", errors="replace").read()
out.append("dup-count seeded-comment: %d" % t.count("Tracks whether the Export dialog has been seeded"))

# 2) any 'ompany' occurrences in styles.css
ls = open("styles.css", encoding="utf-8", errors="replace").read().split("\n")
out.append("--- styles.css company hits: %d" % len([l for l in ls if "ompany" in l]))
for i, l in enumerate(ls, 1):
    if "ompany" in l:
        out.append("%d: %s" % (i, l.strip()[:150]))

# 3) any 'ompany' occurrences in index.html
ls = open("index.html", encoding="utf-8", errors="replace").read().split("\n")
out.append("--- index.html company hits")
for i, l in enumerate(ls, 1):
    if "ompany" in l:
        out.append("%d: %s" % (i, l.strip()[:150]))

# 4) any 'ompany' in app.js
ls = open("app.js", encoding="utf-8", errors="replace").read().split("\n")
out.append("--- app.js company hits")
for i, l in enumerate(ls, 1):
    if "ompany" in l:
        out.append("%d: %s" % (i, l.strip()[:170]))

# 5) list project files worth checking for company refs
open("_chk.txt", "w", encoding="utf-8").write("\n".join(out))
print("written")