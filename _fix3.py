with open('d:/Programs EQ7/EQ/index.html', 'rb') as f:
    data = f.read()

target = b'\r\n              >\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'
replacement = b'\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'

idx = data.find(target)
if idx >= 0:
    data = data[:idx] + replacement + data[idx+len(target):]
    with open('d:/Programs EQ7/EQ/index.html', 'wb') as f:
        f.write(data)
    print('FIXED - stray > removed')
else:
    print('NOT FOUND - trying alt pattern')
    target2 = b'>\r\n            </div>\r\n          </div>\r\n<div class="full-screen-note-body">'
    idx2 = data.find(target2)
    if idx2 >= 0:
        data = data[:idx2] + data[idx2+1:]
        with open('d:/Programs EQ7/EQ/index.html', 'wb') as f:
            f.write(data)
        print('FIXED with alt pattern')
    else:
        print('Both patterns failed')
        for i in range(920, min(935, len(data.split(b'\r\n')))):
            line = data.split(b'\r\n')[i-1]
            print(f'{i}: {line[:80]}')
