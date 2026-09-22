# READ-ONLY: compare CSS selector sets: DISK styles.css (190072) vs checkpoint 259d1e1 (182075)
import subprocess, os, re

CWD = r"D:\Programs EQ7\EQ"
OUT = []
def p(*a):
    OUT.append(" ".join(str(x) for x in a))
    with open(os.path.join(CWD, "_R17_report.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(OUT))

r = subprocess.run(["git", "show", "259d1e1:styles.css"], cwd=CWD, capture_output=True)
ck = r.stdout.decode("utf-8", "replace")
dk = open(os.path.join(CWD, "styles.css"), "rb").read().decode("utf-8", "replace")

def selectors(text):
    # strip comments, then take everything before '{' (each '{' starts a rule)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    parts = text.split("{")
    sels = set()
    for part in parts[:-1]:
        tail = part.split("}")[-1]
        for s in tail.split(","):
            s = " ".join(s.split())
            if s and not s.startswith("@") and len(s) < 200:
                sels.add(s)
    return sels

cs, ds = selectors(ck), selectors(dk)
only_disk = sorted(ds - cs)
only_ck = sorted(cs - ds)

p("styles.css selector sets:  checkpoint=%d  disk=%d  common=%d" % (len(cs), len(ds), len(cs & ds)))
p("only in DISK   (present on disk, missing from checkpoint): %d" % len(only_disk))
p("only in CKPT   (present in checkpoint, missing on disk)  : %d" % len(only_ck))
p("")
p("--- selectors ONLY in DISK styles.css (max 60) ---")
for s in only_disk[:60]:
    p("   %s" % s)
p("")
p("--- selectors ONLY in CKPT styles.css (max 60) ---")
for s in only_ck[:60]:
    p("   %s" % s)
p("")
# raw byte-level difference in size
p("size: disk=%d ckpt=%d diff=%d" % (len(dk.encode()), len(ck.encode()), len(dk.encode()) - len(ck.encode())))
print("WROTE _R17_report.txt lines=%d" % len(OUT))
