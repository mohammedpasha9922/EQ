import re

out = []
a = open("app.js", encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")

out.append("=== showToast implementation")
for i, l in enumerate(a, 1):
    if re.search(r"function showToast", l):
        for j in range(i, i + 22):
            out.append("%d: %s" % (j, a[j - 1].strip()[:170]))
        break

out.append("=== noteSavedIndicator usage")
for i, l in enumerate(a, 1):
    if "noteSavedIndicator" in l:
        out.append("%d: %s" % (i, l.strip()[:170]))

out.append("=== noteExportCompany usage")
for i, l in enumerate(a, 1):
    if "noteExportCompany" in l:
        out.append("%d: %s" % (i, l.strip()[:170]))

h = open("index.html", encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")
out.append("=== index.html noteExportCompany / toast / noteSavedIndicator")
for i, l in enumerate(h, 1):
    if re.search(r"noteExportCompany|toast|noteSavedIndicator|noteToast", l):
        out.append("%d: %s" % (i, l.strip()[:170]))

out.append("=== closeFullScreenNote / openFullScreenNote signatures")
for i, l in enumerate(a, 1):
    if re.search(r"function (open|close)FullScreenNote|function saveCurrentOpenNote", l):
        out.append("%d: %s" % (i, l.strip()[:170]))

open("_toast.txt", "w", encoding="utf-8").write("\n".join(out))
print("ok")