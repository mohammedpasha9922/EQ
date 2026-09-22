# READ-ONLY. Compares checkpoint 259d1e1 (last known-good, 16:20:33) with the current working tree.
import subprocess, os, hashlib, json

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

SKIP_DIRS = {".git", ".venv", "node_modules", "__pycache__"}

# --- checkpoint tree ---
ck = {}
for line in git_txt(["ls-tree", "-r", CKPT]).splitlines():
    # 100644 blob <sha>\t<path>
    try:
        meta, path = line.split("\t", 1)
        mode, typ, sha = meta.split()
    except ValueError:
        continue
    if typ == "blob":
        ck[path.replace("\\", "/")] = sha

# --- current disk tree ---
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
        h = hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()
        cur[rel] = (h, len(b))

def same(path):
    return cur.get(path, (None,))[0] == ck.get(path)

only_ck = sorted(k for k in ck if k not in cur)
only_cur = sorted(k for k in cur if k not in ck)
diff = sorted(k for k in ck if k in cur and not same(k))

p("=" * 120)
p("COMPARE: checkpoint %s (2026-09-22 16:20:33, last known-good)  vs  CURRENT WORKING TREE" % CKPT)
p("=" * 120)
p("checkpoint files: %d | disk files: %d | identical: %d | differ: %d | only-in-checkpoint: %d | only-on-disk: %d"
  % (len(ck), len(cur), len(ck) - len(only_ck) - len(diff), len(diff), len(only_ck), len(only_cur)))

p("")
p("--- FILES THAT DIFFER (content changed since 16:20:33) ---")
for k in diff:
    p("   %-60s ckpt=%8d  disk=%8d" % (k, -1, cur[k][1]))
p("")
p("--- FILES THAT EXIST IN THE CHECKPOINT BUT NOT ON DISK (lost work) ---")
for k in only_ck:
    p("   %s" % k)
p("")
p("--- FILES ON DISK BUT NOT IN THE CHECKPOINT (added after 16:20:33) ---")
for k in only_cur:
    p("   %s" % k)
open(os.path.join(CWD, "_R10_tree_ck.txt"), "w", encoding="utf-8").write("\n".join(sorted(ck)))
print("WROTE _R10_report.txt lines=%d" % len(OUT))
