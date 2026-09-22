import subprocess, pathlib
root = pathlib.Path(r"d:\Programs EQ7\EQ")
def run(args):
    p = subprocess.run(args, cwd=root, capture_output=True, text=True)
    return "$ " + " ".join(args) + "\n" + (p.stdout or "") + (p.stderr or "")
out = []
out.append(run(["git", "--no-pager", "status", "--short"]))
out.append(run(["git", "--no-pager", "diff", "--stat"]))
out.append(run(["git", "--no-pager", "log", "--oneline", "-3"]))
open(root / "_state.txt", "w", encoding="utf-8").write("\n".join(out))
print("STATE_WRITTEN")
