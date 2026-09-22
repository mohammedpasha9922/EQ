path = 'd:/Programs EQ7/EQ/index.html'
with open(path, 'rb') as f:
    data = f.read()

# Find all occurrences of stray > pattern
needle = b'\r\n              >\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'
idx = data.find(needle)
print(f'Pattern found at offset: {idx}')

if idx >= 0:
    replacement = b'\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'
    data = data[:idx] + replacement + data[idx+len(needle):]
    with open(path, 'wb') as f:
        f.write(data)
    print('Fixed stray > character')
else:
    # Find byte pattern differently
    for i in range(len(data)-50):
        if data[i:i+1] == b'>' and data[i+1:i+3] == b'\r\n' and data[i+3:i+15] == b'              ':
            # Check if followed by </div>
            if data[i+15:i+22] == b'</div>':
                print(f'Found at offset {i}: {repr(data[i-20:i+30])}')
                data = data[:i] + data[i+1:]  # Remove the >
                with open(path, 'wb') as f:
                    f.write(data)
                print('Fixed!')
                break
    else:
        print('Pattern not found, dumping context around line 929')
        lines = data.split(b'\r\n')
        for i, line in enumerate(lines[923:935], start=924):
            print(f'{i}: {repr(line)}')
