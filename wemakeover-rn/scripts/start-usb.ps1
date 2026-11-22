# Phone over USB (bypasses Wi-Fi). Cable + USB debugging required.
# Metro and API appear as localhost on the phone via adb reverse.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host "adb not found. Install Android platform-tools and add them to PATH."
  exit 1
}

adb start-server | Out-Null
$lines = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\S" }
$ready = $lines | Where-Object { $_ -match "\tdevice$" }
if (-not $ready) {
  Write-Host "No phone in 'device' state. Plug USB, enable USB debugging, tap Allow, then run again."
  if ($lines) { Write-Host ($lines -join "`n") }
  exit 1
}

adb reverse --remove tcp:8082 2>$null
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
Write-Host "USB reverse set: phone 8081 -> PC Metro, phone 3000 -> PC API."
Write-Host "In the Expo launcher tap RESET, then Connect to: http://127.0.0.1:8081"
Write-Host "Keep this cable connected while you work."

$env:REACT_NATIVE_PACKAGER_HOSTNAME = "127.0.0.1"
$env:EXPO_PUBLIC_API_URL = "http://127.0.0.1:3000/api"
npx expo start --dev-client --localhost --clear --port 8081
