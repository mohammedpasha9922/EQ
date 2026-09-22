# Validates checkpoint candidate WITHOUT touching the project:
# extracts exact bytes to C:\EQ_VERIFY_CKPT and runs node --check.
import subprocess, os, hashlib

CWD = r"D:\Programs EQ7\EQ"
DEST = r"C:\EQ_VERIFY_CKPT"
CKPTS = {
    "A_8vhp5_run3 (16:20:33 last clean)": ("259d1e1", ["index.html", "app.js", "styles.css"]),
    "B_8vhp5_run2 (16:15:06)":            ("218a48f", ["index.html", "app.js"]),
    "C_xnrem_run2 (15:32:31)":            ("95b5725", ["index.html", "app.js"]),
    "D_8vhp5_run4 (16:32 corrupted)":     ("b3378c0", ["index.html", "app.js"]),
}

def blob(sha, path):
    r = subprocess.run(["git", "show", "%s:%s" % (sha, path)], cwd=CWD, capture_output=True)
    return None if r.returncode != 0 else r.stdout

os.makedirs(DEST, exist_ok=True)
out = []
for label, (sha, files) in CKPTS.items():
    out.append("=" * 100)
    out.append("%s   [%s]" % (label, sha))
    out.append("=" * 100)
    for f in files:
        b = blob(sha, f)
        if b is None:
            out.append("   %-12s <not found>" % f); continue
        txt = b.decode("utf-8", "replace")
        out.append("   %-12s bytes=%-9d U+FFFD=%-4d arabic=%-6d BOM=%s sha12=%s"
                   % (f, len(b), txt.count("\ufffd"),
                      sum(1 for c in txt if "\u0600" <= c <= "\u06ff"),
                      b[:3] == b"\xef\xbb\xbf", hashlib.sha256(b).hexdigest()[:12]))
    out.append("")

# extract option A exactly for syntax validation
for f in ["index.html", "app.js", "styles.css"]:
    b = blob("259d1e1", f)
    with open(os.path.join(DEST, "A_" + f), "wb") as fh:
        fh.write(b)

# node --check on the candidate app.js (Option A)
for name in ["A_app.js"]:
    r = subprocess.run(["node", "--check", os.path.join(DEST, name)], capture_output=True)
    out.append("node --check %s -> exit=%d %s" % (name, r.returncode,
               (r.stdout + r.stderr).decode("utf-8", "replace").strip()[:400]))

txt = blob("259d1e1", "app.js").decode("utf-8", "replace")
out.append("")
out.append("--- Option A app.js feature markers ---")
for t in ["pdfV1DelBtn", "pdfV1Tools", "smartPdf", "Smart Documents", "adBar", "notesPanel",
          "calcPanel", "currency", "numberToWords", "signature", "drawStamp", "smart-pdf"]:
    out.append("   %-18s %d" % (t, txt.count(t)))

html = blob("259d1e1", "index.html").decode("utf-8", "replace")
out.append("")
out.append("--- Option A index.html feature markers ---")
for t in ['id="pdfV1Tools"', "pdfV1DelBtn", "smartPdf", "smart-pdf", 'id="smartPdfToolbar"',
          "adBar", "calculator", "notes", "currency", "signature"]:
    out.append("   %-22s %d" % (t, html.count(t)))

open(os.path.join(CWD, "_R15_validate.txt"), "w", encoding="utf-8").write("\n".join(out))
print("WROTE _R15_validate.txt")
