import io, sys
p = 'd:/Programs EQ7/EQ/index.html'
t = io.open(p, encoding='utf-8').read().splitlines()
hits = [(i+1, ln) for i, ln in enumerate(t) if 'smartPdfPageCount' in ln]
print('smartPdfPageCount lines:', hits)
print('--- context 1313..1320 ---')
for i in range(1312, 1320):
    print(i+1, repr(t[i]))
