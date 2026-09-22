import sys
path = r'd:\Programs EQ7\EQ\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print('=== HTML Structure Check ===')
print(f'full-screen-note-header: {content.count("full-screen-note-header")} occurrences')
print(f'full-screen-note-title-row: {content.count("full-screen-note-title-row")} occurrences')
print(f'full-screen-note-action-bar: {content.count("full-screen-note-action-bar")} occurrences')
print(f'saved-indicator: {content.count("saved-indicator")} occurrences')
print(f'back-arrow: {content.count("back-arrow")} occurrences')
print(f'note-color-btn: {content.count("note-color-btn")} occurrences')

# Check for duplicate header
if content.count('full-screen-note-header') > 1:
    print('\n[ISSUE] Multiple header sections found!')
else:
    print('\n[OK] Single header section found')
