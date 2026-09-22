# READ-ONLY: sizes of project vs dependency dirs, and size of the checkpoint restore set.
import subprocess, os

CWD = r"D:\Programs EQ7\EQ"
CK = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_S0_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def human(n):
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return "%.1f %s" % (n, u)
        n /= 1024.0
    return "%.1f TB" % n

# --- disk sizes by top-level dir ---
p("=" * 100)
p("DISK USAGE BY TOP-LEVEL ENTRY")
p("=" * 100)
tot = 0
rows = []
for name in sorted(os.listdir(CWD)):
    fp = os.path.join(CWD, name)
    if os.path.isfile(fp):
        s = os.path.getsize(fp); n = 1
    else:
        s = 0; n = 0
        for r, d, fs in os.walk(fp):
            for f in fs:
                try:
                    s += os.path.getsize(os.path.join(r, f)); n += 1
                except Exception:
                    pass
    rows.append((s, n, name))
    tot += s
rows.sort(reverse=True)
for s, n, name in rows[:25]:
    p("   %-12s %9d files  %s" % (human(s), n, name))
p("   ---------------------------------------")
p("   TOTAL PROJECT DIR: %s" % human(tot))

# --- checkpoint tree (non-dependency) ---
r = subprocess.run(["git", "ls-tree", "-r", "-l", CK], cwd=CWD, capture_output=True)
lines = r.stdout.decode("utf-8", "replace").splitlines()
dep_pref = ("node_modules/", ".venv/", ".git/")
proj = []
for ln in lines:
    parts = ln.split()
    if len(parts) < 5:
        continue
    size = parts[3]
    path = " ".join(parts[4:])
    if any(path.startswith(d) for d in dep_pref):
        continue
    try:
        proj.append((int(size), path))
    except ValueError:
        pass
p("")
p("=" * 100)
p("CHECKPOINT %s — NON-DEPENDENCY FILES" % CK)
p("=" * 100)
p("   file count: %d   total size: %s" % (len(proj), human(sum(s for s, _ in proj))))
from collections import Counter
c = Counter((q.split("/")[0] if "/" in q else "<root>") for _, q in proj)
for name, n in c.most_common(25):
    sub = sum(s for s, q in proj if (q.split("/")[0] if "/" in q else "<root>") == name)
    p("   %-32s %6d files  %s" % (name, n, human(sub)))

# --- restore set = differs or missing on disk (non-dependency) ---
def blob_sha(path):
    rr = subprocess.run(["git", "rev-parse", "%s:%s" % (CK, path)], cwd=CWD, capture_output=True)
    return rr.stdout.decode().strip() if rr.returncode == 0 else None

import hashlib
def disk_sha1(path):
    fp = os.path.join(CWD, path)
    if not os.path.isfile(fp):
        return None
    b = open(fp, "rb").read()
    return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()

restore, same = [], 0
for size, path in proj:
    ds = disk_sha1(path)
    if ds is None:
        restore.append((size, path, "MISSING"))
    elif ds != blob_sha(path):
        restore.append((size, path, "DIFFERS"))
    else:
        same += 1

p("")
p("=" * 100)
p("RESTORE SET (checkpoint vs disk)")
p("=" * 100)
p("   identical already : %d files" % same)
p("   to restore        : %d files  (%s)" % (len(restore), human(sum(s for s, _, _ in restore))))
sd = {}
for s, q, st in restore:
    k = q.split("/")[0] if "/" in q else "<root>"
    a, b = sd.get(k, (0, 0))
    sd[k] = (a + 1, b + s)
for k, (a, b) in sorted(sd.items(), key=lambda x: -x[1][1]):
    p("      %-32s %6d files  %s" % (k, a, human(b)))
p("")
p("   --- core files ---")
for s, q, st in restore:
    if q in ("index.html", "app.js", "styles.css"):
        p("      %-16s %-8s %s" % (q, st, human(s)))
open(os.path.join(CWD, "_S0_restore_list.txt"), "w", encoding="utf-8").write(
    "\n".join("%s\t%s\t%d" % (st, q, s) for s, q, st in restore))
print("WROTE _S0_report.txt lines=%d restore=%d" % (len(OUT), len(restore)))
