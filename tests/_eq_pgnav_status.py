import io
import os, json

# 1) index.html: does smartPdfPageCount still exist?
p = 'd:/Programs EQ7/EQ/index.html'
t = io.open(p, encoding='utf-8').read()
lines = t.splitlines()
idx = None
for i, ln in enumerate(lines):
    if 'smartPdfPageCount' in ln:
        idx = i
        break
print('HTML smartPdfPageCount present:', idx is not None)
if idx is not None:
    print('  at line', idx + 1, repr(lines[idx]))
print('  total lines:', len(lines), 'bytes:', len(t))

# 2) package.json type
pkg_path = 'd:/Programs EQ7/EQ/package.json'
pkg = json.load(io.open(pkg_path, encoding='utf-8'))
print('package.json "type":', pkg.get('type'))

# 3) app.js syntax via node (with correct module handling)
app_path = 'd:/Programs EQ7/EQ/app.js'
print('app.js exists:', os.path.exists(app_path), 'bytes:', os.path.getsize(app_path))
