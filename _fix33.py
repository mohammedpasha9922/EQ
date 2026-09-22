#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import codecs
import sys

p = 'd:/Programs EQ7/EQ/_p33head_styles.css'
with codecs.open(p, 'r', 'utf-16') as f:
    c = f.read()

old_lines = [
    '.display-section {',
    '  position: relative;',
    '  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));',
    '  border-radius: clamp(16px, 2vw, 24px);',
    '  padding: clamp(14px, 2.5vw, 20px);',
    '  margin-bottom: 16px;',
    '}',
    '',
    '.speech-btn {',
    '  position: absolute;',
    '  top: 12px;',
    '  right: 12px;',
    '  border: none;',
    '  border-radius: 999px;',
    '  width: 42px;',
    '  height: 42px;',
    '  background: rgba(255,255,255,0.1);',
    '  color: var(--text);',
    '  cursor: pointer;',
    '}',
    '',
    "body[data-language='ar'] .speech-btn {",
    '  left: 12px;',
    '  right: auto;',
    '}',
]
old = '\r\n'.join(old_lines)

new_lines = [
    '.display-section {',
    '  position: relative;',
    '  display: flex;',
    '  justify-content: space-between;',
    '  align-items: center;',
    '  flex-wrap: wrap;',
    '  gap: 12px;',
    '  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));',
    '  border-radius: clamp(16px, 2vw, 24px);',
    '  padding: clamp(14px, 2.5vw, 20px);',
    '  margin-bottom: 16px;',
    '}',
    '',
    '.speech-btn {',
    '  flex: 0 0 auto;',
    '  margin-left: auto;',
    '  border: none;',
    '  border-radius: 999px;',
    '  width: 42px;',
    '  height: 42px;',
    '  background: rgba(255,255,255,0.1);',
    '  color: var(--text);',
    '  cursor: pointer;',
    '}',
    '',
    'html[dir="rtl"] .speech-btn {',
    '  margin-left: 0;',
    '  margin-right: auto;',
    '}',
]
new = '\r\n'.join(new_lines)

found = old in c
print(f"Found: {found}", file=sys.stderr)

if found:
    c = c.replace(old, new)
    with codecs.open(p, 'w', 'utf-16') as f:
        f.write(c)
    print("SUCCESS")
else:
    print("NOT FOUND", file=sys.stderr)
    idx = c.find('.speech-btn')
    print(f"idx={idx}", file=sys.stderr)
    print(repr(c[idx-100:idx+300]), file=sys.stderr)
