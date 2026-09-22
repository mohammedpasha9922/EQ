# READ-ONLY candidate verification. Writes _R15_report.txt only.
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R15_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def show(sha, path):
    r = subprocess.run(["git", "show", "%s:%s" % (sha, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

CAND = [
    ("95b5725", "xnrem run2  15:32:31"),
    ("bfe7fbc", "8vhp5 run1  ~15:34"),
    ("218a48f", "8vhp5 run2  ~16:14"),
    ("259d1e1", "8vhp5 run3  16:20:33  <-- last clean"),
    ("b3378c0", "8vhp5 run4  16:32:23  (index corrupted)"),
    ("ad01dcb", "8vhp5 run5  16:37:53  (index corrupted)"),
    ("d192e88", "8vhp5 run6  16:56:17  (rolled back)"),
    ("5e2e67d", "8vhp5 run8  17:50:54  (rolled back)"),
    ("HEAD",    "git HEAD 12ef7d5"),
    ("LIVE",    "working tree right now"),
]
TOKS = ["pdfV1DelBtn", "id=\"pdfV1Tools\"", "smartPdf", "smart-pdf", "SmartDoc", "smartDoc",
        "adBar", "adbar", "pdfv1", "blank-doc", "notesPanel", "calcPanel", "signature"]

def stat_get(getter):
    res = {}
    for f in ("index.html", "app.js", "styles.css"):
        b = getter(f)
        if b is None:
            res[f] = None
            continue
        t = b.decode("utf-8", "replace")
        res[f] = {
            "bytes": len(b),
            "U+FFFD": t.count("\ufffd"),
            "arabic": sum(1 for c in t if "\u0600" <= c <= "\u06ff"),
            "sha12": hashlib.sha256(b).hexdigest()[:12],
            "tok": {k: t.count(k) for k in TOKS},
        }
    return res

p("=" * 130)
p("CANDIDATE SNAPSHOTS — INTEGRITY CHECK (U+FFFD = mojibake '???', arabic = Arabic chars)")
p("=" * 130)
for sha, label in CAND:
    if sha == "LIVE":
        st = stat_get(lambda f: open(os.path.join(CWD, f), "rb").read() if os.path.isfile(os.path.join(CWD, f)) else None)
    else:
        st = stat_get(lambda f, s=sha: show(s, f))
    p("")
    p("### %-10s %s" % (sha, label))
    for f in ("index.html", "app.js", "styles.css"):
        d = st[f]
        if d is None:
            p("    %-11s MISSING" % f)
        else:
            p("    %-11s bytes=%-9d U+FFFD=%-4d arabic=%-6d sha=%s" % (f, d["bytes"], d["U+FFFD"], d["arabic"], d["sha12"]))
            p("                %s" % " ".join("%s=%d" % (k, v) for k, v in d["tok"].items()))

p("")
p("=" * 130)
p("WHAT THE LIVE index.html ACTUALLY CONTAINS (real element ids, sample)")
p("=" * 130)
live = open(os.path.join(CWD, "index.html"), "rb").read().decode("utf-8", "replace")
import re
ids = re.findall(r'id="([A-Za-z0-9_\-]+)"', live)
p("total id= attributes: %d" % len(ids))
p("ids: %s" % ", ".join(ids))
p("")
p("contains literal '???' : %d occurrences" % live.count("???"))
p("contains literal '??'  : %d occurrences" % live.count("??"))
p("contains 'Smart Documents': %d" % live.count("Smart Documents"))
p("contains 'Smart PDF': %d" % live.count("Smart PDF"))
p("contains 'pdfV1': %d" % live.count("pdfV1"))
p("contains 'adbar'/'adBar': %d / %d" % (live.count("adbar"), live.count("adBar")))

app = open(os.path.join(CWD, "app.js"), "rb").read().decode("utf-8", "replace")
p("")
p("app.js contains 'Smart Documents': %d | 'pdfV1': %d | 'adBar': %d | '???' : %d" %
  (app.count("Smart Documents"), app.count("pdfV1"), app.count("adBar"), app.count("???")))
print("WROTE _R15_report.txt lines=%d" % len(OUT))
