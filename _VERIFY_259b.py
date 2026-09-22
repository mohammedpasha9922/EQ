# READ-ONLY verification (fast) after restore from checkpoint 259d1e1.
# Compares disk vs checkpoint blobs with ONE batched `git hash-object`.
# node --check runs on %TEMP% copies because app.js is an ES module.
import subprocess, os, hashlib, tempfile, re, json

W = r"D:\Programs EQ7\EQ"
CKPT = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))

def sh(args, cwd=W, inp=None):
    return subprocess.run(args, cwd=cwd, capture_output=True, input=inp)

SKIP = {"node_modules", ".venv", ".git", "__pycache__", ".idea", "dist"}
tree = sh(["git", "ls-tree", "-r", "-z", CKPT]).stdout
entries = []
for chunk in tree.split(b"\x00"):
    if not chunk:
        continue
    meta, path = chunk.split(b"\t", 1)
    mode, typ, sha = meta.decode().split()
    if typ == "blob":
        entries.append((path.decode("utf-8"), sha))
CK = dict(entries)

proj = [(a, s) for a, s in entries if a.replace("\\", "/").split("/")[0] not in SKIP]
present = [(a, s) for a, s in proj if os.path.isfile(os.path.join(W, a.replace("/", os.sep)))]
missing = [a for a, s in proj if a not in [x for x, _ in present]]
payload = ("\n".join(a for a, _ in present) + "\n").encode("utf-8")
got = sh(["git", "hash-object", "--stdin-paths"], inp=payload).stdout.decode().split()
same, differ = [], []
for (a, s), g in zip(present, got):
    (same if g.strip() == s else differ).append(a)

p("=" * 100)
p("VERIFY 1 — RESTORE INTEGRITY vs checkpoint %s" % CKPT)
p("=" * 100)
p("project (non-dependency) blobs in checkpoint : %d" % len(proj))
p("byte-identical on disk        OK             : %d" % len(same))
p("still DIFFERENT               BAD            : %d" % len(differ))
p("MISSING on disk               BAD            : %d" % len(missing))
for lbl, lst in (("DIFFERING", differ), ("MISSING", missing)):
    if lst:
        p("")
        p("--- %s (first 40) ---" % lbl)
        for k in lst[:40]:
            p("   %s" % k)

p("")
p("=" * 100)
p("VERIFY 2 — ENCODING: BOM as in checkpoint, no '???' runs, no U+FFFD")
p("=" * 100)
p("%-32s %-8s %-8s %-8s %-8s %-8s %s" % ("file", "dskBOM", "cktBOM", "U+FFFD", "'??'", "arabic", "sha12"))
CORE = ["index.html", "app.js", "styles.css", "numberToWords.js", "currencyService.js",
        "manifest.json", "sw.js", "src/core/DisplayRenderer.js", "src/core/ResultScreen.js",
        "src/core/index.js", "src/i18n/arabic_hints.json", "src/modes/StandardCalculator.js"]
for f in CORE:
    dest = os.path.join(W, f.replace("/", os.sep))
    if not os.path.isfile(dest):
        p("%-32s <missing on disk>" % f); continue
    db = open(dest, "rb").read()
    cb = sh(["git", "cat-file", "blob", CK[f]]).stdout if f in CK else b""
    t = db.decode("utf-8", "replace")
    p("%-32s %-8s %-8s %-8d %-8d %-8d %s" % (f, db[:3] == b"\xef\xbb\xbf", cb[:3] == b"\xef\xbb\xbf",
        t.count("\ufffd"), t.count("??"), sum(1 for c in t if "\u0600" <= c <= "\u06ff"),
        hashlib.sha256(db).hexdigest()[:12]))

p("")
p("=" * 100)
p("VERIFY 3 — FEATURES PRESENT")
p("=" * 100)
html = open(os.path.join(W, "index.html"), "rb").read().decode("utf-8", "replace")
js = open(os.path.join(W, "app.js"), "rb").read().decode("utf-8", "replace")
css = open(os.path.join(W, "styles.css"), "rb").read().decode("utf-8", "replace")
ALL = html + "\n" + js + "\n" + css
FEATURES = {
    "Smart Documents":     ["Smart Documents", "smartPdf", "smart-pdf"],
    "PDF Reports toolbar": ["pdfV1Tools", "pdfV1DelBtn", "pdfV1P2El"],
    "PDF text editing":    ["pdfV1P2Del", "pdfV1Text"],
    "Signature image":     ["signatureImage", "sigDraw", "signature"],
    "Calculator":          ["calcPanel", "StandardCalculator", "Calculator"],
    "Notes":               ["notesPanel", "Notes"],
    "Ad Bar":              ["adBar", "adbar", "ad-bar"],
    "Currency":            ["currency"],
    "Number To Words":     ["numberToWords"],
    "Responsive layout":   ["@media"],
}
for lbl, toks in FEATURES.items():
    h = {t: ALL.count(t) for t in toks}
    p("%-22s %-8s %s" % (lbl, "OK" if sum(h.values()) else "MISSING", h))

p("")
p("=" * 100)
p("VERIFY 4 — node --check (ES-module aware; runs on %TEMP% copies, project untouched)")
p("=" * 100)
tmp = tempfile.mkdtemp(prefix="eq_verify_")
for f in ("app.js", "numberToWords.js", "currencyService.js", "sw.js",
          "src/modes/StandardCalculator.js", "src/core/DisplayRenderer.js",
          "src/core/ResultScreen.js", "src/core/index.js"):
    src = os.path.join(W, f.replace("/", os.sep))
    if not os.path.isfile(src):
        p("%-34s <missing>" % f); continue
    data = open(src, "rb").read()
    ismod = bool(re.search(rb"(?m)^\s*(import|export)\b", data))
    dst = os.path.join(tmp, os.path.basename(f).rsplit(".", 1)[0] + (".mjs" if ismod else ".cjs"))
    open(dst, "wb").write(data)
    r = sh(["node", "--check", dst], cwd=tmp)
    err = (r.stderr or r.stdout).decode("utf-8", "replace").strip()
    p("%-34s %-4s exit=%s  %s" % (f, "ESM" if ismod else "CJS", r.returncode,
        "SYNTAX OK" if r.returncode == 0 else err[:260].replace("\n", " | ")))
for f in ("manifest.json", "src/i18n/arabic_hints.json"):
    src = os.path.join(W, f.replace("/", os.sep))
    if os.path.isfile(src):
        try:
            json.loads(open(src, "rb").read().decode("utf-8-sig")); p("%-34s JSON OK" % f)
        except Exception as e:
            p("%-34s JSON ERROR %s" % (f, e))

open(os.path.join(W, "_VERIFY_REPORT.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _VERIFY_REPORT.txt lines=%d" % len(OUT))
