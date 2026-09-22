import re

lines = open("app.js", encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")
html = open("index.html", encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")
out = []


def find(hay, stack, label, rx, limit=12):
    out.append("----- %s" % label)
    n = 0
    for i, l in enumerate(hay, 1):
        if re.search(rx, l):
            out.append("%d| %s" % (i, l.strip()[:170]))
            n += 1
            if n >= limit:
                break
    if n == 0:
        out.append("(none)")


find(lines, None, "function sendCurrentNote", r"function sendCurrentNote")
find(lines, None, "sendCurrentNote body", r"noteSendModal|sendNoteDialog|shareNote")
find(lines, None, "openFullScreenNote def", r"function openFullScreenNote")
find(lines, None, "closeFullScreenNote def", r"function closeFullScreenNote")
find(lines, None, "noteSavedIndicator", r"noteSavedIndicator")
find(lines, None, "saveCurrentOpenNote def", r"function saveCurrentOpenNote")
find(line := lines, None, "toast element id", r"getElementById\('toast'\)|showToast = |function showToast")
find(html, None, "ids in notes editor html", r'id="(fullScreenNoteModal|noteSavedIndicator|noteTitleInput|saveFullScreenNote|sendNoteBtn|notePreviewPdfBtn|exportNotePdfBtn|closeFullScreenNote|openNewNoteButton|noteExportCompany|noteExportPdfModal|notePdfPreviewModal|notesManagerModal)"')
find(html, None, "toolbar class", r'class="[^"]*note-format-toolbar[^"]*"|class="[^"]*toolbar[^"]*"')
find(html, None, "full-screen-note wrapper", r'id="fullScreenNoteModal"')

open("_sel.txt", "w", encoding="utf-8").write("\n".join(out))
print("written")