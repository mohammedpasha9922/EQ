import re
out=[]
# i18n keys with company
for f in ['app.js','index.html']:
    txt=open(f,encoding='utf-8',errors='ignore').read()
    for m in set(re.findall(r'[A-Za-z]*[Cc]ompany[A-Za-z]*',txt)):
        c=len(re.findall(re.escape(m),txt))
        out.append("%s %s x%d"%(f,m,c))
out.append('---noteExportCompany---')
for f in ['index.html','app.js']:
    lines=open(f,encoding='utf-8',errors='ignore').read().splitlines()
    for i,l in enumerate(lines,1):
        if 'noteExportCompany' in l:
            out.append("%s:%d:%s"%(f,i,l.strip()[:220]))
open('_audit2.txt','w',encoding='utf-8').write("\n".join(out))
