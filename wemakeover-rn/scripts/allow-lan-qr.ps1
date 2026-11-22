# Opens LAN QR: Wi-Fi Private (if allowed) + inbound TCP 8081 (Metro) and 3000 (API).
# Must run as Administrator. Normal VS Code / Cursor terminals will fail.
$ErrorActionPreference = "Continue"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
  Write-Host "This is not an Administrator PowerShell. npm run allow:lan cannot change Windows network/firewall from Cursor."
  Write-Host ""
  Write-Host "Do this once:"
  Write-Host "  1. Start menu -> type PowerShell -> right click Windows PowerShell -> Run as administrator"
  Write-Host "  2. Paste:"
  Write-Host "     Set-ExecutionPolicy -Scope Process Bypass"
  Write-Host "     cd D:\Wemakeover-app\wemakeover-rn"
  Write-Host "     .\scripts\allow-lan-qr.ps1"
  Write-Host ""
  Write-Host "Or Windows Settings -> Network -> Airtel_Ravindu_New -> Private"
  Write-Host "and Windows Security -> Firewall -> Allow an app -> Node.js (Private and Public)."
  exit 1
}

$wifi = Get-NetConnectionProfile -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue
if ($wifi) {
  try {
    Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private -ErrorAction Stop
    Write-Host "Wi-Fi profile set to Private."
  } catch {
    Write-Host "Could not set Private (Group Policy or adapter lock). Set it in Windows Settings if you can."
    Write-Host $_.Exception.Message
  }
} else {
  Write-Host "No interface named Wi-Fi."
}

foreach ($port in @(8081, 3000)) {
  $name = "Wemakeover LAN QR TCP $port"
  Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any | Out-Null
  Write-Host "Firewall allow inbound TCP $port"
}

Write-Host "Done. In the project: npx expo start --dev-client --lan --clear"
Write-Host "On the phone tap RESET, then scan this session QR."
Write-Host "If Host unreachable remains, disable AP/client isolation on the Airtel router."
