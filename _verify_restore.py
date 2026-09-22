import os, shutil, subprocess
os.chdir('D:\\Programs EQ7\\EQ')
R = []
def log(m):
    R.append(m); print(m)

CHECKS = [
    (b'pdfV1DelBtn','PDF Reports Delete btn'),
    (b'smartDocsTitle','Smart Docs title'),
    (b'pdfReportsWorkspace','PDF Reports workspace'),
    (b'smartPdfEditBtn','PDF text edit btn'),
    (b'smartBlankView','Blank doc view'),
    (b'smart-blank-toolbar','Blank toolbar'),
    (b'smartPdfAddBtn','PDF Add btn'),
    (b'smartPdfTextColorBtn','PDF Text Color'),
    (b'smartPdfStyleBtn','PDF Style btn'),
    (b'smartReviewBtn','Review btn'),
    (b'smartDraftsList','Drafts list'),
    (b'smartBlankCanvas','Blank canvas'),
    (b'primaryDisplay','Calculator'),
    (b'CurrencyService','Currency'),
    (b'numberToWords','NumberToWords'),
    (b'drawer','Drawer'),
    (b'notesWorkspace','Notes workspace'),
    (b'smartPdfPagesBtn','Pages btn'),
    (b'smartPdfPagesMenu','Pages menu'),
    (b'smartPdfMarkBtn','Mark btn'),
    (b'smartPdfSend','Send btn'),
    (b'smartToolbarSave','Save btn'),
    (b'smartEditBtn','Edit btn'),
    (b'smartAddMenu','Add menu'),
    (b'smartUndoBtn','Undo btn'),
    (b'smartRedoBtn','Redo btn'),
    (b'window.__smartImport','smartImport'),
    (b'window.__smartBlank','smartBlank'),
    (b'window.__smartReview','smartReview'),
    (b'manifest','manifest ref'),
    (b'sw.js','sw.js ref'),
]

def analyze(path, label):
    if not os.path.isfile(path):
        log(f'  {label}: MISSING ({path})'); return None
    sz = os.path.getsize(path)
    with open(path,'rb') as f: data=f.read()
    bad = data.decode('utf-8',errors='replace').count('\ufffd')
    bom = data[:3]==b'\xef\xbb\xbf'
    missing = []
    for needle, desc in CHECKS:
        if needle not in data: missing.append(desc)
    log(f'  {label}: {sz:,}B | BOM={bom} | bad={bad} | missing={len(missing)}')
    if missing:
        for m in missing[:8]: log(f'    - {m}')
    return {'size':sz,'bad':bad,'missing':missing}

log('=== PHASE 1: Snapshot Analysis ===')
log('')
for fn in ['index.html','app.js','styles.css']:
    log(f'--- {fn} ---')
    analyze(fn, 'CURRENT')
    analyze(os.path.join('_pristine',fn), '_pristine')
    analyze(os.path.join('_adbar_base',fn), '_adbar_base')
    analyze(os.path.join('_p31base',fn), '_p31base')
    for sha,lbl in [('12ef7d5','HEAD'),('c888ae3','c888ae3')]:
        try:
            r=subprocess.run(['git','show',f'{sha}:{fn}'],capture_output=True,cwd='.')
            if r.returncode==0:
                data=r.stdout; bad=data.decode('utf-8',errors='replace').count('\ufffd')
                miss=[desc for needle,desc in CHECKS if needle not in data]
                log(f'  git {lbl}: {len(data):,}B | bad={bad} | missing={len(miss)}')
                for m in miss[:4]: log(f'    - {m}')
            else: log(f'  git {lbl}: NOT FOUND')
        except Exception as e: log(f'  git {lbl}: ERR {e}')
    log('')