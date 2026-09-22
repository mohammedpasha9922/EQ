# READ-ONLY verification after restore from checkpoint 259d1e1.
# Does not modify any project file. Writes only _VERIFY_REPORT.txt / _VERIFY_node.txt.
import subprocess, os, hashlib, json

W = r"D:\Programs EQ7\EQ"
CKPT = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(W, "_VERIFY_REPORT.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def sh(args):
    return subprocess.run(args, cwd=W, capture_output=True)

SKIP_DIRS = {"node_modules", ".venv", ".git", "__pycache__", ".idea", "dist"}

# ---------- 1. byte-identity: every non-dependency checkpoint file vs disk ----------
tree = sh(["git", "ls-tree", "-r", "-z", CKPT]).stdout
entries = []
for chunk in tree.split(b"\x00"):
    if not chunk:
        continue
    meta, path = chunk.split(b"\t", 1)
    mode, typ, sha = meta.decode().split()
    if typ == "blob":
        entries.append((path.decode("utf-8"), sha))

same = diff = missing = skipped = 0
diff_list, missing_list = [], []
for path, sha in entries:
    top = path.replace("\\", "/").split("/")[0]
    if top in SKIP_DIRS:
        skipped += 1
        continue
    dest = os.path.join(W, path.replace("/", os.sep))
    try:
        disk = open(dest, "rb").read()
    except Exception:
        missing += 1
        missing_list.append(path)
        continue
    blob = sh(["git", "cat-file", "blob", sha]).stdout
    if disk == blob:
        same += 1
    else:
        diff += 1
        diff_list.append(path)

p("=" * 100)
p("VERIFY 1/2/3 — RESTORE INTEGRITY vs checkpoint %s" % CKPT)
p("=" * 100)
p("non-dependency blobs in checkpoint : %d" % (same + diff + missing))
p("byte-identical on disk  (OK)       : %d" % same)
p("still different         (BAD)      : %d" % diff)
p("missing on disk         (BAD)      : %d" % missing)
p("dependency blobs skipped           : %d" % skipped)
if diff:
    p("")
    p("--- DIFFERING ---")
    for k in diff_list:
        p("   %s" % k)
if missing:
    p("")
    p("--- MISSING ---")
    for k in missing_list:
        p("   %s" % k)

# ---------- 4. encoding / BOM / mojibake ----------
p("")
p("=" * 100)
p("VERIFY — ENCODING (BOM preserved exactly as in checkpoint, no ??? / U+FFFD)")
p("=" * 100)
p("%-24s %-8s %-8s %-10s %-10s %-9s %-9s" % ("file", "diskBOM", "ckptBOM", "U+FFFD", "'??'runs", "arabic", "sha12"))
CORE = ["index.html", "app.js", "styles.css", "numberToWords.js", "currencyService.js",
        "manifest.json", "sw.js", "src/core/DisplayRenderer.js", "src/core/ResultScreen.js",
        "src/core/index.js", "src/i18n/arabic_hints.json", "src/modes/StandardCalculator.js"]
for f in CORE:
    dest = os.path.join(W, f.replace("/", os.sep))
    if not os.path.isfile(dest):
        p("%-24s <missing on disk>" % f)
        continue
    db = open(dest, "rb").read()
    ckentry = dict(entries).get(f)
    cb = sh(["git", "cat-file", "blob", ckentry]).stdout if ckentry else b""
    t = db.decode("utf-8", "replace")
    p("%-24s %-8s %-8s %-10d %-10d %-9d %-9s" % (
        f, db[:3] == b"\xef\xbb\xbf", cb[:3] == b"\xef\xbb\xbf",
        t.count("\ufffd"), t.count("??"),
        sum(1 for c in t if "\u0600" <= c <= "\u06ff"),
        hashlib.sha256(db).hexdigest()[:12]))

# ---------- 5. feature markers ----------
p("")
p("=" * 100)
p("VERIFY — FEATURES PRESENT")
p("=" * 100)
html = open(os.path.join(W, "index.html"), "rb").read().decode("utf-8", "replace")
js = open(os.path.join(W, "app.js"), "rb").read().decode("utf-8", "replace")
css = open(os.path.join(W, "styles.css"), "rb").read().decode("utf-8", "replace")
ALL = html + "\n" + js + "\n" + css

FEATURES = {
    "Smart Documents":        ["Smart Documents", "smartPdf", "smart-pdf"],
    "PDF Reports toolbar":    ["pdfV1Tools", "pdfV1DelBtn", "pdfV1P2El"],
    "PDF text editing":       ["pdfV1P2Del", "pdfv1-text", "pdfV1Text"],
    "Signature image":        ["signature", "sigImage", "signatureImage"],
    "Calculator":             ["calcPanel", "StandardCalculator", "calculator", "display"],
    "Notes":                  ["notesPanel", "notes", "notesDataModel"],
    "Ad Bar":                 ["adBar", "adbar", "ad-bar"],
    "Currency":               ["currency", "currencyService"],
    "Number To Words":        ["numberToWords"],
    "Responsive layout":      ["@media", "responsive"],
}
for label, toks in FEATURES.items():
    hits = {t: ALL.count(t) for t in toks}
    total = sum(hits.values())
    p("%-22s %-6s %s" % (label, "OK" if total else "MISSING", hits))

# ---------- 6. node --check ----------
p("")
p("=" * 100)
p("VERIFY — node --check app.js / numberToWords.js / currencyService.js / sw.js")
p("=" * 100)
for f in ("app.js", "numberToWords.js", "currencyService.js", "sw.js"):
    r = sh(["node", "--check", f])
    err = (r.stderr or r.stdout).decode("utf-8", "replace").strip()
    p("%-22s exit=%s %s" % (f, r.returncode, "SYNTAX OK" if r.returncode == 0 else err[:400]))

open(os.path.join(W, "_VERIFY_REPORT.txt"), "w", encoding="utf-8").write("\n".join(OUT))
print("WROTE _VERIFY_REPORT.txt lines=%d" % len(OUT))
