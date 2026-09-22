"""Remove the duplicate helper block (lines 112-204) from the browser test file so
the file is a single coherent script: preamble (1-111) + original runner (205+)."""
P = "tests/notesCompanyProfileRemoval.browser.mjs"
raw = open(P, "rb").read().decode("utf-8")
crlf = raw.count("\r\n")
eol = "\r\n" if crlf else "\n"
lines = raw.replace("\r\n", "\n").split("\n")
print("eol=%r total lines=%d" % (eol, len(lines)))
assert lines[111].startswith("// Opens the Notes editor the same way a user does"), lines[111]
assert lines[204].startswith("// Opens the Notes editor the same way a user does"), lines[204]
assert lines[215].strip() == "async function measureHeader() {", lines[215]
del lines[111:204]
open(P, "wb").write(eol.join(lines).encode("utf-8"))
print("removed; new line count =", len(lines))