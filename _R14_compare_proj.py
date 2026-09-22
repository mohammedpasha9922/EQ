# READ-ONLY: project-relevant differences between checkpoint 259d1e1 (8vhp5/run3, 16:20:33) and disk.
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
CKPT = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R14_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def git(args):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True)
    return r.stdout.decode("utf-8", "replace")

NOISE_DIRS = ("__notes_test/", "node_modules/", ".venv/", ".git/", "__phase37", "_pristine/",
              "_adbar_base/", "_p31base/", "_recovery", "_R_verify/")
def is_noise(path):
    base = path.split("/")[-1]
    if path.startswith(NOISE_DIRS):
        return True
    if path.startswith("_") and not path.startswith("__"):
        return True          # scratch scripts (_CLOSE.js, _R*.py, ...)
    if base.endswith((".out", ".txt", ".log")) and path.count("/") == 0:
        return True          # root scratch logs
    if path.startswith("=") or base in ("$null", "devnull"):
        return True
    return False

ck = {}
for line in git(["ls-tree", "-r", CKPT]).splitlines():
    try:
        meta, path = line.split("\t", 1)
        _, typ, blob = meta.split()
    except ValueError:
        continue
    if typ == "blob":
        ck[path.replace("\\", "/")] = blob

def blob_sha1(fp):
    b = open(fp, "rb").read()
    return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()

proj_ck = sorted(k for k in ck if not is_noise(k))
p("=" * 104)
p("PROJECT FILE COMPARISON  —  checkpoint 259d1e1 (16:20:33, last clean)  vs  DISK")
p("=" * 104)
p("checkpoint project files (noise filtered): %d" % len(proj_ck))
p("")
p("%-52s %10s %10s  %s" % ("path", "ckpt", "disk", "status"))
changed = lost = 0
for k in proj_ck:
    fp = os.path.join(CWD, k.replace("/", os.sep))
    if not os.path.isfile(fp):
        p("%-52s %10s %10s  MISSING-ON-DISK" % (k, "?", "-"))
        lost += 1
        continue
    size = os.path.getsize(fp)
    same = blob_sha1(fp) == ck[k]
    if not same:
        p("%-52s %10s %10s  DIFFERENT" % (k, "?", size))
        changed += 1
p("")
p("SUMMARY: %d differ, %d missing on disk" % (changed, lost))

p("")
p("=" * 104)
p("CHECKPOINT FILES THAT ARE MISSING ON DISK (full list, incl. subdirs)")
p("=" * 104)
miss = []
for dirpath, dirs, files in os.walk(CWD):
    dirs[:] = [d for d in dirs if d not in {".git", ".venv", "node_modules"}]
disk = set()
for dirpath, dirs, files in os.walk(CWD):
    dirs[:] = [d for d in dirs if d not in {".git", ".venv", "node_modules"}]
    for fn in files:
        disk.add(os.path.relpath(os.path.join(dirpath, fn), CWD).replace("\\", "/"))
for k in sorted(ck):
    if k not in disk and not k.startswith(("node_modules/", ".venv/")):
        miss.append(k)
for k in miss[:400]:
    p("   %s" % k)
p("   (total missing: %d)" % len(miss))
print("WROTE _R14_report.txt lines=%d" % len(OUT))
