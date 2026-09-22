# READ-ONLY: inspect Cline checkpoint commits via `git show` (no working-tree writes).
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))

def git(args):
    r = subprocess.run("git " + args, cwd=CWD, shell=True, capture_output=True)
    return r.stdout.decode("utf-8", "replace")

def blob(rev, path):
    r = subprocess.run("git show %s:%s" % (rev, path), cwd=CWD, shell=True, capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout.decode("utf-8", "replace")

def markers(text):
    if text is None:
        return "MISSING"
    d = {
        "bytes": len(text.encode("utf-8", "replace")),
        "chars": len(text),
        "repl_chars": text.count("\ufffd"),
        "arabic_chars": sum(1 for c in text if "\u0600" <= c <= "\u06ff"),
        "qmark3": text.count("???"),
    }
    feat = ["pdfV1DelBtn", "smartPdfToolbar", "smartPdfEditBtn", "pdfV1Tools",
            "numberToWords", "adBar", "adbar", "notesPanel", "notes", "calcPanel",
            "currency", "signature", "sigDraw", "pdfv1", "smart-pdf", "smartPdf"]
    d["feat"] = {k: text.count(k) for k in feat}
    d["sha16"] = hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()[:16]
    return d

# 1. enumerate checkpoint commits
p("=" * 90)
p("CLINE CHECKPOINT COMMITS (newest first)")
p("=" * 90)
log = git("--no-pager log --all --format='%H|%ci|%s' -40")
ck = []
for line in log.splitlines():
    line = line.strip().strip("'")
    if not line or "|" not in line:
        continue
    h, ci, s = line.split("|", 2)
    p("%s  %s  %s" % (h[:9], ci, s))
    if "cline checkpoint" in s:
        ck.append((h, ci, s.split("run=")[-1]))

p("")
p("checkpoint commits found:", len(ck))

# 2. for each checkpoint, inspect the two key files
for h, ci, run in ck:
    p("")
    p("=" * 90)
    p("CHECKPOINT run=%s  %s  %s" % (run, h[:9], ci))
    p("  tree:", git("--no-pager ls-tree --name-only %s" % h).replace("\n", " | ")[:600])
    for f in ("index.html", "app.js", "styles.css"):
        t = blob(h, f)
        p("  %-12s %s" % (f, markers(t)))

# 3. live working tree files
p("")
p("=" * 90)
p("LIVE WORKING TREE FILES (current)")
p("=" * 90)
for f in ("index.html", "app.js", "styles.css", "numberToWords.js"):
    fp = os.path.join(CWD, f)
    if os.path.isfile(fp):
        t = open(fp, "rb").read().decode("utf-8", "replace")
        p("  %-16s %s" % (f, markers(t)))
    else:
        p("  %-16s <missing>" % f)

# 4. HEAD content for reference
p("")
p("HEAD(12ef7d5) index.html/app.js markers:")
for f in ("index.html", "app.js"):
    p("   %-12s %s" % (f, markers(blob("HEAD", f))))

open(os.path.join(CWD, "_R3_report.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _R3_report.txt lines=%d" % len(OUT))
