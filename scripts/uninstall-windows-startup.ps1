#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$taskName = "ClipCraft Web Server"

Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Write-Host "ClipCraft startup task '$taskName' removed."
