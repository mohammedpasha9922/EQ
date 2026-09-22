import re

html = open("index.html", encoding="utf-8", errors="replace").read()
lines = html.replace("\r\n", "\n").split("\n")
out = []
for pat in [r'id="fullScreenNote[A-Za-z]*"', r'id="noteSavedIndicator"', r'id="notesManagerModal"',
            r'id="openNewNoteButton"', r'data-action="open-notes"', r'id="noteExportCompany"',
            r'id="noteExportPdfModal"', r'full-screen-note-action-bar', r'full-screen-note-title-row',
            r'note-format-toolbar', r'class="full-screen-note[ "]', r'id="noteExportPdfBtn"']:
    found = [(i + 1, lines[i].strip()[:150]) for i in range(len(lines)) if re.search(pat, lines[i])]
    out.append("PATTERN %s -> %d hits" % (pat, len(found)))
    for ln, t in found[:6]:
        out.append("   %d| %s" % (ln, t))

# list every id starting with fullScreenNote / note
ids = re.findall(r'id="([^"]+)"', html)
out.append("fullScreen* ids: %s" % sorted({i for i in ids if i.lower().startswith("fullscreen")}))
out.append("note* ids: %s" % sorted({i for i in ids if i.lower().startswith("note")})[:0] or "")
out.append("note* ids count: %d" % len({i for i in ids if i.lower().startswith("note")}))
open("_ids.txt", "w", encoding="utf-8").write("\n".join(out))
print("ok")