import re

out = []
h = open("index.html", encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")
out.append("=== index.html 565-600")
for i in range(565, 601):
    out.append("%d: %s" % (i, h[i - 1][:160]))
out.append("=== index.html 218-232")
for i in range(218, 233):
    out.append("%d: %s" % (i, h[i - 1][:160]))
# is languageSelect inside a <template>?
joined = "\n".join(h)
tmpl = [m.start() for m in re.finditer(r"<template", joined)]
out.append("template opens: %d" % len(tmpl))
idx = joined.find('id="languageSelect"')
out.append("languageSelect offset %d ; preceding <template count %d ; preceding </template> count %d" % (
    idx, joined[:idx].count("<template"), joined[:idx].count("</template>")))
idx2 = joined.find('id="topBarLanguageSelect"')
out.append("topBarLanguageSelect offset %d ; preceding <template count %d ; </template> count %d" % (
    idx2, joined[:idx2].count("<template"), joined[:idx2].count("</template>")))

a = open("app.js", encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")
out.append("=== app.js language wiring")
for i, l in enumerate(a, 1):
    if re.search(r"topBarLanguageSelect|languageSelect|function applyLanguage|function setLanguage|function changeLanguage|state\.locale\s*=", l):
        out.append("%d: %s" % (i, l.strip()[:170]))
open("_ctx1.txt", "w", encoding="utf-8").write("\n".join(out))
print("ok")