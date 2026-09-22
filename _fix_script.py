#!/usr/bin/env python3
"""Fix the Notes Header Layout - Two-Row Header structure."""
import sys

path = r'd:\Programs EQ7\EQ\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'File length: {len(content)} chars')
print(f'Line ending type: {"CRLF" if "\\r\\n" in content else "LF"}')

# Find the full-screen-note-header block
marker = 'full-screen-note-header'
idx = content.find(marker)
print(f'Found "{marker}" at index: {idx}')

# Show surrounding context (first 500 chars of the block)
start_ctx = max(0, idx - 20)
end_ctx = min(len(content), idx + 500)
print('\nContext around marker:')
print(repr(content[start_ctx:end_ctx]))
