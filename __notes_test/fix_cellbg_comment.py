import io
p = 'app.js'
s = io.open(p, encoding='utf-8').read()
old = '''        closeAaHighlightPalette();
      });
    }
    // --- Cell Background Color --- for the existing toolbar button. Opens a compact preset
  // swatch grid inside the app (no reliance on the native OS color dialog), and
  // on selection applies the color ONLY to the currently selected table cell by
  // reusing the existing applyCellBackgroundColor() pipeline. The native
  // <input type="color"> remains as a fallback path for browsers that can't
  // render the palette, and keeps the app functionally equivalent if it does.
  if (noteCellBgColorBtn && noteCellBgColorInput) {
    let pendingTargetCell = null;
    let cellBgPaletteBuilt = false;
    const cellBgColorPalette = document.getElementById('noteCellBgColorPalette');'''
new = '''        closeAaHighlightPalette();
      });
    }
    // --- Cell Background Color ---
    // In-app color palette for the existing toolbar button. Opens a compact preset
    // swatch grid inside the app (no reliance on the native OS color dialog), and
    // on selection applies the color ONLY to the currently selected table cell by
    // reusing the existing applyCellBackgroundColor() pipeline. The native
    // <input type="color"> remains as a fallback path for browsers that can't
    // render the palette, and keeps the app functionally equivalent if it does.
    if (noteCellBgColorBtn && noteCellBgColorInput) {
      let pendingTargetCell = null;
      let cellBgPaletteBuilt = false;
      const cellBgColorPalette = document.getElementById('noteCellBgColorPalette');'''
if old not in s:
    print('NOTFOUND')
else:
    s = s.replace(old, new)
    io.open(p, encoding='utf-8', mode='w').write(s)
    print('REPLACED')
