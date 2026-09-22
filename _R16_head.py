# READ-ONLY: are the disk versions of key files simply reverts to git HEAD?
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
CKPT = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R16_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def show(rev, path):
    r = subprocess.run(["git", "show", "%s:%s" % (rev, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

def sha(b):
    return None if b is None else hashlib.sha256(b).hexdigest()[:10]

FILES = ["index.html", "app.js", "styles.css", "numberToWords.js", "currencyService.js",
         "manifest.json", "sw.js", "src/core/DisplayRenderer.js", "src/core/ResultScreen.js",
         "src/core/index.js", "src/i18n/arabic_hints.json", "src/modes/StandardCalculator.js"]

p("=" * 118)
p("IS THE DISK FILE JUST A REVERT TO git HEAD?   (HEAD = 12ef7d5)")
p("=" * 118)
p("%-34s %11s %11s %11s   verdict" % ("path", "HEAD", "DISK", "CKPT-good"))
for f in FILES:
    fp = os.path.join(CWD, f.replace("/", os.sep))
    dh = sha(open(fp, "rb").read()) if os.path.isfile(fp) else None
    hh = sha(show("HEAD", f))
    ch = sha(show(CKPT, f))
    verdict = ("DISK == HEAD (reverted)" if dh == hh else
               ("DISK == CKPT (intact)" if dh == ch else "DISK is a third variant"))
    p("%-34s %11s %11s %11s   %s" % (f, hh, dh, ch, verdict))

# working tree status summary
r = subprocess.run(["git", "status", "--porcelain"], cwd=CWD, capture_output=True)
lines = r.stdout.decode("utf-8", "replace").splitlines()
from collections import Counter
c = Counter(l[:2].strip() or "??" for l in lines)
p("")
p("git status --porcelain: %d entries -> %s" % (len(lines), dict(c)))
p("")
p("tracked (non-untracked) modified/deleted entries (first 60):")
n = 0
for l in lines:
    if not l.startswith("??"):
        p("   %s" % l); n += 1
        if n >= 60:
            break
p("   ... total tracked-changed shown: %d" % n)

print("WROTE _R16_report.txt lines=%d" % len(OUT))
