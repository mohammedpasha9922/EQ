# READ-ONLY verification. Writes only _R8_report.txt + _R_verify/ extracts (no project file modified).
import subprocess, os, hashlib, datetime, glob, json

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))
def sha12(b): return hashlib.sha256(b).hexdigest()[:12]

def git_bytes(sha, path):
    r = subprocess.run(["git", "show", "%s:%s" % (sha, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

def git_txt(args):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True)
    return r.stdout.decode("utf-8", "replace")

def read(fp):
    return open(fp, "rb").read()

FEATS = ["id=\"pdfV1Tools\"", "pdfV1DelBtn", "smartPdf", "smart-pdf", "adBar", "adbar",
         "notesPanel", "calcPanel", "currencyPanel", "numberToWords", "signature", "Chat",
         "pdfv1", "Smart Documents"]

def profile(b):
    t = b.decode("utf-8", "replace")
    d = {"bytes": len(b), "U+FFFD": t.count("\ufffd"), "q2": t.count("??"),
         "arabic": sum(1 for c in t if "\u0600" <= c <= "\u06ff"),
         "sha12": sha12(b), "bom": b[:3] == b"\xef\xbb\xbf",
         "crlf": t.count("\r\n"), "lf_only": t.count("\n") - t.count("\r\n")}
    d["feats"] = {f: t.count(f) for f in FEATS}
    return d

# ---------- 1. distinct checkpoint states across ALL 573 refs ----------
refs = []
for line in git_txt(["for-each-ref", "--format=%(objectname)%09%(committerdate:iso8601)%09%(refname)",
                     "refs/cline/checkpoints"]).splitlines():
    bits = line.split("\t")
    if len(bits) >= 3:
        refs.append((bits[1], bits[2], bits[0]))
refs.sort()
seen = set()
states = []
for date, ref, sha in refs:
    if sha in seen:
        continue
    seen.add(sha)
    ih, aj, cs = git_bytes(sha, "index.html"), git_bytes(sha, "app.js"), git_bytes(sha, "styles.css")
    if ih is None and aj is None:
        continue
    key = (sha12(ih) if ih else "-", sha12(aj) if aj else "-", sha12(cs) if cs else "-")
    states.append((date, ref.replace("refs/cline/checkpoints/", ""), sha, key,
                   (len(ih) if ih else 0), (len(aj) if aj else 0), (len(cs) if cs else 0),
                   (ih or b"").decode("utf-8", "replace").count("\ufffd"),
                   (ih or b"").decode("utf-8", "replace").count("??"),
                   (aj or b"").decode("utf-8", "replace").count("\ufffd")))

# collapse consecutive identical keys
collapsed = []
for s in states:
    if collapsed and collapsed[-1][3] == s[3]:
        collapsed[-1] = collapsed[-1][:1] + (s[1],) + collapsed[-1][2:3] + s[3:]
        continue
    collapsed.append(s)

p("=" * 140)
p("DISTINCT (index.html | app.js | styles.css) STATES SEEN IN 573 CLINE CHECKPOINTS  — chronological")
p("=" * 140)
p("%-25s %-24s %-13s %-13s %-13s %8s %8s %6s %5s %5s" %
  ("date", "session/run", "index.html", "app.js", "styles.css", "IH_bytes", "AJ_bytes", "IH_FFFD", "IH_??", "AJ_FFFD"))
for date, ref, sha, key, ihb, ajb, csb, ihf, ihq, ajf in collapsed:
    p("%-25s %-24s %-13s %-13s %-13s %8d %8d %6d %5d %5d" %
      (date, ref, key[0], key[1], key[2], ihb, ajb, ihf, ihq, ajf))

# ---------- 2. CANDIDATE profiles ----------
CAND = {
    "run3_259d1e127 (2026-09-22 16:20:33)": "259d1e127",
    "run2_218a48fd5 (2026-09-22 16:15:06)": "218a48fd5",
    "xnrem2_95b572504 (2026-09-22 15:32:31)": "95b572504",
    "xnrem1_d8c3789c8 (2026-09-22 11:56:28)": "d8c3789c8",
    "BADrun4_b3378c051 (2026-09-22 16:32:23)": "b3378c051",
}
p("")
p("=" * 140)
p("CANDIDATE CHECKPOINT PROFILES")
p("=" * 140)
for label, sha in CAND.items():
    p("")
    p("--- %s ---" % label)
    for f in ("index.html", "app.js", "styles.css"):
        b = git_bytes(sha, f)
        p("   %-11s %s" % (f, json.dumps(profile(b), ensure_ascii=False) if b else "MISSING"))

p("")
p("=" * 140)
p("LIVE FILES (current, regressed)")
p("=" * 140)
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    b = read(fp)
    p("%-11s mtime=%s %s" % (f, datetime.datetime.fromtimestamp(os.stat(fp).st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                             json.dumps(profile(b), ensure_ascii=False)))

# ---------- 3. where did the live index.html/app.js come from? ----------
p("")
p("=" * 140)
p("SEARCH: which file on disk matches live index.html sha=059a1cdf7b34 / app.js sha=c7ae808f977b ?")
p("=" * 140)
live_ih = sha12(read(os.path.join(CWD, "index.html")))
live_aj = sha12(read(os.path.join(CWD, "app.js")))
roots = [r"D:\Programs EQ7", r"C:\EQ_RECOVERY_20260922_165747", r"C:\EQ_RECOVERY_20260922_165918",
         r"C:\EQ_RECOVERY_20260922_170209", r"C:\EQ_RECOVERY_20260922_170416", r"C:\EQ_RECOVERY_20260922_172553"]
hits = []
for root in roots:
    if not os.path.isdir(root):
        p("  <missing root> %s" % root); continue
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", ".venv", "node_modules")]
        for fn in files:
            if fn in ("index.html", "app.js"):
                fp = os.path.join(dirpath, fn)
                try:
                    h = sha12(read(fp))
                except Exception:
                    continue
                if h in (live_ih, live_aj):
                    hits.append(fp)
p("  matches for live index.html(%s)/app.js(%s):" % (live_ih, live_aj))
for h in hits:
    p("    %s" % h)
if not hits:
    p("    (none outside the live files themselves)")

# ---------- 4. extract candidate run3 to _R_verify/ for inspection ----------
vd = os.path.join(CWD, "_R_verify")
os.makedirs(vd, exist_ok=True)
for f in ("index.html", "app.js", "styles.css"):
    b = git_bytes("259d1e127", f)
    if b:
        open(os.path.join(vd, "run3_" + f), "wb").write(b)
p("")
p("extracted candidate files to _R_verify/run3_*")

open(os.path.join(CWD, "_R8_report.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _R8_report.txt lines=%d" % len(OUT))
