$f = Get-Content -Path 'd:\Programs EQ7\EQ\index.html' -Encoding UTF8 -Raw

# Fix 1: Remove stray '>' on its own line between </button> and </div>
# Look for pattern: </button>`r`n              >`r`n            </div>
$before = $f
$f = $f -replace '</button>`r`n\s*>(?=`r`n\s*</div>)', '</button>'

if ($before -ne $f) {
    Write-Host "Fixed stray > character"
} else {
    Write-Host "Stray > not found with regex"
    # Show raw bytes around the area
    $idx = $f.IndexOf('exportNotePdfBtn')
    $snippet = $f.Substring($idx + 120, 60)
    Write-Host "Raw snippet after exportNotePdfBtn button end: [$snippet]"
    Write-Host "Hex: $([System.BitConverter]::ToString([Text.Encoding]::UTF8.GetBytes($snippet)))"
}

# Verify HTML structure around action bar
$lines = $f -split "`r`n"
Write-Host "`nLines 925-934 after fix:"
for ($i = 924; $i -le 933; $i++) {
    Write-Host "$($i+1): $($lines[$i])"
}

Set-Content -Path 'd:\Programs EQ7\EQ\index.html' -Value $f -Encoding UTF8 -NoNewline
Write-Host "`nSaved. Length: $($f.Length)"
