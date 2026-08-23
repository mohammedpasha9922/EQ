import subprocess, sys
result = subprocess.run(['git', 'diff', '--no-color', 'HEAD', '--', sys.argv[1]], 
                        capture_output=True, text=True, encoding='utf-8', errors='replace')
lines = result.stdout.split('\n')
kws = sys.argv[2].split(',')
output = []
for i, line in enumerate(lines):
    low = line.lower()
    if any(kw.strip() in low for kw in kws):
        start = max(0, i-3)
        end = min(len(lines), i+4)
        for j in range(start, end):
            output.append(f'{j+1}: {lines[j]}')
        output.append('---')
print('\n'.join(output))
