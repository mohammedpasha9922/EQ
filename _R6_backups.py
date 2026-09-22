# READ-ONLY profile of external recovery backups + local snapshot dirs.
import os, hashlib, datetime, glob

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a): OUT.append(" ".join(str(x) for x in a))

def summarize(text):
    toks = ["pdfV1DelBtn", "pdfV1Tools", "smartPdf", "smart-pdf", "Smart Documents",
            "adBar", "adbar", "notesPanel", "calcPanel", "numberToWords", "currency",
            "signature", "???"]
    d = {"bytes": len(text.encode("utf-8", "replace")),
         "U+FFFD": text.count("\ufffd"),
         "arabic": sum(1 for c in text if "\u0600" <= c <= "\u06ff"),
         "sha12": hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()[:12]}
    d.update({t: text.count(t) for t in toks})
    return d

def find_file(base, name, maxdepth=3):
    direct = os.path.join(base, name)
    if os.path.isfile(direct):
        return direct
    for root, dirs, files in os.walk(base):
        if len(root[len(base):].split(os.sep)) > maxdepth:
            dirs[:] = []
            continue
        if name in files:
            return os.path.join(root, name)
    return None

targets = sorted(glob.glob(r"C:\EQ_RECOVERY_*")) + sorted(glob.glob(r"C:\EQ_RECOVERY_*\**"))[:0]
targets += [os.path.join(CWD, d) for d in ("_pristine", "_adbar_base", "_p31base",
                                           "__phase37b_v2", "__phase37b", "__phase37e", "__phase37h")]

p("=" * 120)
p("EXTERNAL RECOVERY BACKUPS + LOCAL SNAPSHOT DIRS")
p("=" * 120)
for base in targets:
    if not os.path.isdir(base):
        p("### %s  <missing>" % base); continue
    st = os.stat(base)
    p("")
    p("### %s   (mtime=%s)" % (base, datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")))
    try:
        top = sorted(os.listdir(base))
        p("    top-level: %s" % top[:25])
    except Exception as e:
        p("    [ERR]", repr(e))
    for name in ("index.html", "app.js", "styles.css"):
        fp = find_file(base, name)
        if not fp:
            p("    %-11s <missing>" % name); continue
        txt = open(fp, "rb").read().decode("utf-8", "replace")
        st2 = os.stat(fp)
        p("    %-11s mtime=%s %s" % (name, datetime.datetime.fromtimestamp(st2.st_mtime).strftime("%m-%d %H:%M:%S"), summarize(txt)))

p("")
p("=" * 120)
p("LIVE NOW")
p("=" * 120)
for f in ("index.html", "app.js", "styles.css"):
    fp = os.path.join(CWD, f)
    if os.path.isfile(fp):
        txt = open(fp, "rb").read().decode("utf-8", "replace")
        st = os.stat(fp)
        p("%-11s mtime=%s %s" % (f, datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S"), summarize(txt)))

open(os.path.join(CWD, "_R6_backups.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _R6_backups.txt lines=%d" % len(OUT))
