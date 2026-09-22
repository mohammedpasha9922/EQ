# STEP 1 = PROTECTION BACKUP (read-only w.r.t. the project). Does NOT modify the project.
# Also runs a read-only CSS superset check between live styles.css and checkpoint 259d1e1.
import os, shutil, subprocess, hashlib, re
from datetime import datetime

CWD = r"D:\Programs EQ7\EQ"
TS = datetime.now().strftime("%Y%m%d_%H%M%S")
DEST = r"C:\EQ_PROTECT_%s" % TS
SKIP = {".git", ".venv", "node_modules", "__pycache__"}

OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R16_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

# ---------- STEP 1: protection backup of the CURRENT working tree ----------
copied = 0
for dirpath, dirs, files in os.walk(CWD):
    dirs[:] = [d for d in dirs if d not in SKIP]
    rel = os.path.relpath(dirpath, CWD)
    target_dir = DEST if rel == "." else os.path.join(DEST, rel)
    os.makedirs(target_dir, exist_ok=True)
    for fn in files:
        src = os.path.join(dirpath, fn)
        try:
            shutil.copy2(src, os.path.join(target_dir, fn))
            copied += 1
        except Exception:
            pass

p("=" * 118)
p("STEP 1 — PROTECTION BACKUP CREATED")
p("=" * 118)
p("   destination : %s" % DEST)
p("   files copied: %d  (excluded: .git, .venv, node_modules)" % copied)
p("   covers      : current index.html / app.js / styles.css + whole working tree")

def sha(b):
    return hashlib.sha256(b).hexdigest()[:16]

p("")
p("   verified copies of the three key files:")
for f in ("index.html", "app.js", "styles.css"):
    a = open(os.path.join(CWD, f), "rb").read()
    b = open(os.path.join(DEST, f), "rb").read()
    p("     %-11s live=%s  backup=%s  %s" % (f, sha(a), sha(b), "MATCH" if a == b else "MISMATCH"))

# ---------- read-only CSS superset check ----------
def git_show(rev, path):
    r = subprocess.run(["git", "show", "%s:%s" % (rev, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout.decode("utf-8", "replace")

live_css = open(os.path.join(CWD, "styles.css"), "rb").read().decode("utf-8", "replace")
run3_css = git_show("259d1e1", "styles.css")

def selectors(css):
    # crude but effective: collect every selector token before a '{'
    body = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    sels = set()
    for m in re.finditer(r"([^{}]+)\{", body):
        chunk = m.group(1).strip()
        if chunk.startswith("@"):
            continue
        for part in chunk.split(","):
            part = " ".join(part.split())
            if part:
                sels.add(part)
    return sels

ls, rs = selectors(live_css), selectors(run3_css)
p("")
p("=" * 118)
p("READ-ONLY CSS CHECK — live styles.css (190,072 B) vs checkpoint 259d1e1 styles.css (182,075 B)")
p("=" * 118)
p("   live selectors         : %d" % len(ls))
p("   run3 selectors         : %d" % len(rs))
p("   in BOTH                : %d" % len(ls & rs))
p("   only in run3 (WOULD BE LOST if we keep live css) : %d" % len(rs - ls))
p("   only in live (newer, keep)                       : %d" % len(ls - rs))
miss = sorted(rs - ls)
if miss:
    p("")
    p("   --- selectors present in run3 but missing from live css (first 60) ---")
    for s in miss[:60]:
        p("      %s" % s)
print("WROTE _R16_report.txt lines=%d" % len(OUT))
print("BACKUP=" + DEST)
