import re

with open('index.html', 'rb') as f:
    html = f.read().decode('utf-8', errors='replace')

# Smart Documents PDF toolbar section
s = html.find('id="smartPdfToolbar"')
if s >= 0:
    e = html.find('</div>', s)
    section = html[s:e+6]
    print('=== smartPdfToolbar section ===')
    print(section)
    print()
    ids = re.findall(r'id="([^"]+)"', section)
    print('IDs found:', ids)
    print()
    btns = re.findall(r'<button[^>]*>([^<]*)</button>', section)
    print('Button texts:', btns)
    print()
    has_delete = any('delete' in b.lower() or 'del' in b.lower() for b in btns + ids)
    print(f'Has Delete: {has_delete}')
else:
    print('smartPdfToolbar NOT FOUND')
