import pathlib, re
t = pathlib.Path(r'd:\Programs EQ7\EQ\app.js').read_text(encoding='utf-8', errors='replace')
for m in re.finditer('company-profile', t):
    s = max(0, m.start()-400); e = min(len(t), m.end()+400)
    ln = t.count('\n', 0, m.start())+1
    print('LINE', ln)
    print(t[s:e])
    print('='*80)
