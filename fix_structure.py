"""
Fix the HTML structure for the two-row header layout.
"""
path = 'd:/Programs EQ7/EQ/index.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find positions
title_row_pos = content.find('<div class="full-screen-note-title-row">')
action_bar_pos = content.find('<div class="full-screen-note-action-bar">')
action_bar_close = content.find('</div>', action_bar_pos) + 6  # include </div>
old_header_pos = content.find('<div class="full-screen-note-header">', title_row_pos + 100)
body_pos = content.find('<div class="full-screen-note-body">', old_header_pos)

print(f"title_row: {title_row_pos}")
print(f"action_bar: {action_bar_pos}")
print(f"action_bar_close: {action_bar_close}")
print(f"old_header: {old_header_pos}")
print(f"body: {body_pos}")

# Extract the new structure content (title-row + action-bar)
new_inner = content[title_row_pos:action_bar_close]

# Build the fixed content:
# 1. Everything before title-row
# 2. Opening full-screen-note-header div
# 3. New inner content (title-row + action-bar) 
# 4. Closing full-screen-note-header div
# 5. Body and everything after (skip old header)

fixed = (
    content[:title_row_pos] +
    '         <div class="full-screen-note-header">\n' +
    new_inner +
    '\n         </div>\n' +
    content[body_pos:]
)

print(f"\nRemoved {len(content) - len(fixed)} characters")

with open(path, 'w', encoding='utf-8') as f:
    f.write(fixed)

# Verify
with open(path, 'r', encoding='utf-8') as f:
    final = f.read()

print(f"\n=== FINAL ===")
print(f"File size: {len(final)} bytes")
print(f"full-screen-note-header: {final.count('full-screen-note-header')}")
print(f"full-screen-note-title-row: {final.count('full-screen-note-title-row')}")
print(f"full-screen-note-action-bar: {final.count('full-screen-note-action-bar')}")
print(f"note-saved-indicator: {final.count('note-saved-indicator')}")
print(f"noteTitleInput: {final.count('noteTitleInput')}")
print(f"closeFullScreenNote: {final.count('closeFullScreenNote')}")
print(f"saveFullScreenNote: {final.count('saveFullScreenNote')}")
print(f"sendNoteBtn: {final.count('sendNoteBtn')}")
print(f"notePreviewPdfBtn: {final.count('notePreviewPdfBtn')}")
print(f"exportNotePdfBtn: {final.count('exportNotePdfBtn')}")
print(f"openCompanyProfileBtn: {final.count('openCompanyProfileBtn')}")
