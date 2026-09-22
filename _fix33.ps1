$path = 'd:\Programs EQ7\EQ\_p33head_styles.css'
$bytes = [System.IO.File]::ReadAllBytes($path)
$encoding = [System.Text.Encoding]::Unicode
$content = $encoding.GetString($bytes)

$old = ".display-section {
  position: relative;
  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
  border-radius: clamp(16px, 2vw, 24px);
  padding: clamp(14px, 2.5vw, 20px);
  margin-bottom: 16px;
}

.speech-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  border: none;
  border-radius: 999px;
  width: 42px;
  height: 42px;
  background: rgba(255,255,255,0.1);
  color: var(--text);
  cursor: pointer;
}

body[data-language='ar'] .speech-btn {
  left: 12px;
  right: auto;
}"

$new = ".display-section {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
  border-radius: clamp(16px, 2vw, 24px);
  padding: clamp(14px, 2.5vw, 20px);
  margin-bottom: 16px;
}

.speech-btn {
  flex: 0 0 auto;
  margin-left: auto;
  border: none;
  border-radius: 999px;
  width: 42px;
  height: 42px;
  background: rgba(255,255,255,0.1);
  color: var(--text);
  cursor: pointer;
}

html[dir=`"rtl`"] .speech-btn {
  margin-left: 0;
  margin-right: auto;
}"

$found = $content.Contains($old)
Write-Host "Found old pattern: $found"

if ($found) {
    $content = $content.Replace($old, $new)
    $newBytes = $encoding.GetBytes($content)
    [System.IO.File]::WriteAllBytes($path, $newBytes)
    Write-Host "SUCCESS: Updated _p33head_styles.css"
} else {
    Write-Host "NOT FOUND - searching for speech-btn"
    $idx = $content.IndexOf('.speech-btn')
    Write-Host "speech-btn at: $idx"
    $start = [Math]::Max(0, $idx - 100)
    $snippet = $content.Substring($start, [Math]::Min(300, $content.Length - $start))
    Write-Host "Context:"
    Write-Host $snippet
}
