# READ-ONLY. Concrete element-id evidence after restore.
import os, re
W = r"D:\Programs EQ7\EQ"
html = open(os.path.join(W, "index.html"), "rb").read().decode("utf-8", "replace")
js = open(os.path.join(W, "app.js"), "rb").read().decode("utf-8", "replace")
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))

p("=" * 100)
p("CONCRETE EVIDENCE — Smart Documents id(s), PDF Reports toolbar, Smart Documents texts")
p("=" * 100)

ids = re.findall(r'id="([^"]+)"', html)
p("total ids in index.html: %d" % len(ids))
for label, pat in (("Smart Documents", r"^smart"), ("PDF Reports / pdfV1", r"^pdfV1"),
                   ("Notes", r"^notes"), ("Ad Bar", r"^(ad|adbar)"), ("Currency", r"^curren")):
    sel = [i for i in ids if re.search(pat, i, re.I)]
    p("%-26s %d : %s" % (label, len(sel), sel[:24]))

p("")
p("--- PDF Reports toolbar buttons (exact HTML) ---")
m = re.search(r'<div[^>]*id="pdfV1Tools".*?</div>', html, re.S)
p(m.group(0)[:1400] if m else "pdfV1Tools not found")

p("")
p("--- Smart Documents toolbar (exact HTML) ---")
m2 = re.search(r'<div[^>]*id="smartPdfToolbar".*?</div>\s*</div>', html, re.S)
p(m2.group(0)[:900] if m2 else "smartPdfToolbar not found")

p("")
p("--- Smart Documents Arabic/English UI text samples (proving no '???') ---")
for kw in ("لوحة", "مستند", "الملف", "Doc", "Smart Documents"):
    for mt in re.finditer(re.escape(kw), html):
        s = html[max(0, mt.start() - 70):mt.start() + 70].replace("\n", " ")
        p("   %-14s ... %s ..." % (kw, s.strip()[:150]))
        break

p("")
p("--- Arabic text sample from app.js (proving encoding intact) ---")
cnt = 0
for ln in js.splitlines():
    if any("\u0600" <= c <= "\u06ff" for c in ln) and cnt < 6:
        p("   %s" % ln.strip()[:170]); cnt += 1

open(os.path.join(W, "_EVIDENCE_REPORT.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _EVIDENCE_REPORT.txt lines=%d" % len(OUT))
