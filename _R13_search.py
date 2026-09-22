# READ-ONLY: locate which checkpoint refs ever contained the CURRENT live file contents,
# plus feature-marker census of the live files.
import subprocess, os, hashlib, datetime

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R13_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def git(args, timeout=120):
    try:
        r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True, timeout=timeout)
        return r.stdout.decode("utf-8", "replace")
    except subprocess.TimeoutExpired:
        return "<TIMEOUT>"

def blob_sha(fp):
    b = open(fp, "rb").read()
    return hashlib.sha1(b"blob %d\0" % len(b) + b).hexdigest()

live_blobs = {}
for f in ("index.html", "app.js", "styles.css"):
    live_blobs[f] = blob_sha(os.path.join(CWD, f))
p("LIVE git-blob shas:")
for k, v in live_blobs.items():
    p("   %-12s %s" % (k, v))
p("")

# --- enumerate checkpoint refs with dates ---
lines = git(["for-each-ref", "--format=%(objectname)%09%(committerdate:iso8601)%09%(refname)",
             "refs/cline/checkpoints"]).splitlines()
refs = []
for line in lines:
    parts = line.split("\t")
    if len(parts) < 3:
        continue
    refs.append((parts[0], parts[1], parts[2]))
p("total checkpoint refs: %d" % len(refs))

recent = [r for r in refs if r[1] >= "2026-09-19"]
p("checkpoint refs since 2026-09-19: %d  (searching these)" % len(recent))
p("")
p("=" * 100)
p("CHECKPOINTS THAT CONTAIN THE LIVE index.html / app.js / styles.css CONTENT")
p("=" * 100)
hits = {k: [] for k in live_blobs}
for sha, date, ref in sorted(recent, key=lambda r: (r[1], r[2])):
    txt = git(["ls-tree", sha, "--", "index.html", "app.js", "styles.css"])
    for line in txt.splitlines():
        try:
            meta, path = line.split("\t", 1)
            _, _, blob = meta.split()
        except ValueError:
            continue
        if path in hits and blob == live_blobs[path]:
            hits[path].append((date, ref.replace("refs/cline/checkpoints/", ""), sha[:9]))
for k, v in hits.items():
    p("")
    p("### live %s  (blob %s)" % (k, live_blobs[k][:12]))
    if not v:
        p("    NO checkpoint since 2026-09-19 contains this exact content.")
    for date, short, sha in v:
        p("    %s  %s  %s" % (date, short, sha))

p("")
p("=" * 100)
p("FEATURE-MARKER CENSUS OF LIVE FILES")
p("=" * 100)
TOK = ["pdfv1", "pdfV1", "PDF Reports", "smartPdf", "smart-pdf", "Smart Documents",
       "ad-bar", "adbar", "notes", "Notes", "calculator", "Calculator", "currency",
       "Currency", "signature", "Signature", "stamp", "Stamp", "worker", "sw.js",
       "numberToWords", "manifest"]
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    txt = open(fp, "rb").read().decode("utf-8", "replace")
    p("")
    p("--- %s (%d bytes)" % (f, len(txt.encode("utf-8", "replace"))))
    p("    " + "  ".join("%s=%d" % (t, txt.count(t)) for t in TOK))

p("")
p("=" * 100
  )
p("SCRIPT/LINK REFS IN LIVE index.html")
p("=" * 100)
html = open(os.path.join(CWD, "index.html"), "rb").read().decode("utf-8", "replace")
import re
for m in re.finditer(r'<(script|link)[^>]*>', html, re.I):
    p("   " + m.group(0).strip()[:160])

p("")
p("=" * 100)
p("PROJECT FILE INVENTORY (root, tracked-looking files)")
p("=" * 100)
root = sorted(x for x in os.listdir(CWD)
              if os.path.isfile(os.path.join(CWD, x)) and not x.startswith("_R")
              and x not in (".gitignore", ".clineignore"))
for x in root:
    st = os.stat(os.path.join(CWD, x))
    p("   %-45s %9d  %s" % (x, st.st_size,
      datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")))
print("WROTE _R13_report.txt lines=%d" % len(OUT))
