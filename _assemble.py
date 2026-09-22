"""Assemble tests/notesCompanyProfileRemoval.browser.mjs from the ordered chunks
so no editor call has to carry the whole file at once."""
import io
import os

TARGET = "tests/notesCompanyProfileRemoval.browser.mjs"
MARKER = "// Opens the Notes editor the same way a user does"
PARTS = ["tests/_cp_part2.mjs", "tests/_cp_part3.mjs", "tests/_cp_part4.mjs",
         "tests/_cp_part5.mjs", "tests/_cp_part6.mjs"]

text = io.open(TARGET, encoding="utf-8").read()
idx = text.index(MARKER)
head = text[:idx].rstrip() + "\n\n"
# normalise heading line endings + drop the old trailing analyse() experiment
assert "measureHeader" not in head, "stale measureHeader still in head"

chunks = [head]
for p in PARTS:
    if not os.path.exists(p):
        print("MISSING", p)
        continue
    chunks.append(io.open(p, encoding="utf-8").read().rstrip() + "\n\n")

out = "\n".join(chunks).replace("\r\n", "\n")
io.open(TARGET, "w", encoding="utf-8", newline="\n").write(out)
print("assembled %s: %d lines" % (TARGET, out.count("\n") + 1))
