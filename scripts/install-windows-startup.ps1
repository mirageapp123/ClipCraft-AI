#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$taskName = "ClipCraft Web Server"
$root = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $root "scripts\start-clipcraft.ps1"

if (-not (Test-Path $startScript)) {
  throw "Start script not found at $startScript"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`" -NodePath `"$((Get-Command node -ErrorAction SilentlyContinue).Source)`""

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 3650)

$principal = New-ScheduledTaskPrincipal `
  -UserId "NT AUTHORITY\SYSTEM" `
  -LogonType ServiceAccount `
  -RunLevel Highest

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName

Write-Host "ClipCraft is installed as the scheduled task '$taskName'."
Write-Host "It will start automatically at boot and restart if it stops."
Write-Host "Check status:  Get-ScheduledTask -TaskName '$taskName'"
Write-Host "Open the app:  http://localhost:8080"
Write-Host "Health check:  http://localhost:8080/healthz"
