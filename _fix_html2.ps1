$f = Get-Content -Path 'd:\Programs EQ7\EQ\index.html' -Encoding UTF8 -Raw

# Fix stray '>' after button removal - find and fix it
$fixed = $f -replace '\r\n              >\r\n\s*</div>\r\n\s*</div>\r\n<div class="full-screen-note-body">', "`r`n            </div>`r`n          </div>`r`n<div class=`"full-screen-note-body`">"

if ($fixed -ne $f) {
    Write-Host "Fixed stray > character"
    $f = $fixed
} else {
    Write-Host "No stray > found with regex, trying direct fix..."
    # Find the issue around the exportNotePdfBtn area
    $idx = $f.IndexOf('exportNotePdfBtn')
    if ($idx -ge 0) {
        $snippet = $f.Substring([Math]::Max(0,$idx-50), 200)
        Write-Host "Around exportNotePdfBtn: $snippet"
    }
}

# Now remove the Company Profile modal
$modalComment = $f.IndexOf('<!-- PART 13: Company Profile manager modal')
if ($modalComment -ge 0) {
    Write-Host "`nModal comment found at: $modalComment"
    
    # Find start of modal div
    $divStart = $f.IndexOf('<div id="companyProfileModal"', $modalComment)
    Write-Host "Modal div at: $divStart"
    
    # Count divs to find matching close
    $depth = 0
    $i = $divStart
    while ($i -lt $f.Length) {
        $rest = $f.Substring($i)
        if ($rest.StartsWith('<div', [StringComparison]::OrdinalIgnoreCase)) {
            $depth++
            $i += 4
        } elseif ($rest.StartsWith('</div>', [StringComparison]::OrdinalIgnoreCase)) {
            $depth--
            $i += 6
            if ($depth -eq 0) {
                Write-Host "Found matching </div> at: $i"
                break
            }
        } else {
            $i++
        }
    }
    
    $modalContent = $f.Substring($modalComment, $i - $modalComment)
    Write-Host "Removing $($modalContent.Length) chars of modal"
    
    $f = $f.Substring(0, $modalComment) + $f.Substring($i)
    Write-Host "Modal removed."
} else {
    Write-Host "`nModal comment NOT found after button removal"
}

Set-Content -Path 'd:\Programs EQ7\EQ\index.html' -Value $f -Encoding UTF8 -NoNewline
Write-Host "File saved. Length: $($f.Length)"
