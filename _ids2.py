import re

ids = ["noteBodyInput", "noteTitleInput", "notesManagerModal", "fullScreenNoteModal",
       "openNewNoteButton", "closeFullScreenNote", "saveFullScreenNote", "sendNoteBtn",
       "notePreviewPdfBtn", "exportNotePdfBtn", "noteExportCompany", "noteExportPdfClose",
       "notePdfPreviewClose", "noteSavedIndicator", "notePdfPreviewStage",
       "primaryDisplay", "noteTextColorInput", "languageSelect"]
html = open("index.html", encoding="utf-8").read()
out = ["--- id presence in index.html"]
for i in ids:
    out.append("%-24s %d" % (i, len(re.findall(r'id="%s"' % re.escape(i), html))))

mb = re.search(r'full-screen-note-action-bar(.*?)(?:note-format-toolbar)', html, re.S)
out.append("--- action bar region")
if mb:
    out.append(re.sub(r"\s+", " ", mb.group(1))[:2200])
    out.append("--- action bar button ids: %s" %
               ",".join(re.findall(r'<button[^>]*id="([^"]+)"', mb.group(1))))
else:
    out.append("action bar region NOT MATCHED")

mt = re.search(r'full-screen-note-title-row(.*?)full-screen-note-action-bar', html, re.S)
out.append("--- title row region")
if mt:
    out.append(re.sub(r"\s+", " ", mt.group(1))[:1400])
    out.append("--- title row button ids: %s" %
               ",".join(re.findall(r'<button[^>]*id="([^"]+)"', mt.group(1))))

open("_ids2.txt", "w", encoding="utf-8").write("\n".join(out))
print("written _ids2.txt")