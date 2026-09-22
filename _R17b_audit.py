# READ-ONLY feature audit (robust version): LIVE vs candidate checkpoint 259d1e1
import subprocess, os, traceback

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    try:
        with open(os.path.join(CWD, "_R17_report.txt"), "w", encoding="utf-8") as fh:
            fh.write("\n".join(OUT))
    except Exception:
        pass

def git_show(rev, path):
    r = subprocess.run(["git", "show", "%s:%s" % (rev, path)], cwd=CWD, capture_output=True)
    if r.returncode != 0:
        return ""
    return r.stdout.decode("utf-8", "replace")

FEATURES = {
    "Ad Bar":            ["adBar", "ad-bar", "adbarSlot"],
    "Smart Documents":   ["Smart Documents", "smart-doc", "smartPdfWire", "smartPdfToolbar"],
    "PDF Reports v1":    ["pdfV1Tools", "pdfV1DelBtn", "pdfV1P2El", "pdfv1"],
    "Signature Image":   ["signature", "sigDraw", "signatureImage"],
    "PDF Text Editing":  ["pdfV1P2", "textEdit", "paintPager"],
    "Notes":             ["notesPanel", "noteEditor", "notesData", "notes"],
    "Calculator":        ["calcPanel", "calculator", "resultScreen"],
    "Currency":          ["currency"],
    "NumberToWords":     ["numberToWords"],
    "Responsive":        ["responsive", "@media"],
    "Encoding damage":   ["\ufffd", "???"],
}

try:
    live = {f: open(os.path.join(CWD, f), "rb").read().decode("utf-8", "replace")
            for f in ("index.html", "app.js", "styles.css")}
    ck = {f: git_show("259d1e1", f) for f in ("index.html", "app.js", "styles.css")}

    p("=" * 118)
    p("FEATURE AUDIT — marker counts:  CANDIDATE 259d1e1  vs  LIVE (disk)")
    p("=" * 118)
    p("%-18s %9s %9s | %9s %9s | %7s %7s" % ("feature", "iH-ck", "iH-live", "js-ck", "js-live", "css-ck", "css-live"))
    for name, toks in FEATURES.items():
        ci = sum(ck["index.html"].count(t) for t in toks)
        li = sum(live["index.html"].count(t) for t in toks)
        ca = sum(ck["app.js"].count(t) for t in toks)
        la = sum(live["app.js"].count(t) for t in toks)
        cc = sum(ck["styles.css"].count(t) for t in toks)
        lc = sum(live["styles.css"].count(t) for t in toks)
        flag = ""
        if ci and not li:
            flag = "   <-- LOST in live"
        elif li and not ci:
            flag = "   <-- live newer"
        p("%-18s %9d %9d | %9d %9d | %7d %7d%s" % (name, ci, li, ca, la, cc, lc, flag))

    p("")
    p("Arabic text volume / encoding damage:")
    for f in ("index.html", "app.js", "styles.css"):
        a = sum(1 for c in ck[f] if "\u0600" <= c <= "\u06ff")
        b = sum(1 for c in live[f] if "\u0600" <= c <= "\u06ff")
        p("   %-11s arabic ck=%-6d live=%-6d | U+FFFD ck=%d live=%d | len ck=%d live=%d"
          % (f, a, b, ck[f].count("\ufffd"), live[f].count("\ufffd"), len(ck[f]), len(live[f])))

    t = ck["index.html"]
    i = t.find("smartPdfToolbar")
    p("")
    p("--- candidate index.html: Smart Documents PDF toolbar block ---")
    p(t[max(0, i - 500): i + 1200] if i > 0 else "NOT FOUND")
except Exception:
    p("EXCEPTION:")
    p(traceback.format_exc())
print("WROTE _R17_report.txt lines=%d" % len(OUT))
