# READ-ONLY: prove whether LIVE files == git HEAD content (modulo CRLF) and list restore scope.
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R17_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def git_blob(rev, path):
    r = subprocess.run(["git", "show", "%s:%s" % (rev, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

def norm(b):
    if b is None:
        return None
    return b.replace(b"\r\n", b"\n").replace(b"\r", b"\n")

def h(b):
    return "None" if b is None else hashlib.sha1(b).hexdigest()[:12]

p("=" * 118)
p("PROOF: are the LIVE index.html / app.js just git-HEAD content restored over the work?")
p("=" * 118)
for f in ("index.html", "app.js", "styles.css"):
    live_b = open(os.path.join(CWD, f), "rb").read()
    head_b = norm(git_blob("HEAD", f))
    ck_b = norm(git_blob("259d1e1", f))
    live_n = norm(live_b)
    p("")
    p("--- %s ---" % f)
    p("  live bytes=%-8d CRLF-count=%-6d  normalized-sha=%s" % (len(live_b), live_b.count(b"\r\n"), h(live_n)))
    p("  HEAD(12ef7d5) normalized-sha=%s  -> live==HEAD? %s" % (h(head_b), live_n == head_b))
    p("  ckpt(259d1e1) normalized-sha=%s  -> live==ckpt? %s" % (h(ck_b), live_n == ck_b))
    p("  VERDICT: %s" % (
        "live IS the committed HEAD version (regression confirmed)" if live_n == head_b else
        ("live already equals the checkpoint" if live_n == ck_b else "live differs from both")))

p("")
p("=" * 118)
p("ALSO: is the checkpoint's app.js/index.html present in any older local snapshot?")
p("=" * 118)
for base in ("_pristine", "_adbar_base", "_p31base"):
    for f in ("index.html", "app.js"):
        fp = os.path.join(CWD, base, f)
        if os.path.isfile(fp):
            b = norm(open(fp, "rb").read())
            p("  %-14s %-11s normalized-sha=%s  == ckpt? %s" % (base, f, h(b), b == norm(git_blob("259d1e1", f))))
        else:
            p("  %-14s %-11s MISSING" % (base, f))

print("WROTE _R17_report.txt lines=%d" % len(OUT))
