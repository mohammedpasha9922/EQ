# READ-ONLY identification: what are the live files, and where do identical copies exist?
import os, hashlib, subprocess

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R15_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def sha256(b):
    return hashlib.sha256(b).hexdigest()

TOK = ["pdfV1DelBtn", "pdfV1Tools", "pdfV1P2El", "smartPdfWire", "smartPdfToolbar",
       "smartPdfEditBtn", "Smart Documents", "smart-documents", "adBar", "adbar",
       "calcPanel", "notesPanel", "numberToWords", "currency", "signature",
       "responsive", "paintPager", "pdfV1P2Del"]
def profile(b):
    t = b.decode("utf-8", "replace")
    return {
        "bytes": len(b),
        "U+FFFD": t.count("\ufffd"),
        "arabic": sum(1 for c in t if "\u0600" <= c <= "\u06ff"),
        "BOM": b[:3] == b"\xef\xbb\xbf",
        "sha256": sha256(b)[:16],
        **{k: t.count(k) for k in TOK},
    }

live = {}
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    live[f] = open(fp, "rb").read()

p("=" * 118)
p("1. LIVE FILES (on disk right now)")
p("=" * 118)
for f, b in live.items():
    p("   %-11s %s" % (f, profile(b)))

p("")
p("=" * 118)
p("2. GIT OBJECTS: HEAD vs best candidate commit 259d1e1 (2026-09-22 16:20:33)")
p("=" * 118)
def git_show(rev, path):
    r = subprocess.run(["git", "show", "%s:%s" % (rev, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

for rev, label in (("HEAD", "HEAD (12ef7d5)"), ("259d1e1", "CANDIDATE run3"), ("ad01dcb", "corrupted run5"), ("d192e88", "rollback run6")):
    p("")
    p("   --- %s ---" % label)
    for f in ("index.html", "app.js", "styles.css"):
        b = git_show(rev, f)
        p("   %-11s %s" % (f, profile(b) if b is not None else "MISSING"))

p("")
p("=" * 118)
p("3. WHERE ELSE DO COPIES OF THE LIVE FILES EXIST? (search for identical sha256)")
p("=" * 118)
live_sigs = {sha256(b): f for f, b in live.items()}
SKIP = {".git", ".venv", "node_modules", "__pycache__"}
roots = [CWD]
import glob
roots += sorted(glob.glob(r"C:\EQ_RECOVERY_*"))
hits = {f: [] for f in live}
for root in roots:
    if not os.path.isdir(root):
        continue
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for fn in files:
            if fn not in ("index.html", "app.js", "styles.css"):
                continue
            fp = os.path.join(dirpath, fn)
            try:
                b = open(fp, "rb").read()
            except Exception:
                continue
            sig = sha256(b)
            if sig in live_sigs:
                hits[live_sigs[sig]].append(fp)

for f in live:
    p("")
    p("   live %s  (%d bytes, sha %s)  identical copies found: %d" % (f, len(live[f]), sha256(live[f])[:16], len(hits[f])))
    for path in sorted(set(hits[f]))[:30]:
        p("      %s" % path)

p("")
p("=" * 118)
p("4. ALL LOCAL BACKUP / SNAPSHOT DIRS IN THE PROJECT")
p("=" * 118)
for name in sorted(os.listdir(CWD)):
    fp = os.path.join(CWD, name)
    if os.path.isdir(fp) and (name.startswith("_") or "__" in name) and name not in SKIP:
        idx = os.path.join(fp, "index.html")
        app = os.path.join(fp, "app.js")
        p("   %-28s index=%-9s app=%-9s" % (
            name,
            os.path.getsize(idx) if os.path.isfile(idx) else "-",
            os.path.getsize(app) if os.path.isfile(app) else "-"))
print("WROTE _R15_report.txt lines=%d" % len(OUT))
