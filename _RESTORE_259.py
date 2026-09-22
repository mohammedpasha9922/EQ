# RESTORE from checkpoint 259d1e1 (2026-09-22 16:20:33, last clean state).
# - exact bytes via `git cat-file blob` (no PowerShell redirect -> no encoding damage)
# - never deletes anything; never uses git reset/restore/clean/checkout
import subprocess, os

W = r"D:\Programs EQ7\EQ"
CKPT = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(W, "_RESTORE_REPORT.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))
    print(a[-1] if a else "")

def sh(args):
    return subprocess.run(args, cwd=W, capture_output=True)

SKIP_DIRS = {"node_modules", ".venv", ".git", "__pycache__", ".idea", "dist"}

full = sh(["git", "rev-parse", CKPT]).stdout.decode().strip()
tree = sh(["git", "ls-tree", "-r", "-z", CKPT]).stdout
entries = []
for chunk in tree.split(b"\x00"):
    if not chunk:
        continue
    meta, path = chunk.split(b"\t", 1)
    mode, typ, sha = meta.decode().split()
    if typ == "blob":
        entries.append((path.decode("utf-8"), sha))

p("=" * 110)
p("RESTORE FROM CHECKPOINT  %s  (full sha %s)" % (CKPT, full))
p("=" * 110)
p("blobs in checkpoint: %d" % len(entries))

restored, created, same, skipped, failed = [], [], [], [], []

for path, sha in entries:
    top = path.replace("\\", "/").split("/")[0]
    if top in SKIP_DIRS:
        skipped.append(path)
        continue
    dest = os.path.join(W, path.replace("/", os.sep))
    b = sh(["git", "cat-file", "blob", sha]).stdout
    try:
        disk = open(dest, "rb").read()
    except Exception:
        disk = None
    if disk is not None and disk == b:
        same.append(path)
        continue
    try:
        d = os.path.dirname(dest)
        if d and not os.path.isdir(d):
            os.makedirs(d, exist_ok=True)
        with open(dest, "wb") as fh:
            fh.write(b)
        (created if disk is None else restored).append(path)
    except Exception as e:
        failed.append((path, repr(e)))

p("")
p("--- RESULT ---")
p("  overwritten (differed)      : %d" % len(restored))
p("  re-created (missing on disk): %d" % len(created))
p("  already identical (untouched): %d" % len(same))
p("  skipped dependency dirs      : %d" % len(skipped))
p("  FAILED                       : %d" % len(failed))
if failed:
    p("")
    p("--- FAILURES ---")
    for k, e in failed:
        p("   %s  %s" % (k, e))

p("")
p("--- OVERWRITTEN FILES (%d) ---" % len(restored))
for k in restored:
    p("   %s" % k)
p("")
p("--- RE-CREATED FILES (%d) ---" % len(created))
for k in created:
    p("   %s" % k)

p("")
p("DONE")
