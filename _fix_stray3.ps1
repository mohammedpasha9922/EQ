$f = Get-Content -Path 'd:\Programs EQ7\EQ\index.html' -Encoding UTF8 -Raw

# Show raw bytes around line 929
$idx = $f.IndexOf('exportNotePdfBtn')
$afterBtn = $f.Substring($idx + 80)
Write-Host "After exportNotePdfBtn (first 200 chars):"
Write-Host $afterBtn.Substring(0, [Math]::Min(200, $afterBtn.Length))
Write-Host "`nHex:"
$bytes = [Text.Encoding]::UTF8.GetBytes($afterBtn.Substring(0, [Math]::Min(60, $afterBtn.Length)))
Write-Host ([System.BitConverter]::ToString($bytes))

# Find the stray > 
$stray = $f.IndexOf("`r`n              >`r`n            </div>`r`n          </div>`r`n<div class=`"full-screen-note-body`">")
if ($stray -ge 0) {
    Write-Host "`nFound stray > at: $stray"
    $f2 = $f.Substring(0, $stray) + "`r`n            </div>`r`n          </div>`r`n<div class=`"full-screen-note-body`">" + $f.Substring($stray + 50)
    Set-Content -Path 'd:\Programs EQ7\EQ\index.html' -Value $f2 -Encoding UTF8 -NoNewline
    Write-Host "Fixed! New length: $($f2.Length)"
} else {
    # Try simpler pattern
    $stray2 = $f.IndexOf('>`r`n            </div>`r`n          </div>`r`n<div class="full-screen-note-body">')
    if ($stray2 -ge 0) {
        Write-Host "`nFound simple stray at: $stray2"
        # Find the </button> before it
        $btnEnd = $f.LastIndexOf('</button>', $stray2, [StringComparison]::Ordinal)
        Write-Host "Button end at: $btnEnd"
        $f2 = $f.Substring(0, $btnEnd + 9) + $f.Substring($stray2 + 1)  # skip the '>'
        Set-Content -Path 'd:\Programs EQ7\EQ\index.html' -Value $f2 -Encoding UTF8 -NoNewline
        Write-Host "Fixed! New length: $($f2.Length)"
    } else {
        Write-Host "Could not find stray > pattern"
    }
}

# Verify
Write-Host "`nVerification - lines 925-935:"
$fv = Get-Content -Path 'd:\Programs EQ7\EQ\index.html' -Encoding UTF8 -Raw
$lv = $fv -split "`r`n"
for ($i = 924; $i -le 934; $i++) {
    Write-Host "$($i+1): $($lv[$i])"
}
