with open('d:/Programs EQ7/EQ/index.html', 'rb') as f:
    data = f.read()

# Split into lines, find and remove the stray > line
lines = data.split(b'\r\n')
print('Total lines:', len(lines))
print('Line 929:', repr(lines[928]) if len(lines) > 928 else 'N/A')
print('Line 930:', repr(lines[929]) if len(lines) > 929 else 'N/A')

# Remove line 929 (the stray >) if it matches
if len(lines) > 928 and lines[928].strip() == b'>':
    del lines[928]
    data = b'\r\n'.join(lines)
    with open('d:/Programs EQ7/EQ/index.html', 'wb') as f:
        f.write(data)
    print('FIXED - removed stray > line')
    print('New total lines:', len(lines))
    if len(lines) > 927:
        print('New line 928:', repr(lines[927]))
        print('New line 929:', repr(lines[928]))
else:
    print('Line 929 does not match stray >')
    # Show what lines 925-935 look like
    for i in range(925, min(936, len(lines))):
        print(f'{i+1}: {repr(lines[i])}')
