import sys
sys.path.insert(0, 'd:/Programs EQ7/EQ')

# Read file as bytes to avoid encoding issues
with open('d:/Programs EQ7/EQ/index.html', 'rb') as f:
    data = f.read()

needle = b'openCompanyProfileBtn'
idx = data.find(needle)
print(f'Found at byte: {idx}')

if idx > 0:
    # Show surrounding bytes using repr
    chunk = data[idx-200:idx+400]
    print('Chunk repr length:', len(chunk))
    # Print first 500 chars as string
    try:
        print('CONTEXT:')
        text = chunk.decode('utf-8', errors='replace')
        for i, line in enumerate(text.split('\n')[:15]):
            print(f'  {i}: {line}')
    except:
        print('Could not decode')
