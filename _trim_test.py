from __future__ import annotations
import io
import sys

P = "tests/notesCompanyProfileRemoval.browser.mjs"
raw = open(P, encoding="utf-8").read()
lines = raw.split("\n")
print("before:", len(lines), "lines")

# sanity: the duplicated block we are removing (v1 helpers) and the block we keep (v2)
assert lines[112].strip().startswith("// Opens the Notes editor"), repr(lines[112])
assert lines[190].strip() == "}", repr(lines[190])         # v1 analyse() closes at line 191
assert lines[191].strip().startswith("// Opens the Notes editor"), repr(lines[191])
assert "savedIndicator" in raw, "kept v2 measureHeader must expose savedIndicator"

del lines[112:191]                                         # drop v1 copy (lines 113..191)
open(P, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("after:", len(lines), "lines")
print("kept-block anchor now at line 113:", lines[112].strip()[:60])