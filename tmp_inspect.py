import os, glob
root = 'd:/Programs EQ7/EQ'
names = sorted(os.listdir(root))
print('ROOT:', names)
print('has __pdfdiag:', os.path.isdir(os.path.join(root,'__pdfdiag')))
print('has vendor/:', os.path.isdir(os.path.join(root,'vendor')))
print('pdf.min.js:', glob.glob(os.path.join(root,'**','pdf.min.js'), recursive=True)[:5])
print('pdf.worker.min.js:', glob.glob(os.path.join(root,'**','pdf.worker.min.js'), recursive=True)[:5])
print('pdfjs-dist build:', glob.glob(os.path.join(root,'node_modules','**','build','pdf.min.js'), recursive=True)[:3])
