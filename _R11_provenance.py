# READ-ONLY provenance hunt: which snapshot do the CURRENT live files come from?
import os, hashlib, subprocess, datetime

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R11_provenance.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def sha256_fp(fp):
    h = hashlib.sha256()
    with open(fp, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

live = {}
p("=" * 110)
p("LIVE FILE FINGERPRINTS (sha256) + mtime")
p("=" * 110)
for f in ("index.html", "app.js", "styles.css", "numberToWords.js"):
    fp = os.path.join(CWD, f)
    if os.path.isfile(fp):
        st = os.stat(fp)
        live[f] = sha256_fp(fp)
        p("%-18s sha256=%s  size=%8d  mtime=%s" % (
            f, live[f][:20], st.st_size,
            datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")))
    else:
        p("%-18s <missing>" % f)

# ---- search for copies of the live files anywhere ----
targ = {v: k for k, v in live.items()}
roots = [CWD]
for drive in ("C:\\", "D:\\"):
    try:
        for d in os.listdir(drive):
            if d.upper().startswith("EQ"):
                fp = os.path.join(drive, d)
                if os.path.isdir(fp) and os.path.abspath(fp) != os.path.abspath(CWD):
                    roots.append(fp)
    except Exception:
        pass

SKIP = {".git", ".venv", "node_modules", "__pycache__"}
p("")
p("=" * 110)
p("EVERY FILE ON DISK WHOSE sha256 MATCHES A LIVE FILE  (provenance)")
p("=" * 110)
seen = set()
for root in roots:
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for fn in files:
            fp = os.path.join(dirpath, fn)
            try:
                st = os.stat(fp)
                if st.st_size not in {os.stat(os.path.join(CWD, k)).st_size for k in live}:
                    continue
                h = sha256_fp(fp)
            except Exception:
                continue
            if h in targ:
                key = (targ[h], os.path.abspath(fp))
                if key in seen:
                    continue
                seen.add(key)
                p("  [%s]  %s" % (targ[h], fp))
                p("         mtime=%s" % datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S"))

p("")
p("=" * 110)
p("GIT BLOB SHA FOR THE SAME CONTENT IN ALL TODAY CHECKPOINTS")
p("=" * 110)
runs = [("xnrem/1", "d8c3789"), ("xnrem/2", "95b5725"), ("8vhp5/1", "bfe7fbc"),
        ("8vhp5/2", "218a48f"), ("8vhp5/3", "259d1e1"), ("8vhp5/4", "b3378c0"),
        ("8vhp5/5", "ad01dcb"), ("8vhp5/6", "d192e88"), ("8vhp5/7", "bb0de30"),
        ("8vhp5/8", "5e2e67d"), ("HEAD", "HEAD")]
for label, sha in runs:
    r = subprocess.run(["git", "ls-tree", sha, "--", "index.html", "app.js", "styles.css"],
                       cwd=CWD, capture_output=True)
    txt = r.stdout.decode("utf-8", "replace")
    p("--- %s (%s)" % (label, sha))
    for line in txt.splitlines():
        try:
            meta, path = line.split("\t", 1)
            mode, typ, blob = meta.split()
            print(path)
        except ValueError:
            continue
        # get size of blob
        r2 = subprocess.run(["git", "cat-file", "-s", blob], cwd=CWD, capture_output=True)
        size = r2.stdout.decode().strip()
        p("      %-12s blob=%s size=%s" % (path, blob[:12], size))

# git blob sha of live content
def git_blob_sha(fp):
    b = open(fp, "rb").read()
    return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()
p("")
p("git-blob sha1 of LIVE files:")
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    if os.path.isfile(fp):
        p("   %-12s %s" % (f, git_blob_sha(fp)))
print("WROTE _R11_provenance.txt lines=%d" % len(OUT))
