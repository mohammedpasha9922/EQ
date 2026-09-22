$ErrorActionPreference = 'SilentlyContinue'
cd 'd:/Programs EQ7/EQ/__notes_test'
$summary = @()
foreach($f in @('n02_home_check.mjs','n03_create_check.mjs','n04_editor_check.mjs','n05_formatting_check.mjs','n06_table_check.mjs','folders_check.mjs','p8_part3.mjs','p9_images.mjs','p9b_responsive.mjs')){
  $tag = [IO.Path]::GetFileNameWithoutExtension($f)
  $o = "$tag.part10.out.txt"; $e = "$tag.part10.err.txt"
  $p = Start-Process node -ArgumentList $f -WorkingDirectory 'd:/Programs EQ7/EQ/__notes_test' -RedirectStandardOutput $o -RedirectStandardError $e -PassThru -WindowStyle Hidden
  $waited = 0
  while(-not $p.HasExited -and $waited -lt 260){ Start-Sleep -Seconds 5; $waited += 5 }
  if(-not $p.HasExited){ Stop-Process -Id $p.Id -Force; $summary += "== $tag TIMEOUT_AFTER_260s" }
  else {
    $txt = (Get-Content $o -Raw) + (Get-Content $e -Raw)
    $lines = $txt -split "`n"
    $passes = ($lines | Select-String -SimpleMatch 'PASS' | Measure-Object).Count
    $fails = ($lines | Select-String -SimpleMatch 'FAIL' | Measure-Object).Count
    $nv = ($lines | Select-String -SimpleMatch 'NOTVER' | Measure-Object).Count
    $summary += "== $tag  PASS=$passes FAIL=$fails NV=$nv EXIT=$($p.ExitCode)"
    if($fails -gt 0){ $lines | Select-String -SimpleMatch 'FAIL' | Select-Object -First 4 | ForEach-Object { $t=$_.Line.Trim(); if($t.Length -gt 120){$t=$t.Substring(0,120)}; $summary += '   ' + $t } }
  }
}
$summary | Set-Content 'd:/Programs EQ7/EQ/__notes_test/_p10_regress.txt'