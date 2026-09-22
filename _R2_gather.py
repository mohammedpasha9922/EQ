# READ-ONLY evidence gatherer. Writes only _R2_report.txt (analysis artifact).
import os, subprocess, sys, hashlib, datetime

OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))

def run(cmd, cwd=r"D:\Programs EQ7\EQ"):
    try:
        r = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, timeout=180)
        out = r.stdout.decode("utf-8", "replace")
        err = r.stderr.decode("utf-8", "replace")
        return (out + (("\n[stderr] " + err) if err.strip() else "")).strip()
    except Exception as e:
        return "[ERR] %r" % e

def stat(path):
    try:
        st = os.stat(path)
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for b in iter(lambda: f.read(1 << 20), b""):
                h.update(b)
        mt = datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        return "size=%d sha256=%s mtime=%s" % (st.st_size, h.hexdigest()[:16], mt)
    except Exception as e:
        return "[ERR] %r" % e

CWD = r"D:\Programs EQ7\EQ"

p("=" * 90)
p("A. GIT FACTS")
p("=" * 90)
p("HEAD:", run("git rev-parse HEAD"))
p("branches:", run("git branch -a -v"))
p("--- git stash list ---")
p(run("git --no-pager stash list"))
p("--- git log --all --oneline -25 ---")
p(run("git --no-pager log --all --oneline --decorate -25"))
p("--- git status --porcelain (tracked-changes only: M/A/D/R) ---")
st = run("git status --porcelain")
tracked = [l for l in st.splitlines() if l[:2].strip() and not l.startswith("??")]
p("tracked-change count:", len(tracked))
p("\n".join(tracked[:60]))
p("untracked count:", len([l for l in st.splitlines() if l.startswith("??")]))
p("--- reflog (tail 25) ---")
p(run("git --no-pager reflog --all --date=iso"))
p("--- dangling / unreachable commits (no write) ---")
p(run("git fsck --unreachable --dangling --no-progress 2>&1"))

p("")
p("=" * 90)
p("B. CLINE CHECKPOINT SHADOW REPOS")
p("=" * 90)
bases = []
for env in ("APPDATA", "LOCALAPPDATA", "USERPROFILE"):
    v = os.environ.get(env)
    if v:
        bases.append(v)
for b in bases:
    p("-- scanning %s (depth<=6) for 'claude-dev'/'checkpoints' --" % b)
    for root, dirs, files in os.walk(b):
        depth = root[len(b):].count(os.sep)
        if depth > 6:
            dirs[:] = []
            continue
        low = root.lower()
        if low.endswith("globalstorage") or "claude-dev" in low or low.endswith("checkpoints"):
            p("   DIR:", root, "| subdirs:", dirs[:12])
        if "claude-dev" in low:
            dirs[:] = dirs[:20]

p("")
p("=" * 90)
p("C. BACKUP / SNAPSHOT DIRS IN PROJECT + DRIVES")
p("=" * 90)
cands = []
for drive in ("C:\\", "D:\\"):
    try:
        for n in os.listdir(drive):
            fp = os.path.join(drive, n)
            if os.path.isdir(fp) and ("EQ" in n.upper() and ("RECOV" in n.upper() or "BACKUP" in n.upper())):
                cands.append(fp)
    except Exception:
        pass
for n in os.listdir(CWD):
    fp = os.path.join(CWD, n)
    if os.path.isdir(fp) and (n.startswith("_") or "backup" in n.lower() or "pristine" in n.lower()):
        cands.append(fp)
for c in sorted(set(cands)):
    p("")
    p("### %s" % c)
    try:
        entries = sorted(os.listdir(c))
        p("  entries (%d): %s" % (len(entries), entries[:40]))
        for key in ("index.html", "app.js", "styles.css"):
            fp = os.path.join(c, key)
            if os.path.isfile(fp):
                p("   %-12s %s" % (key, stat(fp)))
            else:
                sub = [os.path.join(c, d, key) for d in (os.listdir(c) if os.path.isdir(c) else [])
                       if os.path.isfile(os.path.join(c, d, key))]
                if sub:
                    p("   %-12s FOUND-IN-SUBDIR %s -> %s" % (key, sub[0], stat(sub[0])))
                else:
                    p("   %-12s <missing>" % key)
    except Exception as e:
        p("  [ERR]", repr(e))

p("")
p("=" * 90)
p("D. CURRENT LIVE FILES")
p("=" * 90)
for key in ("index.html", "app.js", "styles.css", "numberToWords.js", "manifest.json", "sw.js"):
    fp = os.path.join(CWD, key)
    p("%-16s %s" % (key, stat(fp) if os.path.isfile(fp) else "<missing>"))

p("")
p("=" * 90)
p("E. FEATURE MARKERS IN CURRENT LIVE index.html / app.js")
p("=" * 90)
def grep(path, needles):
    try:
        data = open(path, "rb").read().decode("utf-8", "replace")
    except Exception as e:
        return {"[ERR]": repr(e)}
    res = {}
    for n in needles:
        res[n] = data.count(n)
    res["_REPLACEMENT_CHARS"] = data.count("\ufffd")
    res["_ARABIC_RUNS"] = sum(1 for ch in data if "\u0600" <= ch <= "\u06ff")
    return res

html_n = ['pdfV1DelBtn', 'smartPdfToolbar', 'smartPdfBackBtn', 'smartPdfEditBtn',
          'pdfV1Tools', 'notesPanel', 'calcPanel', 'adBar', 'id="currency']
app_n = ["pdfV1DelBtn", "pdfV1P2El('pdfV1DelBtn')", "smartPdfWire", "function pdfV1P2Del",
         "openNotes", "currency", "adBar"]
p("index.html:", grep(os.path.join(CWD, "index.html"), html_n))
p("app.js    :", grep(os.path.join(CWD, "app.js"), app_n))

open(os.path.join(CWD, "_R2_report.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _R2_report.txt lines=%d" % len(OUT))
