# READ-ONLY. Compares checkpoint 259d1e1 (last known-good, 16:20:33) with the current working tree.
import subprocess, os, hashlib
from collections import Counter

CWD = r"D:\Programs EQ7\EQ"
CKPT = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R10_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def git_txt(args):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True)
    return r.stdout.decode("utf-8", "replace")

SKIP_DIRS = {".git", ".venv", "node_modules", "__pycache__", "_R_verify"}

ck = {}
for line in git_txt(["ls-tree", "-r", CKPT]).splitlines():
    try:
        meta, path = line.split("\t", 1)
        mode, typ, sha = meta.split()
    except ValueError:
        continue
    if typ == "blob":
        ck[path.replace("\\", "/")] = sha

cur = {}
for dirpath, dirs, files in os.walk(CWD):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fn in files:
        fp = os.path.join(dirpath, fn)
        rel = os.path.relpath(fp, CWD).replace("\\", "/")
        try:
            b = open(fp, "rb").read()
        except Exception:
            continue
        cur[rel] = (hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest(), len(b))

only_ck = sorted(k for k in ck if k not in cur)
only_cur = sorted(k for k in cur if k not in ck)
diff = sorted(k for k in ck if k in cur and ck[k] != cur[k][0])

p("=" * 120)
p("COMPARE: checkpoint %s (2026-09-22 16:20:33 = last known-good)  vs  CURRENT WORKING TREE" % CKPT)
p("=" * 120)
p("checkpoint files : %d" % len(ck))
p("disk files       : %d" % len(cur))
p("identical        : %d" % (len(ck) - len(only_ck) - len(diff)))
p("differ (content) : %d" % len(diff))
p("only in ckpt     : %d" % len(only_ck))
p("only on disk     : %d" % len(only_cur))

p("")
p("### 1. FILES THAT DIFFER IN CONTENT (changed since 16:20:33) ###")
for k in diff:
    p("   %-58s disk=%9d" % (k, cur[k][1]))

def group(paths, label):
    p("")
    p("### %s ###" % label)
    g = Counter((k.split("/")[0] if "/" in k else "<root>") for k in paths)
    for name, n in sorted(g.items(), key=lambda x: -x[1])[:40]:
        p("   %-45s %5d" % (name, n))
    p("   --- sample (max 60) ---")
    for k in paths[:60]:
        p("      %s" % k)

group(only_ck, "2. PRESENT IN CHECKPOINT BUT MISSING ON DISK (lost files)")
group(only_cur, "3. ON DISK ONLY (created after 16:20:33 - kept)")

p("")
p("### 4. KEY PROJECT FILES ###")
for k in ("index.html", "app.js", "styles.css", "numberToWords.js", "currencyService.js",
          "manifest.json", "sw.js", "service-worker.js"):
    if k in only_ck:
        st = "ckpt-only (MISSING on disk)"
    elif k in only_cur:
        st = "disk-only"
    elif k in ck and cur.get(k, (None,))[0] == ck[k]:
        st = "IDENTICAL"
    else:
        st = "DIFFERENT"
    p("   %-24s %s" % (k, st))

open(os.path.join(CWD, "_R10_tree_ck.txt"), "w", encoding="utf-8").write("\n".join(sorted(ck)))
print("WROTE _R10_report.txt lines=%d" % len(OUT))
