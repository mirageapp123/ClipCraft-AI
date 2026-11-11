$ErrorActionPreference = "Stop"

$taskName = "ClipCraft Web Server"
$root = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $root "scripts\start-clipcraft.ps1"

if (-not (Test-Path $startScript)) {
  throw "Start script not found at $startScript"
}

$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
  throw "Node.js was not found in PATH. Install Node.js 20 or newer and try again."
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`" -NodePath `"$nodePath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 3650)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName

Write-Host "ClipCraft is installed as the scheduled task '$taskName'."
Write-Host "It will start automatically when $env:USERNAME signs in and restart if it stops."
Write-Host "This option does not need Administrator rights."
Write-Host "Open the app:  http://localhost:8080"
Write-Host "Health check:  http://localhost:8080/healthz"
