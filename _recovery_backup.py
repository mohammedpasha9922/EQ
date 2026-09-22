#!/usr/bin/env python3
"""
Step 1: Create a FULL backup of the project outside Git.
Copies everything except node_modules and __notes_test to C:\EQ_RECOVERY_TS
"""
import os
import shutil
from datetime import datetime

ts = datetime.now().strftime('%Y%m%d_%H%M%S')
dest = os.path.join('C:\\', f'EQ_RECOVERY_{ts}')
skipped = {'node_modules', '__notes_test', '__pdfdiag'}

print(f"Backup destination: {dest}")
os.makedirs(dest, exist_ok=True)
count = 0
for root, dirs, files in os.walk('.', topdown=True):
    # Skip unwanted dirs
    dirs[:] = [d for d in dirs if d not in skipped]
    if any(skip in root.split(os.sep) for skip in skipped):
        dirs[:] = []
        continue
    for fn in files:
        src = os.path.join(root, fn)
        rel = os.path.relpath(src, '.')
        dst = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(dst) if os.path.dirname(dst) else dest, exist_ok=True)
        shutil.copy2(src, dst)
        count += 1

print(f"Done. Copied {count} files to: {dest}")
