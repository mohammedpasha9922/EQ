# READ-ONLY evidence: feature-level inventory of HEAD / checkpoint run3 / live disk.
import subprocess, os, re

CWD = r"D:\Programs EQ7\EQ"
CAND = [("HEAD(12ef7d5)", "HEAD"), ("run3_259d1e1_1620", "259d1e1"), ("run6_d192e88_rollback", "d192e88")]
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R16_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def git(args):
    r = subprocess.run(["git"] + args, cwd=CWD, capture_output=True)
    return r.stdout.decode("utf-8", "replace")

def gshow(rev, path):
    r = subprocess.run(["git", "show", "%s:%s" % (rev, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout.decode("utf-8", "replace")

def disk(path):
    fp = os.path.join(CWD, path)
    return open(fp, "rb").read().decode("utf-8", "replace") if os.path.isfile(fp) else None

FUNC = re.compile(r"function\s+([A-Za-z_$][\w$]*)\s*\(")
CONSTFN = re.compile(r"(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\([^)]*\)\s*=>)")
IDRE = re.compile(r'\bid="([^"]+)"')
DOCFN = re.compile(r"\b(pdfV1[A-Za-z0-9_]*|smartPdf[A-Za-z0-9_]*|smartDocs[A-Za-z0-9_]*)\b")

def funcs(txt):
    if not txt: return set()
    return set(FUNC.findall(txt)) | set(CONSTFN.findall(txt))

def ids(txt):
    return set(IDRE.findall(txt)) if txt else set()

# ---------- app.js function inventory ----------
vers = [("HEAD", gshow("HEAD", "app.js")), ("run3_259d1e1", gshow("259d1e1", "app.js")),
        ("run6_d192e88", gshow("d192e88", "app.js")), ("DISK(now)", disk("app.js"))]
p("=" * 118)
p("APP.JS FUNCTION INVENTORY")
p("=" * 118)
fsets = {}
for name, txt in vers:
    f = funcs(txt)
    fsets[name] = f
    p("  %-14s bytes=%-9d functions=%-6d pdfV1/smartPdf/smartDocs tokens=%d"
      % (name, len(txt or ""), len(f), len(DOCFN.findall(txt or ""))))

base_head = fsets["HEAD"]
for name in ("run6_d192e88", "DISK(now)"):
    p("")
    p("  functions in %s but NOT in HEAD : %d" % (name, len(fsets[name] - base_head)))
    for k in sorted(fsets[name] - base_head)[:40]:
        p("      + %s" % k)

r3 = fsets["run3_259d1e1"]
for name in ("DISK(now)", "run6_d192e88"):
    lost = r3 - fsets[name]
    dom = sorted(x for x in lost if DOCFN.fullmatch(x) or "pdf" in x.lower() or "smart" in x.lower() or "doc" in x.lower())
    p("")
    p("  functions in run3_259d1e1 but NOT in %s : %d  (document/pdf related: %d)"
      % (name, len(lost), len(dom)))
    for k in dom[:60]:
        p("      - %s" % k)

# ---------- index.html element-id inventory ----------
p("")
p("=" * 118)
p("INDEX.HTML ELEMENT-ID INVENTORY")
p("=" * 118)
hvers = [("HEAD", gshow("HEAD", "index.html")), ("run3_259d1e1", gshow("259d1e1", "index.html")),
         ("run4_b3378c0_CORRUPT", gshow("b3378c0", "index.html")),
         ("run6_d192e88", gshow("d192e88", "index.html")), ("DISK(now)", disk("index.html"))]
iset = {}
for name, txt in hvers:
    i = ids(txt)
    iset[name] = i
    p("  %-22s bytes=%-8d ids=%-5d pdfV1-ids=%-3d smartPdf-ids=%-3d U+FFFD=%d"
      % (name, len(txt or ""), len(i),
         len([x for x in i if x.startswith("pdfV1")]),
         len([x for x in i if x.lower().startswith("smartpdf")]),
         (txt or "").count("\ufffd")))

for name in ("DISK(now)", "run6_d192e88"):
    lost = sorted(iset["run3_259d1e1"] - iset[name])
    p("")
    p("  ids in run3_259d1e1 but MISSING in %s : %d" % (name, len(lost)))
    for k in lost[:80]:
        p("      - %s" % k)

p("")
p("  ids in DISK(now) but NOT in run3_259d1e1 : %d" % len(iset["DISK(now)"] - iset["run3_259d1e1"]))
for k in sorted(iset["DISK(now)"] - iset["run3_259d1e1"])[:40]:
    p("      + %s" % k)

# ---------- the Smart Documents PDF toolbar HTML in run3 ----------
p("")
p("=" * 118)
p("SMART DOCUMENTS PDF TOOLBAR BLOCK AS OF run3 259d1e1 (last clean)")
p("=" * 118)
t3 = gshow("259d1e1", "index.html") or ""
m = re.search(r'id="pdfV1Tools".{0,2600}?</div>', t3, re.S)
p(m.group(0) if m else "  [pdfV1Tools not found in run3 index.html]")

# ---------- styles.css ----------
p("")
p("=" * 118)
p("STYLES.CSS")
p("=" * 118)
sc = [("HEAD", gshow("HEAD", "styles.css")), ("run3_259d1e1", gshow("259d1e1", "styles.css")),
      ("DISK(now)", disk("styles.css"))]
for name, txt in sc:
    p("  %-14s bytes=%-8d U+FFFD=%-3d arabic=%-4d #pdfV1 rules=%d adBar=%d"
      % (name, len(txt or ""), (txt or "").count("\ufffd"),
         sum(1 for c in (txt or "") if "\u0600" <= c <= "\u06ff"),
         (txt or "").count("#pdfV1"), (txt or "").count("adBar") + (txt or "").count("ad-bar")))

print("WROTE _R16_report.txt lines=%d" % len(OUT))
