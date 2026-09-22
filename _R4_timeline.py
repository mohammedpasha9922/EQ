# READ-ONLY timeline of Cline checkpoint snapshots. Writes only _R4_report.txt
import subprocess, os, hashlib, datetime

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))

def git_show(sha, path):
    r = subprocess.run(["git", "show", "%s:%s" % (sha, path)], cwd=CWD, capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout.decode("utf-8", "replace")

def git_lines(args):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True)
    return r.stdout.decode("utf-8", "replace").splitlines()

def summarize(text):
    if text is None:
        return {"missing": True}
    toks = ["pdfV1", "smartPdf", "smart-pdf", "smartdoc", "SmartDoc", "adBar", "adbar",
            "notesPanel", "calcPanel", "numberToWords", "currency", "signature"]
    d = {
        "bytes": len(text.encode("utf-8", "replace")),
        "U+FFFD": text.count("\ufffd"),
        "?? runs": text.count("??"),
        "arabic": sum(1 for c in text if "\u0600" <= c <= "\u06ff"),
        "sha16": hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()[:12],
    }
    d.update({t: text.count(t) for t in toks})
    return d

# --- 1. enumerate checkpoint refs, keep today's (2026-09-22) sessions ---
refs = []
for line in git_lines(["for-each-ref", "--format=%(refname)%09%(objectname)%09%(subject)",
                       "refs/cline/checkpoints"]):
    parts = line.split("\t")
    if len(parts) < 2:
        continue
    ref, sha = parts[0], parts[1]
    subj = parts[2] if len(parts) > 2 else ""
    # refs/cline/checkpoints/<session>/<run>
    bits = ref.split("/")
    session, run = bits[-2], bits[-1]
    refs.append((session, int(run), sha, subj))

# commit dates to know which sessions are today
def cdate(sha):
    r = subprocess.run(["git", "show", "-s", "--format=%ci", sha], cwd=CWD, capture_output=True)
    return r.stdout.decode("utf-8", "replace").strip()

today = [r for r in refs if cdate(r[2]).startswith("2026-09-22")]
today.sort(key=lambda r: (cdate(r[2]), r[1]))
p("checkpoint refs total: %d ; today(2026-09-22): %d" % (len(refs), len(today)))
p("")
p("=" * 120)
p("TODAY'S CHECKPOINT TIMELINE — index.html / app.js")
p("=" * 120)
p("%-22s %-4s %-10s %-19s | %s" % ("session", "run", "sha", "time", "index.html markers"))
for session, run, sha, subj in today:
    ih = summarize(git_show(sha, "index.html"))
    aj = summarize(git_show(sha, "app.js"))
    p("%-22s %-4d %-10s %-19s | IH %s" % (session, run, sha[:9], cdate(sha), ih))
    p("%-22s %-4s %-10s %-19s | AJ %s" % ("", "", "", "", aj))
p("")
p("=" * 120)
p("LIVE FILES NOW")
p("=" * 120)
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    if os.path.isfile(fp):
        t = open(fp, "rb").read().decode("utf-8", "replace")
        st = os.stat(fp)
        p("%-12s mtime=%s %s" % (f, datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S"), summarize(t)))
    else:
        p("%-12s <missing>" % f)

open(os.path.join(CWD, "_R4_report.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _R4_report.txt lines=%d" % len(OUT))
