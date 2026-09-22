import pathlib, re
root = pathlib.Path(r"d:\Programs EQ7\EQ")
targets = ["index.html", "app.js", "styles.css"]
pats = ["openCompanyProfile", "companyProfileModal", "companyProfileSave",
"companyProfileCancel", "companyProfileClose", "collectCompanyProfile",
"saveCompanyProfileFromModal", "companySetPreview", "companyScaleImage",
"companyFileReadScaled", "COMPANY_PREVIEW_MAXW", "openSigCanvas",
"cpCompanyName", "cpLogoInput", "cpLogoBtn", "cpLogoPreview",
"cpSigCanvas", "cpStampInput", "cpFooter", "company-profile",
"companyProfile", "CompanyProfile"]
out = []
for t in targets:
    txt = (root/t).read_text(encoding="utf-8", errors="replace")
    out.append("=== "+t+" ===")
    found = []
    for p in pats:
        for m in re.finditer(re.escape(p), txt):
            s = max(0, m.start()-20)
            line = txt.count("\n", 0, m.start())+1
            found.append((line, p, txt[s:m.start()+60].replace("\n"," ")[:120]))
    if not found:
        out.append("CLEAN: no matches")
    else:
        for line, p, ctx in sorted(found)[:80]:
            out.append(f"L{line} [{p}] ...{ctx}...")
    out.append("")
# header buttons
html = (root/"index.html").read_text(encoding="utf-8", errors="replace")
m = re.search(r'<div class="full-screen-note-action-bar">(.*?)</div>', html, re.S)
out.append("=== action-bar ===")
out.append(m.group(0)[:3000] if m else "ACTION BAR NOT FOUND")
out.append("")
out.append("=== export checkbox ===")
out.append("noteExportCompany present: "+str("noteExportCompany" in html))
# action bar css
css = (root/"styles.css").read_text(encoding="utf-8", errors="replace")
i = css.find(".full-screen-note-action-bar")
out.append("")
out.append("=== action-bar CSS ===")
out.append(css[max(0,i-200):i+1200] if i>=0 else "CSS RULE NOT FOUND")
(root/"_final_audit.txt").write_text("\n".join(out), encoding="utf-8")
print("wrote _final_audit.txt, total matches check done")
