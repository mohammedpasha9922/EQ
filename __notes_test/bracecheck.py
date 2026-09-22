# brace trace - output ascii to file
import io
s = io.open('app.js', encoding='utf-8').read()
lines = s.split('\n')
depth = 0
recs = []
for i, l in enumerate(lines):
    net = l.count('{') - l.count('}')
    depth += net
    recs.append((i + 1, depth, net, l.strip()[:50].replace('{', '<').replace('}', '>')))
with io.open('__notes_test/_depth.txt', 'w', encoding='ascii', errors='replace') as f:
    for r in recs:
        if r[2] != 0 or 17200 <= r[0] <= 18600:
            f.write('%d depth=%d net=%d %s\n' % r)
print('final depth =', depth)