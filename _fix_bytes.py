import sys

path = 'd:/Programs EQ7/EQ/index.html'
with open(path, 'rb') as f:
    data = f.read()

# Find the specific byte sequence: > followed by CRLF then spaces then </div>
# The stray > appears after </button> and before </div>
# Pattern: </button> CR LF spaces > CR LF spaces </div>

needle = b'</button>\r\n              >\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'
idx = data.find(needle)
if idx >= 0:
    print(f'Found at byte offset: {idx}')
    print(f'Replace with: </button>\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">')
    replacement = b'</button>\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'
    data = data[:idx] + replacement + data[idx+len(needle):]
    with open(path, 'wb') as f:
        f.write(data)
    print('Fixed!')
else:
    print('Pattern not found')
    # Try to find what's actually there
    idx2 = data.find(b'openCompanyProfileBtn')
    if idx2 < 0:
        idx2 = data.find(b'sendNoteBtn')  # nearby known element
    if idx2 >= 0:
        chunk = data[idx2:idx2+600]
        print(f'Context from offset {idx2}:')
        print(repr(chunk))
