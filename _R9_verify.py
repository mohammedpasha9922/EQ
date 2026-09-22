# READ-ONLY verification, fast version. Writes only _R9_report.txt + _R_verify/ extracts.
import subprocess, os, hashlib, datetime, glob, json, sys

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R9_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def sha12(b): return hashlib.sha256(b).hexdigest()[:12]

def git(args, binary=False):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True)
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")

def gb(sha, path):
    b = git(["show", "%s:%s" % (sha, path)], binary=True)
    return b if b else None

def read(fp): return open(fp, "rb").read()

FEATS = ['id="pdfV1Tools"', "pdfV1DelBtn", "smartPdf", "smart-pdf", "adBar", "notesPanel",
         "calcPanel", "currencyPanel", "numberToWords", "signature", "Smart Documents", "pdfv1"]

def profile(b):
    t = b.decode("utf-8", "replace")
    return {"bytes": len(b), "U+FFFD": t.count("\ufffd"), "q2": t.count("??"),
            "arabic": sum(1 for c in t if "\u0600" <= c <= "\u06ff"), "sha12": sha12(b),
            "bom": b[:3] == b"\xef\xbb\xbf",
            "feats": {f: t.count(f) for f in FEATS}}

# ---- 1. every checkpoint commit with the sizes of the 3 key files (1 git call each) ----
rows = []
for line in git(["for-each-ref", "--format=%(objectname)%09%(committerdate:iso8601)%09%(refname)",
                 "refs/cline/checkpoints"]).splitlines():
    bits = line.split("\t")
    if len(bits) >= 3:
        rows.append((bits[1], bits[2], bits[0]))
rows.sort()

uniq = []
seen = set()
for date, ref, sha in rows:
    if sha in seen:
        continue
    seen.add(sha)
    uniq.append((date, ref.replace("refs/cline/checkpoints/", ""), sha))

p("checkpoint refs=%d ; unique commits=%d" % (len(rows), len(uniq)))
p("")
p("=" * 150)
p("ALL UNIQUE CHECKPOINT COMMITS (chronological) — sizes of index.html / app.js / styles.css")
p("=" * 150)
p("%-25s %-24s %-9s %10s %10s %10s" % ("date", "session/run", "commit", "index.html", "app.js", "styles.css"))
for date, ref, sha in uniq:
    ls = git(["ls-tree", "-r", "-l", sha, "--", "index.html", "app.js", "styles.css"])
    sizes = {}
    for l in ls.splitlines():
        parts = l.split()
        if len(parts) >= 5:
            sizes[parts[-1]] = parts[3]
    p("%-25s %-24s %-9s %10s %10s %10s" % (date, ref, sha[:7], sizes.get("index.html", "-"),
                                            sizes.get("app.js", "-"), sizes.get("styles.css", "-")))

CAND = {
    "OK  run3  259d1e127  16:20:33": "259d1e127",
    "OK  run2  218a48fd5  16:15:06": "218a48fd5",
    "OK  xnrem2 95b572504 15:32:31": "95b572504",
    "OK  xnrem1 d8c3789c8 11:56:28": "d8c3789c8",
    "BAD run4  b3378c051 16:32:23": "b3378c051",
    "BAD run5  ad01dcb1e 16:37:53": "ad01dcb1e",
    "BAD run6  d192e88bb 16:56:17": "d192e88bb",
    "BAD run8  5e2e67de8 17:50:54": "5e2e67de8",
}
p("")
p("=" * 150)
p("CANDIDATE PROFILES")
p("=" * 150)
for label, sha in CAND.items():
    p("")
    p("--- %s ---" % label)
    for f in ("index.html", "app.js", "styles.css"):
        b = gb(sha, f)
        p("   %-11s %s" % (f, json.dumps(profile(b), ensure_ascii=False) if b else "MISSING"))

p("")
p("=" * 150)
p("LIVE FILES NOW")
p("=" * 150)
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    b = read(fp)
    p("%-11s mtime=%s %s" % (f, datetime.datetime.fromtimestamp(os.stat(fp).st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                             json.dumps(profile(b), ensure_ascii=False)))

# ---- 2. hunt for the origin of the live files anywhere on D:\Programs EQ7 and C:\EQ_RECOVERY_* ----
p("")
p("=" * 150)
p("ORIGIN OF LIVE index.html / app.js")
p("=" * 150)
live = {sha12(read(os.path.join(CWD, f))): f for f in ("index.html", "app.js", "styles.css")}
p("live hashes: %s" % json.dumps(live))
roots = [r"D:\Programs EQ7"] + sorted(glob.glob(r"C:\EQ_RECOVERY_*"))
found = {}
for root in roots:
    if not os.path.isdir(root):
        p("  <missing> %s" % root); continue
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", ".venv", "node_modules", "__pycache__")]
        for fn in files:
            if fn in ("index.html", "app.js", "styles.css"):
                fp = os.path.join(dirpath, fn)
                try:
                    h = sha12(read(fp))
                except Exception:
                    continue
                if h in live:
                    found.setdefault(h, []).append(fp)
for h, fname in live.items():
    p("")
    p("  %s (%s) found in %d place(s):" % (h, fname, len(found.get(h, []))))
    for fp in found.get(h, [])[:40]:
        p("      %s" % fp)

# ---- 3. extract the two leading candidates for offline inspection ----
vd = os.path.join(CWD, "_R_verify")
os.makedirs(vd, exist_ok=True)
for tag, sha in (("run3", "259d1e127"), ("xnrem1", "d8c3789c8")):
    for f in ("index.html", "app.js", "styles.css"):
        b = gb(sha, f)
        if b:
            open(os.path.join(vd, "%s_%s" % (tag, f)), "wb").write(b)
p("")
p("extracted candidates -> _R_verify/")
print("WROTE _R9_report.txt lines=%d" % len(OUT))
