# READ-ONLY comparison of app-critical files: good checkpoint vs disk vs older bases.
import subprocess, os, hashlib, datetime

CWD = r"D:\Programs EQ7\EQ"
CKPT = "259d1e1"      # 2026-09-22 16:20:33 = last clean
ALT = "95b572504"     # 15:32:31 (same content as CKPT)
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R15_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def blob(sha, path):
    r = subprocess.run(["git", "show", "%s:%s" % (sha, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

TOKS = ["pdfV1DelBtn", "pdfV1Tools", "smartPdf", "smart-pdf", "adBar", "adbar",
        "Smart Documents", "notesPanel", "calcPanel", "currency", "numberToWords",
        "signature", "???", "\ufffd"]
def prof(b):
    if b is None:
        return "MISSING"
    t = b.decode("utf-8", "replace")
    return "%9d %s %s" % (len(b), hashlib.sha256(b).hexdigest()[:10],
                          " ".join("%s=%d" % (k.strip(), t.count(k)) for k in TOKS))

FILES = ["index.html", "app.js", "styles.css", "numberToWords.js", "currencyService.js",
         "manifest.json", "sw.js", "src/core/DisplayRenderer.js", "src/core/ResultScreen.js",
         "src/core/index.js", "src/i18n/arabic_hints.json", "src/modes/StandardCalculator.js"]

p("=" * 132)
p("APP-CRITICAL FILES:  checkpoint %s (16:20:33 clean)  |  checkpoint %s (15:32:31)  |  DISK  |  _pristine  |  _adbar_base" % (CKPT, ALT))
p("=" * 132)
for f in FILES:
    p("")
    p("### %s" % f)
    p("   CKPT %s  : %s" % (CKPT, prof(blob(CKPT, f))))
    p("   CKPT %s    : %s" % (ALT, prof(blob(ALT, f))))
    dp = os.path.join(CWD, f.replace("/", os.sep))
    if os.path.isfile(dp):
        st = os.stat(dp)
        p("   DISK          : %s   mtime=%s" % (prof(open(dp, "rb").read()),
          datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")))
    else:
        p("   DISK          : MISSING")
    for base in ("_pristine", "_adbar_base", "_p31base"):
        bp = os.path.join(CWD, base, f.replace("/", os.sep))
        p("   %-13s : %s" % (base, prof(open(bp, "rb").read()) if os.path.isfile(bp) else "MISSING"))

p("")
p("=" * 132)
p("VERDICT TABLE (disk identical to which source?)")
p("=" * 132)
def h(b):
    return hashlib.sha256(b).hexdigest()[:10] if b is not None else None

for f in FILES:
    dp = os.path.join(CWD, f.replace("/", os.sep))
    if not os.path.isfile(dp):
        p("   %-40s <missing on disk>" % f); continue
    dh = hashlib.sha256(open(dp, "rb").read()).hexdigest()
    row = []
    for lbl, src in (("ckpt-good", blob(CKPT, f)), ("ckpt-alt", blob(ALT, f)),
                     ("_pristine", open(os.path.join(CWD, "_pristine", f.replace("/", os.sep)), "rb").read()
                      if os.path.isfile(os.path.join(CWD, "_pristine", f.replace("/", os.sep))) else None),
                     ("_adbar_base", open(os.path.join(CWD, "_adbar_base", f.replace("/", os.sep)), "rb").read()
                      if os.path.isfile(os.path.join(CWD, "_adbar_base", f.replace("/", os.sep))) else None),
                     ("_p31base", open(os.path.join(CWD, "_p31base", f.replace("/", os.sep)), "rb").read()
                      if os.path.isfile(os.path.join(CWD, "_p31base", f.replace("/", os.sep))) else None)):
        row.append("%s=%s" % (lbl, "SAME" if (src is not None and hashlib.sha256(src).hexdigest() == dh) else "diff"))
    p("   %-40s %s" % (f, "  ".join(row)))

p("")
p("NOTE: 'SAME' for ckpt-good means the disk file still matches the last clean checkpoint.")
print("WROTE _R15_report.txt lines=%d" % len(OUT))
