$out = @()
$out += netstat -ano | Select-String ':8577'
$out += '--- node processes ---'
$out += Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, StartTime | Out-String
$out | Set-Content -Path 'd:\Programs EQ7\EQ\_port_check.txt'
