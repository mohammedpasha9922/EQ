import sys

path = r'd:\Programs EQ7\EQ\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the duplicate header section (the second occurrence)
first_header = content.find('<div class="full-screen-note-header">')
second_header = content.find('<div class="full-screen-note-header">', first_header + 1)

if second_header == -1:
    print("No duplicate header found - already clean!")
    sys.exit(0)

print(f"First header at: {first_header}")
print(f"Second header at: {second_header}")

# Find where the duplicate header section ends
# Look for </div> followed by full-screen-note-body
body_marker = '\n         <div class="full-screen-note-body">'
body_pos = content.find(body_marker, second_header)
if body_pos == -1:
    print("Could not find body marker after duplicate header")
    sys.exit(1)

print(f"Body marker at: {body_pos}")

# Find the closing </div> of the duplicate header (the one before body)
# We need to find the </div> that closes the duplicate header div
# The pattern is: ... buttons ... </div>\n         <div class="full-screen-note-body">
end_of_dup = body_pos
print(f"Removing from index {second_header} to {end_of_dup}")

# Find the opening tag of the duplicate header
dup_open = content.rfind('<div class="full-screen-note-header">', 0, second_header + 50)
print(f"Duplicate header opens at: {dup_open}")

# Remove the duplicate section
new_content = content[:dup_open] + content[body_pos:]

count_after = new_content.count('full-screen-note-header')
print(f"\nBefore: {content.count('full-screen-note-header')} header occurrences")
print(f"After: {count_after} header occurrences")
print(f"Removed {len(content) - len(new_content)} characters")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("\n[OK] Duplicate header section removed successfully")
