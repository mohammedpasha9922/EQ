import re

out = []
for f in ["index.html", "styles.css", "app.js"]:
    ls = open(f, encoding="utf-8").read().replace("\r\n", "\n").split("\n")
    out.append("=== %s : lines matching /company/i" % f)
    n = 0
    for i, l in enumerate(ls, 1):
        if re.search("company", l, re.I):
            out.append("%d: %s" % (i, l.strip()[:170]))
            n += 1
    out.append("(%d hits)" % n)

ls = open("index.html", encoding="utf-8").read().replace("\r\n", "\n").split("\n")
out.append("=== index.html 895..945 (notes header)")
for i in range(894, 945):
    out.append("%d| %s" % (i + 1, ls[i][:185]))

out.append("=== index.html : elements inside the notes action bar / export dialog check row")
for i, l in enumerate(ls, 1):
    if re.search(r'note-export-check|noteExportCompany|notePreviewPdfBtn|exportNotePdfBtn|full-screen-note-action-bar|notes-send-btn|notes-save-btn|notes-back-btn|note-aa-row', l):
        out.append("%d: %s" % (i, l.strip()[:185]))

open("_scan2.txt", "w", encoding="utf-8").write("\n".join(out))
print("written")