#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix duplicate header in index.html"""

path = r'd:\Programs EQ7\EQ\index.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')
print(f'full-screen-note-header count: {content.count("full-screen-note-header")}')
print(f'full-screen-note-title-row count: {content.count("full-screen-note-title-row")}')
print(f'full-screen-note-action-bar count: {content.count("full-screen-note-action-bar")}')
print(f'note-saved-indicator count: {content.count("note-saved-indicator")}')

# Find duplicate sections
first_header = content.find('full-screen-note-header')
second_header = content.find('full-screen-note-header', first_header + 10)

if second_header == -1:
    print('\n[OK] No duplicate header found!')
else:
    print(f'\nFirst header at: {first_header}')
    print(f'Second header at: {second_header}')
    
    # Find body after second header
    body_pos = content.find('full-screen-note-body', second_header)
    print(f'Body at: {body_pos}')
    
    # Find opening <div of duplicate header
    dup_open = content.rfind('<div class="full-screen-note-header">', 0, second_header + 50)
    print(f'Duplicate opens at: {dup_open}')
    
    # Remove duplicate section
    new_content = content[:dup_open] + content[body_pos:]
    
    print(f'Removed {len(content) - len(new_content)} characters')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f'\n[OK] Fixed! Headers now: {new_content.count("full-screen-note-header")}')

# Final verification
with open(path, 'r', encoding='utf-8') as f:
    final = f.read()

print('\n=== FINAL VERIFICATION ===')
print(f'File size: {len(final)} bytes')
print(f'full-screen-note-header: {final.count("full-screen-note-header")}')
print(f'full-screen-note-title-row: {final.count("full-screen-note-title-row")}')
print(f'full-screen-note-action-bar: {final.count("full-screen-note-action-bar")}')
print(f'note-saved-indicator: {final.count("note-saved-indicator")}')
print(f'noteTitleInput: {final.count("noteTitleInput")}')
print(f'closeFullScreenNote: {final.count("closeFullScreenNote")}')
print(f'saveFullScreenNote: {final.count("saveFullScreenNote")}')
print(f'sendNoteBtn: {final.count("sendNoteBtn")}')
print(f'notePreviewPdfBtn: {final.count("notePreviewPdfBtn")}')
print(f'exportNotePdfBtn: {final.count("exportNotePdfBtn")}')
print(f'openCompanyProfileBtn: {final.count("openCompanyProfileBtn")}')
