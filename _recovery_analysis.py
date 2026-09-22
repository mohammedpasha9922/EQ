#!/usr/bin/env python3
"""
Step 1: Backup current state
Step 2: Analyze recovery sources (reflog, pristine, backups)
Step 3: Report findings
"""
import os, subprocess, shutil, glob, json, re
from datetime import datetime

os.chdir('D:\\Programs EQ7\\EQ')

# --- STEP 1: Backup ---
ts = datetime.now().strftime('%Y%m%d_%H%M%S')
dest = os.path.join('C:\\', f'EQ_RECOVERY_{ts}')
os.makedirs(dest, exist_ok=True)
skipped_dirs = {'node_modules', '__notes_test', '__pdfdiag', '.git', '.venv', 'tests'}
total = 0
for root, dirs, files in os.walk('.', topdown=True):
    dirs[:] = [d for d in dirs if d not in skipped_dirs]
    parts = root.replace('\\', '/').split('/')
    if any(s in parts for s in skipped_dirs):
        continue
    if '.git' in parts or '.venv' in parts:
        continue
    for fn in files:
        src = os.path.join(root, fn)
        rel = os.path.relpath(src, '.')
        dst = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            shutil.copy2(src, dst)
            total += 1
        except Exception as e:
            print(f"SKIP: {src} -> {e}")
print(f"\n[STEP1] Backup: {total} files -> {dest}\n")

# --- STEP 2: Reflog ---
reflog = subprocess.check_output(
    ['git', 'reflog', '--all', '--format=%h %gs'],
    stderr=subprocess.STDOUT, cwd='.'
).decode('utf-8', errors='replace')
lines = [l for l in reflog.strip().split('\n') if l]
print("[STEP2] Git reflog (all branches, last 20):")
for l in lines[:20]:
    print(f"  {l}")

# --- STEP 3: key file snapshots ---
print("\n[STEP3] Backup files found (index.html, app.js, styles.css, numberToWords.js):")
def find_files(basename):
    hits = []
    for pat in [f'**/{basename}', f'**/{basename}.bak', f'**/{basename}.orig',
                f'**/{basename}.backup', f'**/{basename}.orig.html',
                f'**/{basename}.full', f'**/{basename}_full',
                f'**/backup/{basename}']:
        for f in glob.glob(pat, recursive=True):
            if os.path.isfile(f) and os.path.getsize(f) > 100:
                hits.append(f)
    return hits

for bn in ['index.html', 'app.js', 'styles.css', 'numberToWords.js']:
    hits = find_files(bn)
    print(f"\n  {bn}: {len(hits)} snapshot(s)")
    for h in sorted(hits)[:10]:
        sz = os.path.getsize(h)
        print(f"    {h}  ({sz:,} bytes)")

# --- STEP 4: _pristine directory ---
print("\n[STEP4] _pristine directory:")
if os.path.isdir('_pristine'):
    for root, dirs, files in os.walk('_pristine'):
        for f in files:
            fp = os.path.join(root, f)
            print(f"  {fp}  ({os.path.getsize(fp):,} bytes)")
else:
    print("  _pristine does NOT exist")

# --- STEP 5: adbar_base copies ---
print("\n[STEP5] _adbar_base copies:")
for bn in ['index.html', 'app.js', 'styles.css']:
    for base in ['_adbar_base', '_pristine', '_p31base', '_chk_app']:
        fp = os.path.join(base, bn) if os.path.isdir(base) else None
        if fp and os.path.isfile(fp):
            print(f"  {fp}  ({os.path.getsize(fp):,} bytes)")

# --- STEP 6: .bak files ---
print("\n[STEP6] .bak files:")
for pat in ['**/*.bak', '**/*.orig', '**/*.backup']:
    hits = glob.glob(pat, recursive=True)
    if hits:
        for h in sorted(hits)[:15]:
            print(f"  {h}  ({os.path.getsize(h):,} bytes)")

# --- STEP 7: Current state of key files ---
print("\n[STEP7] Current indexed files vs HEAD:")
def show_corruption(fn, label):
    try:
        with open(fn, 'rb') as fh:
            data = fh.read()
        text = data.decode('utf-8', errors='replace')
        bad = sum(1 for c in text if c == '\ufffd')
        print(f"\n  {label} ({os.path.getsize(fn):,} bytes, {bad} replacement chars):")
        # Show first and last 3 lines with replacement chars
        lines = text.split('\n')
        bad_lines = [(i+1, l[:100]) for i, l in enumerate(lines) if '\ufffd' in l]
        if bad_lines:
            print(f"    {len(bad_lines)} lines with replacement chars:")
            for n, l in bad_lines[:5]:
                print(f"      L{n}: {l}")
        else:
            print("    No replacement chars found.")
    except Exception as e:
        print(f"  {label}: ERROR {e}")

for fn, label in [('index.html', 'index.html'),
                   ('app.js', 'app.js'),
                   ('styles.css', 'styles.css')]:
    show_corruption(fn, label)

print("\n[DONE]")
