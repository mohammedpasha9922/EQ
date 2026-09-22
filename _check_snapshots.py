import os, sys

# Key files to find
KEY_FILES = ['index.html','app.js','styles.css','numberToWords.js','manifest.json','sw.js']
# Exclude these dirs from walk
EXCLUDE = {'node_modules','__notes_test','__pdfdiag','.git','.venv','tests'}

results = {}

# 1. Check known snapshot locations
snapshot_locs = ['.', '_pristine', '_adbar_base', '_p31base', '_chk_app']
for loc in snapshot_locs:
    if not os.path.exists(loc):
        continue
    for fn in KEY_FILES:
        fp = os.path.join(loc, fn)
        if os.path.isfile(fp):
            sz = os.path.getsize(fp)
            with open(fp, 'rb') as fh:
                raw = fh.read()
            has_bom = raw[:3] == b'\xef\xbb\xbf'
            bad = raw.decode('utf-8', errors='replace').count('\ufffd')
            results[f"{loc}/{fn}"] = {'size': sz, 'bom': has_bom, 'bad': bad}

# 2. Walk for .bak/.orig/.backup files
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    parts = root.replace('\\', '/').split('/')
    if any(s in parts for s in EXCLUDE):
        dirs[:] = []
        continue
    for fn in files:
        if fn.endswith(('.bak', '.orig', '.backup')):
            fp = os.path.join(root, fn)
            sz = os.path.getsize(fp)
            with open(fp, 'rb') as fh:
                raw = fh.read()
            bad = raw.decode('utf-8', errors='replace').count('\ufffd')
            results[fp] = {'size': sz, 'bad': bad}

# 3. Current state of working files
for fn in ['index.html', 'app.js', 'styles.css']:
    with open(fn, 'rb') as fh:
        raw = fh.read()
    bad = raw.decode('utf-8', errors='replace').count('\ufffd')
    has_bom = raw[:3] == b'\xef\xbb\xbf'
    results[fn] = {'size': len(raw), 'bom': has_bom, 'bad': bad}

print("=== BACKUP/SNAPSHOT ANALYSIS ===")
print()
for fn in ['index.html', 'app.js', 'styles.css', 'numberToWords.js', 'manifest.json', 'sw.js']:
    print(f"--- {fn} ---")
    found = False
    for path, info in sorted(results.items()):
        if path.endswith(fn) or path == fn:
            print(f"  {path}")
            print(f"    size: {info['size']:,} bytes")
            if 'bom' in info:
                print(f"    BOM: {info['bom']}")
            print(f"    replacement_chars: {info['bad']}")
            found = True
    if not found:
        print("  NOT FOUND")
    print()

print("=== CURRENT WORKING FILES ===")
for fn in ['index.html', 'app.js', 'styles.css']:
    info = results.get(fn, {})
    print(f"  {fn}: {info.get('size', '?'):,} bytes, bad_chars={info.get('bad', '?')}")
