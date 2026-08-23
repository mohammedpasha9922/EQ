import subprocess, sys, codecs

result = subprocess.run(['git', 'diff', '--no-color', 'HEAD', '--', sys.argv[1]], 
                        capture_output=True, encoding='utf-8', errors='replace')
# Filter out null bytes and weird encoding
clean = result.stdout
# Remove null bytes
clean = clean.replace('\x00', '')
# Filter lines matching keywords
lines = clean.split('\n')
kws = sys.argv[2].split(',')
output = []
for i, line in enumerate(lines):
    low = line.lower()
    if any(kw.strip() in low for kw in kws):
        start = max(0, i-3)
        end = min(len(lines), i+4)
        for j in range(start, end):
            output.append(f'{j+1}: {lines[j][:300]}')
        output.append('---')
with open('diff_clean.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output))
print(f'Written {len(output)} lines to diff_clean.txt')
