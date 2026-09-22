import subprocess
W = r"D:\Programs EQ7\EQ"
rows = []
for f in ["index.html", "app.js", "styles.css"]:
    b = subprocess.run(["git", "show", "HEAD:" + f], cwd=W, capture_output=True).stdout
    d = open(W + "\\" + f, "rb").read()
    t = b.decode("utf-8", "replace")
    dd = d.decode("utf-8", "replace")
    rows.append("%-12s HEAD=%9d disk=%9d identical=%s | HEAD smartPdf=%d pdfV1Tools=%d | disk smartPdf=%d pdfV1Tools=%d"
                % (f, len(b), len(d), b == d, t.count("smartPdf"), t.count('id="pdfV1Tools"'),
                   dd.count("smartPdf"), dd.count('id="pdfV1Tools"')))
log = subprocess.run(["git", "log", "--oneline", "-3"], cwd=W, capture_output=True).stdout.decode("utf-8", "replace")
open(W + r"\_R16_head.txt", "w", encoding="utf-8").write("\n".join(rows) + "\n\n--- git log ---\n" + log)
print("OK")
