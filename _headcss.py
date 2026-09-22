import re
import subprocess

out = []


def git_show(rev, path):
    p = subprocess.run(["git", "show", "%s:%s" % (rev, path)], capture_output=True)
    return p.stdout.decode("utf-8", "replace").replace("\r\n", "\n")


for rev in ["HEAD"]:
    for path in ["styles.css", "index.html"]:
        txt = git_show(rev, path)
        out.append("===== %s:%s (%d lines)" % (rev, path, txt.count("\n") + 1))
        for i, l in enumerate(txt.split("\n"), 1):
            if re.search(r"full-screen-note-header|full-screen-note-action-bar|full-screen-note-title", l):
                out.append("  %d| %s" % (i, l.strip()[:160]))
        # find the AR-scoped RTL flip
        for m in re.finditer(r"[^\n]*data-language\s*=\s*['\"]ar['\"][^\n]*full-screen-note[^\n]*", txt):
            out.append("  ARRULE %s" % m.group(0).strip()[:160])

txt = open("index.html", encoding="utf-8", errors="replace").read().replace("\r\n", "\n")
out.append("===== current index.html inline styles touching the note header")
for i, l in enumerate(txt.split("\n"), 1):
    if re.search(r"full-screen-note-header|full-screen-note-action-bar|note-title-row", l):
        out.append("  %d| %s" % (i, l.strip()[:160]))

out.append("===== processes")
p = subprocess.run(["powershell", "-NoProfile", "-Command",
                    "Get-Process node,chrome -ErrorAction SilentlyContinue | "
                    "Group-Object ProcessName | ForEach-Object { \"$($_.Name)=$($_.Count)\" }"],
                   capture_output=True)
out.append(p.stdout.decode("utf-8", "replace"))

open("_head_css.txt", "w", encoding="utf-8").write("\n".join(out))
print("ok")