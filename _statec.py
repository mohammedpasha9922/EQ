import subprocess, pathlib
R = pathlib.Path(r"d:\Programs EQ7\EQ")
def sh(*a):
    p = subprocess.run(list(a), cwd=R, capture_output=True, text=True)
    return p.stdout.strip() + ("\nERR:" + p.stderr.strip() if p.stderr.strip() else "")
out = []
out.append("=== status ===")
out.append(sh("git", "--no-pager", "status", "--short") or "(clean)")
out.append("=== diff HEAD stat ===")
out.append(sh("git", "--no-pager", "diff", "HEAD", "--stat") or "(no diff)")
out.append("=== HEAD has openCompanyProfileBtn? ===")
p = subprocess.run(["git", "--no-pager", "show", "HEAD:index.html"], cwd=R, capture_output=True)
out.append("HEAD:index.html bytes=%d contains_btn=%s contains_modal=%s" % (
    len(p.stdout), b"openCompanyProfileBtn" in p.stdout, b"companyProfileModal" in p.stdout))
wt = (R / "index.html").read_bytes()
out.append("WORKTREE index.html contains_btn=%s contains_modal=%s" % (
    b"openCompanyProfileBtn" in wt, b"companyProfileModal" in wt))
aj = (R / "app.js").read_bytes()
for tok in [b"openCompanyProfile", b"companyProfileModal", b"COMPANY_PROFILE_KEY",
            b"loadCompanyProfile", b"saveCompanyProfile", b"noteExportCompany",
            b"companyProfileSave", b"cpDraft"]:
    out.append("app.js %-22s worktree_n=%d" % (tok.decode(), aj.count(tok)))
p2 = subprocess.run(["git", "--no-pager", "show", "HEAD:app.js"], cwd=R, capture_output=True)
for tok in [b"openCompanyProfile", b"companyProfileModal", b"noteExportCompany"]:
    out.append("HEAD:app.js %-18s n=%d" % (tok.decode(), p2.stdout.count(tok)))
(R / "_state_check.txt").write_text("\n".join(out), encoding="utf-8")
print("wrote _state_check.txt")
