import os

final = "tests/notesCompanyProfileRemoval.browser.mjs"
parts = ["tests/_header.mjs", "tests/_part2.mjs", "tests/_part4.mjs"]

raw = open(final, "rb").read().decode("utf-8")
lines = raw.replace("\r\n", "\n").split("\n")
open("tests/_header.mjs", "w", encoding="utf-8", newline="\n").write("\n".join(lines[:112]) + "\n")

out = []
for p in parts:
    out.append(open(p, encoding="utf-8").read().rstrip("\n"))
body = "\n".join(out) + "\n"
open(final, "wb").write(body.encode("utf-8"))
print("assembled %d lines" % len(body.split("\n")))
for p in ["tests/_header.mjs", "tests/_part2.mjs", "tests/_part3.mjs", "tests/_part4.mjs"]:
    try:
        os.remove(p)
        print("removed", p)
    except OSError as exc:
        print("keep", p, exc)