# Auto commit + push selepas setiap giliran Claude (dipanggil oleh hook Stop dalam .claude/settings.json).
# Senyap jika tiada perubahan. Tidak pernah force-push.
$ErrorActionPreference = 'Stop'
$git = if (Get-Command git -ErrorAction SilentlyContinue) { 'git' } else { 'C:\Program Files\Git\cmd\git.exe' }
Set-Location (Split-Path $PSScriptRoot -Parent)

& $git add -A
& $git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { exit 0 }   # tiada perubahan

# Berhenti jika fail sensitif terlepas masuk
$bad = & $git diff --cached --name-only | Where-Object { $_ -match '(^|/)\.env|\.(pdf|pptx|key)$' }
if ($bad) { & $git reset -q; Write-Error "Auto-push dibatalkan, fail sensitif: $bad"; exit 1 }

$msg = "Auto: kemas kini " + (Get-Date -Format 'yyyy-MM-dd HH:mm')
& $git commit -q -m $msg -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
& $git push -q origin HEAD
