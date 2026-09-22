#!/usr/bin/env python3
"""Remove Company Profile button from Notes Editor Header."""
with open('index.html', 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

# Find and remove the button
target = 'openCompanyProfileBtn'
idx = c.find(target)
if idx < 0:
    print('BUTTON NOT FOUND')
    exit(1)

# Find start of the comment block before the button
start = c.rfind('<!-- PART 13: Company Profile entry', 0, idx)
if start < 0:
    print('COMMENT NOT FOUND, searching wider...')
    start = c.rfind('<button', 0, idx)
else:
    # Go back to include the full comment
    pass

# Find end of button (its closing </button>)
end_tag = '</button>'
end = c.find(end_tag, idx)
if end < 0:
    print('CLOSING TAG NOT FOUND')
    exit(1)
end += len(end_tag)

# Show what we're removing
print(f'Removing {end-start} chars from position {start}')
print('---REMOVING---')
print(c[start:end])
print('---END---')

# Remove it
c = c[:start] + c[end:]

# Also remove the modal
modal_start = c.find('<!-- PART 13: Company Profile manager modal')
if modal_start >= 0:
    modal_end = c.find('</div>', c.find('companyProfileModal')) 
    # Find the actual closing div of the modal container
    modal_div_start = c.find('<div id="companyProfileModal"', modal_start)
    # Count divs to find matching close
    depth = 0
    i = modal_div_start
    while i < len(c):
        if '<div' in c[i:i+10]:
            depth += 1
        if '</div>' in c[i:i+10]:
            depth -= 1
            if depth == 0:
                modal_close = i + 6
                break
        i += 1
    
    print(f'Removing modal from {modal_start} to {modal_close}')
    print(f'Modal snippet: {c[modal_start:modal_close][:200]}...')
    c = c[:modal_start] + c[modal_close:]
    print('Modal removed')
else:
    print('Modal comment not found')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print(f'Done. New length: {len(c)}')
