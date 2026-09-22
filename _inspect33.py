import codecs
import sys

p = 'd:/Programs EQ7/EQ/_p33head_styles.css'
with codecs.open(p, 'r', 'utf-16') as f:
    c = f.read()

idx_ds = c.find('.display-section {')
idx_sb = c.find('.speech-btn {')
idx_ar = c.find("body[data-language='ar'] .speech-btn")

print(f"ds={idx_ds} sb={idx_sb} ar={idx_ar}", file=sys.stderr)
print(repr(c[idx_ds-20:idx_ar+200]), file=sys.stderr)
