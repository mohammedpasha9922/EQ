import sys

path = r'd:\Programs EQ7\EQ\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the duplicate header section (the second occurrence starting at line 934)
first_header_end = content.find('</div>\n         <div class="full-screen-note-header">')
if first_header_end == -1:
    print("Could not find first header end")
    sys.exit(1)

# The duplicate starts right after the first header's closing </div>
dup_start = first_header_end + len('</div>\n         <div class="full-screen-note-header">')

# Find where the duplicate section ends - look for the next full-screen-note-body
body_start = content.find('\n         <div class="full-screen-note-body">', dup_start)
if body_start == -1:
    print("Could not find body section start")
    sys.exit(1)

# Find the opening <div of the duplicate header
dup_header_start = content.rfind('<div class="full-screen-note-header">', dup_start - 200, dup_start)

# Remove the duplicate section (from opening <div to before the body)
new_content = content[:dup_header_start] + content[body_start:]

# Verify
count_after = new_content.count('full-screen-note-header')
print(f"Before: {content.count('full-screen-note-header')} occurrences")
print(f"After: {count_after} occurrences")
print(f"Removed {len(content) - len(new_content)} characters")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\n[OK] Duplicate header removed successfully")
