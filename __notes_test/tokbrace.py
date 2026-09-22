# -*- coding: utf-8 -*-
# Tokenizer-aware brace depth checker
import io, re
s = io.open('app.js', encoding='utf-8').read()
i = 0
n = len(s)
depth = 0
line = 1
events = []
def newline_segment(txt):
    return txt.count('\n')
while i < n:
    c = s[i]
    if c == '\n':
        line += 1; i += 1; continue
    # comments
    if c == '/' and i+1 < n and s[i+1] == '/':
        j = s.find('\n', i)
        if j == -1: break
        i = j; continue
    if c == '/' and i+1 < n and s[i+1] == '*':
        j = s.find('*/', i)
        if j == -1: break
        segment = s[i:j+2]; line += newline_segment(segment); i = j+2; continue
    # strings
    if c in ('"', "'", '`'):
        q = c
        j = i+1
        while j < n:
            e = s[j]
            if e == '\\':
                j += 2; continue
            if e == q:
                break
            if e == '\n' and q != '`':
                break
            j += 1
        # handle template literal interpolation { by counting too
        seg = s[i:j+1]
        if q == '`':
            # ignore ${ ... } (balanced)
            pass
        line += newline_segment(seg)
        i = j+1
        continue
    if c == '{':
        depth += 1
        events.append((line, depth, 'OPEN', s[max(0,i-30):i+1].rfind('\n')))
        i += 1; continue
    if c == '}':
        depth -= 1
        events.append((line, depth, 'CLOSE', ''))
        if depth < 0:
            print('NEGATIVE at line', line); break
        i += 1; continue
    i += 1
print('final depth =', depth, 'at line', line)
# print event list from line 17200
for ln, d, k, sp in events:
    if ln >= 17150:
        print(ln, d, k)