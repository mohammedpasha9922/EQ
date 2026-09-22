$f = Get-Content -Path 'd:\Programs EQ7\EQ\index.html' -Encoding UTF8 -Raw
$needle = 'openCompanyProfileBtn'
$idx = $f.IndexOf($needle)
if ($idx -ge 0) {
    Write-Host "Found at char: $idx"
    $start = [Math]::Max(0, $idx - 150)
    $end = [Math]::Min($f.Length, $idx + 300)
    Write-Host "---CONTEXT---"
    $f.Substring($start, $end - $start)
    Write-Host "---END---"
    
    # Find button start: search backwards for '<button' before idx
    $btnStart = $f.LastIndexOf('<button', $idx, [StringComparison]::Ordinal)
    if ($btnStart -ge 0) {
        Write-Host "`nButton start at: $btnStart"
        # Find closing </button> after idx
        $closeBtn = $f.IndexOf('</button>', $idx, [StringComparison]::Ordinal)
        if ($closeBtn -ge 0) {
            $closeEnd = $closeBtn + 8
            Write-Host "Button end at: $closeEnd"
            $removed = $f.Substring($btnStart, $closeEnd - $btnStart)
            Write-Host "Removing:"
            Write-Host $removed
            # Check for comment before button
            $commentStart = $f.LastIndexOf('<!-- PART 13:', $btnStart, [StringComparison]::Ordinal)
            if ($commentStart -ge 0 -and $commentStart -ge $btnStart - 500) {
                Write-Host "`nFound comment at: $commentStart, including it"
                $btnStart = $commentStart
            }
            $f2 = $f.Substring(0, $btnStart) + $f.Substring($closeEnd)
            Set-Content -Path 'd:\Programs EQ7\EQ\index.html' -Value $f2 -Encoding UTF8 -NoNewline
            Write-Host "`nHTML updated. New length: $($f2.Length)"
        } else {
            Write-Host "Could not find closing </button>"
        }
    } else {
        Write-Host "Could not find <button> before target"
    }
} else {
    Write-Host "NEEDLE NOT FOUND"
}
