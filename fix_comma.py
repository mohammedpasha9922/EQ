with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix missing comma after Turkish drawerTitle: 'EQ'
js = js.replace("    drawerTitle: 'EQ'\n    drawerHistory:", "    drawerTitle: 'EQ',\n    drawerHistory:")

with open('app_fixed.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('fixed')
