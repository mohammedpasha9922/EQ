with open('index.html', 'rb') as f:
    data = f.read()

needle = b'openCompanyProfileBtn'
idx = data.find(needle)
print(f'Found at byte offset: {idx}')

# Show 300 bytes before and 500 after
start_display = max(0, idx - 300)
end_display = min(len(data), idx + 500)
print(f'Context ({end_display-start_display} bytes):')
print(data[start_display:end_display])
