param([string]$File='d:\Programs EQ7\EQ\index.html')
$c = Get-Content $File -Encoding UTF8
$found = $false
for ($i=0; $i -lt $c.Length; $i++) {
    if ($c[$i] -eq '              <span id="smartPdfPageCount" class="smart-pdf-page-count"></span>') {
        $found = $true
        Write-Host "FOUND at line $($i+1): $($c[$i])" -ForegroundColor Yellow
        $c[$i] = $null
        break
    }
}
if (-not $found) { Write-Host "NOT FOUND" -ForegroundColor Red; exit 1 }
# collapse $null entries
$c = @($c | Where-Object { $_ -ne $null })
Set-Content -Path $File -Value $c -Encoding UTF8 -NoNewline
Write-Host "REMOVED. New line count: $($c.Length)" -ForegroundColor Green
