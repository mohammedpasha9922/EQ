# READ-ONLY divergence analysis: checkpoint 259d1e1 vs LIVE, per key file.
import subprocess, os, difflib

CWD = r"D:\Programs EQ7\EQ"
CK = "259d1e1"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R16_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

def ck_bytes(path):
    r = subprocess.run(["git", "show", "%s:%s" % (CK, path)], cwd=CWD, capture_output=True)
    return r.stdout

def features(text):
    # count "structural" signatures present
    sigs = ["function ", "addEventListener", "pdfV1", "smartPdf", "adBar", "SmartDoc",
            "smartDoc", "getElementById", "class ", "querySelector", "const ", "id=\"",
            "#", "{"]
    return {s: text.count(s) for s in sigs}

for f in ("index.html", "app.js", "styles.css"):
    a = ck_bytes(f).decode("utf-8", "replace").splitlines()
    b = open(os.path.join(CWD, f), "rb").read().decode("utf-8", "replace").splitlines()
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    added = removed = 0
    hunks = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        if tag in ("insert", "replace"):
            added += (j2 - j1)
        if tag in ("delete", "replace"):
            removed += (i2 - i1)
        hunks.append((tag, i1, i2, j1, j2))

    p("")
    p("=" * 120)
    p("%s : checkpoint %s vs LIVE" % (f, CK))
    p("=" * 120)
    p("  ckpt lines=%-7d live lines=%-7d  equal-lines=%-7d" % (len(a), len(b), sum(sm.get_matching_blocks() and [m.size for m in sm.get_matching_blocks()])))
    p("  lines ONLY in checkpoint (lost)   : %d" % removed)
    p("  lines ONLY in live (new/kept)     : %d" % added)
    p("  changed regions                   : %d" % len(hunks))
    p("  ckpt features: %s" % features("\n".join(a)))
    p("  live features: %s" % features("\n".join(b)))

    # write full unified diff for review
    diff = difflib.unified_diff(a, b, fromfile="ckpt/%s" % f, tofile="live/%s" % f, lineterm="", n=2)
    open(os.path.join(CWD, "_DIFF_%s_ckpt_vs_live.txt" % f), "w", encoding="utf-8").write("\n".join(diff))

    # biggest non-equal regions
    hunks.sort(key=lambda h: -(max(h[2] - h[1], h[4] - h[3])))
    p("  top 12 changed regions (ckpt_lines, live_lines):")
    for tag, i1, i2, j1, j2 in hunks[:12]:
        p("     %-8s ckpt %6d-%-6d (%4d lines) -> live %6d-%-6d (%4d lines)"
          % (tag, i1 + 1, i2, i2 - i1, j1 + 1, j2, j2 - j1))

print("WROTE _R16_report.txt lines=%d" % len(OUT))
