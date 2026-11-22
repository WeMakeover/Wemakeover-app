# Kill processes listening on the given ports (default: Metro 8081, 8083).
param(
  [int[]]$Ports = @(8081, 8083)
)

foreach ($port in $Ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Host "Port $port - nothing listening"
    continue
  }
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped port $port (PID $procId)"
  }
}
