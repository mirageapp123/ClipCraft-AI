param(
  [string]$NodePath = "node"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Get-Command $NodePath -ErrorAction SilentlyContinue)) {
  $resolvedNode = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $resolvedNode) { throw "Node.js was not found. Install Node.js 20 or newer and try again." }
  $NodePath = $resolvedNode
}

$logDirectory = Join-Path $root "logs"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$logFile = Join-Path $logDirectory "clipcraft.log"

if (-not (Test-Path (Join-Path $root "dist\index.html"))) {
  Write-Host "Building ClipCraft before the first start..."
  if (-not (Test-Path (Join-Path $root "node_modules"))) {
    & npm ci
  }
  & npm run build
}

if (-not $env:HOST) { $env:HOST = "0.0.0.0" }
if (-not $env:PORT) { $env:PORT = "8080" }
$env:NODE_ENV = "production"

# Keep the server alive even if Node exits unexpectedly.
$ErrorActionPreference = "Continue"
while ($true) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$stamp] Starting ClipCraft on port $env:PORT" | Out-File -Append -Encoding utf8 $logFile
  & $NodePath "scripts\serve.mjs" 2>&1 | Out-File -Append -Encoding utf8 $logFile
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$stamp] ClipCraft stopped; restarting in 5 seconds..." | Out-File -Append -Encoding utf8 $logFile
  Start-Sleep -Seconds 5
}
