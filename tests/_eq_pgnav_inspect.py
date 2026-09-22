import io

# 1) index.html — is smartPdfPageCount still present?
p = 'd:/Programs EQ7/EQ/index.html'
t = io.open(p, encoding='utf-8').read().splitlines()
hits = [(i+1, ln) for i, ln in enumerate(t) if 'smartPdfPageCount' in ln]
print('index.html smartPdfPageCount lines:', hits)

# 2) app.js — where does smartPdfSyncCount / smartPdfPageCount appear?
p2 = 'd:/Programs EQ7/EQ/app.js'
t2 = io.open(p2, encoding='utf-8').read().splitlines()
for i, ln in enumerate(t2):
    if 'smartPdfSyncCount' in ln or 'smartPdfPageCount' in ln:
        print('app.js', i+1, repr(ln))
