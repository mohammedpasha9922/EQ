# READ-ONLY feature audit: LIVE vs candidate checkpoint 259d1e1
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R17_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def git_show(rev, path):
    r = subprocess.run(["git", "show", "%s:%s" % (rev, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

FEATURES = {
    "Ad Bar":            ["adBar", "ad-bar", "adbarSlot", "adBarRoot"],
    "Smart Documents":   ["Smart Documents", "smart-doc", "smartDoc", "smartPdfWire", "smartPdfToolbar"],
    "PDF Reports (v1)":  ["pdfV1Tools", "pdfV1DelBtn", "pdfV1P2El", "pdfv1"],
    "Signature Image":   ["signature", "sigDraw", "signatureImage"],
    "PDF Text Editing":  ["pdfV1P2", "textEdit", "paintPager"],
    "Notes":             ["notesPanel", "notes-", "noteEditor", "notesData"],
    "Calculator":        ["calcPanel", "calculator", "StandardCalculator", "resultScreen"],
    "Currency":          ["currency", "currencyService"],
    "NumberToWords":     ["numberToWords", "numberToWords.js"],
    "Responsive":        ["responsive", "@media"],
    "Encoding damage":   ["\ufffd", "???"],
}

def prof(b):
    if b is None:
        return None
    t = b.decode("utf-8", "replace")
    return t

live = {f: prof(open(os.path.join(CWD, f), "rb").read()) for f in ("index.html", "app.js", "styles.css")}
ck = {f: prof(git_show("259d1e1", f)) for f in ("index.html", "app.js", "styles.css")}

p("=" * 118)
p("FEATURE AUDIT — counts of feature markers:  CANDIDATE 259d1e1  vs  LIVE (disk)")
p("=" * 118)
p("%-20s %-10s %-12s %-12s %-10s %-12s" % ("feature", "iHtml-ck", "iHtml-live", "appjs-ck", "appjs-live", "css-ck/live"))
for name, toks in FEATURES.items():
    ci = sum(ck["index.html"].count(t) for t in toks)
    li = sum(live["index.html"].count(t) for t in toks)
    ca = sum(ck["app.js"].count(t) for t in toks)
    la = sum(live["app.js"].count(t) for t in toks)
    cc = sum(ck["styles.css"].count(t) for t in toks)
    lc = sum(live["styles.css"].count(t) for t in toks)
    flag = ""
    if li and not ci:
        flag = "  <-- live newer"
    elif ci and not li:
        flag = "  <-- LOST in live"
    p("%-20s %-10d %-12d %-12d %-10d %-12d%s" % (name, ci, li, ca, la, "%d/%d" % (cc, lc), flag))

p("")
p("Arabic text volume:")
for f in ("index.html", "app.js"):
    a = sum(1 for c in ck[f] if "\u0600" <= c <= "\u06ff")
    b = sum(1 for c in live[f] if "\u0600" <= c <= "\u06ff")
    p("   %-11s candidate=%6d arabic chars   live=%6d arabic chars" % (f, a, b))
for f in ("index.html", "app.js"):
    p("   %-11s candidate U+FFFD=%d  live U+FFFD=%d" % (f, ck[f].count("\ufffd"), live[f].count("\ufffd")))

# does 259d1e1 index.html still contain the Smart Documents PDF toolbar block verbatim?
t = ck["index.html"]
i = t.find("smartPdfToolbar")
p("")
p("Smart Documents PDF toolbar block in candidate index.html (context):")
if i > 0:
    p(t[max(0, i - 400): i + 900])
else:
    p("   NOT FOUND")
print("WROTE _R17_report.txt lines=%d" % len(OUT))
