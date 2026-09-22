import re

with open('index.html', 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

# Remove the openCompanyProfileBtn button
btn_pat = re.compile(
    r'\s*<!-- PART 13: Company Profile entry.*?-->\s*'
    r'<button id="openCompanyProfileBtn"[^>]*>.*?</button>',
    re.DOTALL
)
html, n1 = btn_pat.subn('', html, count=1)
print(f'Button removed: {n1}')

# Remove the Company Profile modal
modal_pat = re.compile(
    r'\s*<!-- PART 13: Company Profile manager modal\.[^>]*?-->\s*'
    r'<div id="companyProfileModal"[^>]*>.*?</div>\s*',
    re.DOTALL
)
html, n2 = modal_pat.subn('', html, count=1)
print(f'Modal removed: {n2}')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('index.html updated.')
