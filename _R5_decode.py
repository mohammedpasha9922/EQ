# Decode the UTF-16 analysis reports written by the earlier recovery session into UTF-8.
import os
CWD = r"D:\Programs EQ7\EQ"
names = ["_vr_out.txt", "_recovery_report.txt", "_snapshot_report.txt", "_R_reflog.txt",
         "_R_log.txt", "_R_status.txt", "_R_backups.txt", "_R_snapdirs.txt",
         "_R_recent_files.txt", "_R_cdrive.txt", "_R_ddrive.txt", "_R_dirs.txt",
         "_R_extdirs.txt"]
out = []
for n in names:
    fp = os.path.join(CWD, n)
    if not os.path.isfile(fp):
        out.append("### %s : <missing>" % n)
        continue
    raw = open(fp, "rb").read()
    txt = None
    for enc in ("utf-16", "utf-8-sig", "utf-8"):
        try:
            cand = raw.decode(enc)
            if enc == "utf-16" and "\x00" in cand:
                continue
            txt = cand
            break
        except Exception:
            continue
    out.append("### %s (decoded as %s, %d bytes)" % (n, enc, len(raw)))
    out.append(txt if txt else "[decode failed]")
    out.append("")
open(os.path.join(CWD, "_R5_decoded.txt"), "w", encoding="utf-8").write("\n".join(out))
print("WROTE _R5_decoded.txt")
