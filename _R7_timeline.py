# READ-ONLY timeline of TODAY's Cline checkpoint snapshots (efficient for-each-ref).
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))

def git(args):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True)
    return r.stdout.decode("utf-8", "replace")

def show(sha, path):
    r = subprocess.run(["git", "show", "%s:%s" % (sha, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout.decode("utf-8", "replace")

TOKS = ["pdfV1DelBtn", "pdfV1Tools", "smartPdf", "smart-pdf", "Smart Documents",
        "adBar", "notesPanel", "calcPanel", "numberToWords", "currency", "signature", "???",
        "smartDocs", "pdfV1P2El"]
def summ(text):
    if text is None:
        return "MISSING"
    return "bytes=%-7d U+FFFD=%-3d arabic=%-5d %s | %s" % (
        len(text.encode("utf-8", "replace")), text.count("\ufffd"),
        sum(1 for c in text if "\u0600" <= c <= "\u06ff"),
        hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()[:10],
        " ".join("%s=%d" % (t, text.count(t)) for t in TOKS))

rows = []
for line in git(["for-each-ref", "--format=%(objectname)%09%(committerdate:iso8601)%09%(refname)",
                 "refs/cline/checkpoints"]).splitlines():
    parts = line.split("\t")
    if len(parts) < 3:
        continue
    sha, date, ref = parts[0], parts[1], parts[2]
    rows.append((date, ref, sha))
rows.sort()
today = [r for r in rows if r[0].startswith("2026-09-22")]

p("total checkpoint refs=%d ; today=%d" % (len(rows), len(today)))
p("")
p("=" * 130)
p("TODAY 2026-09-22 CHECKPOINT SNAPSHOTS (chronological)")
p("=" * 130)
for date, ref, sha in today:
    p("")
    p("%s  %s  %s" % (date, sha[:9], ref.replace("refs/cline/checkpoints/", "")))
    p("   index.html : %s" % summ(show(sha, "index.html")))
    p("   app.js     : %s" % summ(show(sha, "app.js")))
    p("   styles.css : %s" % summ(show(sha, "styles.css")))

p("")
p("=" * 130)
p("LIVE NOW")
p("=" * 130)
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    p("%-11s %s" % (f, summ(open(fp, "rb").read().decode("utf-8", "replace")) if os.path.isfile(fp) else "MISSING"))

open(os.path.join(CWD, "_R7_timeline.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _R7_timeline.txt lines=%d" % len(OUT))
