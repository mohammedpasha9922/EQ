import sys

PATS = [
    "COMPANY_PROFILE_KEY", "COMPANY_PREVIEW_MAXW", "loadCompanyProfile",
    "saveCompanyProfile", "companyScaleImage", "companySetPreview",
    "companyFileReadScaled", "cpSig", "cpDraft", "collectCompanyProfile",
    "openCompanyProfile", "closeCompanyProfile", "openSigCanvas",
    "companyProfileClose", "cpTextColorInput", "noteTextColorInput",
    "company-profile", "companyProfile", "company-upload", "company-field",
    "company-sig", "company-preview", "company-label",
]

for path in ["app.js", "index.html", "styles.css"]:
    lines = open(path, encoding="utf-8", errors="replace").read().split("\n")
    out = ["==== %s" % path]
    for i, l in enumerate(lines, 1):
        for p in PATS:
            if p in l:
                out.append("%d: %s" % (i, l.strip()[:190]))
                break
    with open("_map_" + path.replace(".", "_") + ".txt", "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))
    print(path, "done")