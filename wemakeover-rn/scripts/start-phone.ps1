# Local phone testing on the same Wi‑Fi (no tunnels).
# Backend: cd server && npm run dev
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Starting Expo (development build, LAN). Phone and PC must be on the same Wi-Fi."
npx expo start --dev-client --lan --clear --port 8081
