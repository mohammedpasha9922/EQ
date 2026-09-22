#!/usr/bin/env python3
"""Fix stray > in index.html."""
import sys

path = 'd:/Programs EQ7/EQ/index.html'
with open(path, 'rb') as f:
    data = f.read()

# Find the stray > pattern
old = b'\r\n              >\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'
new = b'\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'

idx = data.find(old)
if idx >= 0:
    data = data[:idx] + new + data[idx+len(old):]
    with open(path, 'wb') as f:
        f.write(data)
    print(f'Fixed stray > at offset {idx}')
    print(f'New size: {len(data)}')
else:
    print('Pattern not found. Trying variations...')
    # Try to find lines 929 area
    lines = data.split(b'\r\n')
    for i in range(920, 935):
        if i < len(lines):
            print(f'{i+1}: {repr(lines[i])}')
