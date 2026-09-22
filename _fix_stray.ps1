$f = Get-Content -Path 'd:\Programs EQ7\EQ\index.html' -Encoding UTF8 -Raw

# Show context around line 929 area
$lines = $f -split "`r`n"
Write-Host "Lines 925-935:"
for ($i = 924; $i -le 934; $i++) {
    Write-Host "$($i+1): $($lines[$i])"
}

# Find and remove the stray '>'
$strayIdx = $f.IndexOf(">`r`n            </div>`r`n          </div>`r`n<div class=`"full-screen-note-body`">")
if ($strayIdx -ge 0) {
    Write-Host "`nFound stray > at: $strayIdx"
    $f = $f.Substring(0, $strayIdx) + $f.Substring($strayIdx + 3)  # Remove '>' + newline prefix
    # Actually we need to replace ">`r`n              " with "             "
    $f = $f -replace '>`r`n              (?=</div>)', '             '
    Write-Host "Fixed stray >"
}

Set-Content -Path 'd:\Programs EQ7\EQ\index.html' -Value $f -Encoding UTF8 -NoNewline
Write-Host "Done. Length: $($f.Length)"

# Verify
$lines2 = $f -split "`r`n"
Write-Host "`nAfter fix, lines 925-935:"
for ($i = 924; $i -le 934; $i++) {
    Write-Host "$($i+1): $($lines2[$i])"
}
