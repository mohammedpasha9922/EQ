import sys

path = r'd:\Programs EQ7\EQ\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the full-screen-note-header block
marker = 'full-screen-note-header'
idx = content.find(marker)
print(f'Found at index: {idx}')

# Show surrounding context
start_ctx = max(0, idx - 20)
end_ctx = min(len(content), idx + 200)
print('Context around marker:')
print(repr(content[start_ctx:end_ctx]))
