# READ-ONLY. 1) show context of the single '??' in app.js  2) prove nothing was deleted.
import subprocess, os, re
W = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))
def sh(a, cwd=W): return subprocess.run(a, cwd=cwd, capture_output=True)

js = open(os.path.join(W, "app.js"), "rb").read().decode("utf-8", "replace")
lines = js.splitlines()
p("=" * 100)
p("A) THE SINGLE '??' OCCURRENCE IN app.js (verify it is legitimate code, not mojibake)")
p("=" * 100)
n = 0
for i, ln in enumerate(lines, 1):
    if "??" in ln:
        n += 1
        p("   line %d: %s" % (i, ln.strip()[:200]))
p("   total lines containing '??': %d" % n)
p("   U+FFFD count: %d" % js.count("\ufffd"))

p("")
p("=" * 100)
p("B) NOTHING DELETED — files on disk that are NOT in checkpoint must still exist")
p("=" * 100)
SKIP = {"node_modules", ".venv", ".git", "__pycache__", ".idea", "dist"}
ck = set()
for chunk in sh(["git", "ls-tree", "-r", "-z", "259d1e1"]).stdout.split(b"\x00"):
    if not chunk: continue
    meta, path = chunk.split(b"\t", 1)
    if meta.decode().split()[1] == "blob":
        ck.add(path.decode("utf-8").replace("\\", "/"))
disk = []
for dp, dirs, fs in os.walk(W):
    dirs[:] = [d for d in dirs if d not in SKIP]
    for fn in fs:
        disk.append(os.path.relpath(os.path.join(dp, fn), W).replace("\\", "/"))
extra = sorted(set(disk) - ck)
p("   checkpoint files          : %d" % len(ck))
p("   files on disk             : %d" % len(disk))
p("   extra files still present : %d  (NOT deleted)" % len(extra))
from collections import Counter
g = Counter((k.split("/")[0] if "/" in k else "<root>") for k in extra)
for k, v in sorted(g.items(), key=lambda x: -x[1])[:15]:
    p("      %-40s %5d" % (k, v))
p("   _pristine present        : %s" % os.path.isdir(os.path.join(W, "_pristine")))
p("   _adbar_base present      : %s" % os.path.isdir(os.path.join(W, "_adbar_base")))
p("   tests dir file count     : %d" % len([k for k in disk if k.startswith("tests/")]))
for d in ("__notes_test", "__phase37b", "__phase37b_v2", "__phase37e", "__phase37h", "__pdfdiag", "_p31base", "_R_verify"):
    p("   %-24s %s" % (d, "present" if os.path.isdir(os.path.join(W, d)) else "absent"))

p("")
p("=" * 100)
p("C) KEY FILE SIZES AFTER RESTORE")
p("=" * 100)
for f in ("index.html", "app.js", "styles.css", "numberToWords.js", "currencyService.js", "manifest.json", "sw.js"):
    fp = os.path.join(W, f)
    p("   %-22s %9d bytes" % (f, os.path.getsize(fp)) if os.path.isfile(fp) else "   %-22s MISSING" % f)

p("")
p("=" * 100)
p("D) git status (informational only - no git command was used to change files)")
p("=" * 100)
r = sh(["git", "--no-pager", "status", "--porcelain"])
mod = [l for l in r.stdout.decode("utf-8", "replace").splitlines() if not l.startswith("??")]
p("   modified/other tracked entries: %d (first 25)" % len(mod))
for l in mod[:25]:
    p("      %s" % l)

open(os.path.join(W, "_VERIFY2_REPORT.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _VERIFY2_REPORT.txt lines=%d" % len(OUT))
