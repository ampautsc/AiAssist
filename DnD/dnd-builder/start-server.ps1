# start-server.ps1 - Safely starts the DnD Builder API server
# Kills any stale process on port 3001 first, then launches fresh

$PORT = 3001
$ROOT = $PSScriptRoot

# Kill anything on port 3001
$existing = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
    Write-Host "Killing stale process on port $PORT (PID $($existing.OwningProcess))..."
    Stop-Process -Id $existing.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start server detached with log capture
$logOut = Join-Path $ROOT "server.log"
$logErr = Join-Path $ROOT "server-error.log"

Write-Host "Starting API server..."
$proc = Start-Process -FilePath "node" `
    -ArgumentList "`"$ROOT\server\index.js`"" `
    -WorkingDirectory $ROOT `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput $logOut `
    -RedirectStandardError $logErr

Start-Sleep -Seconds 3

# Verify
$conn = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    Write-Host "OK: API server running on http://localhost:$PORT (PID $($proc.Id))"
} else {
    Write-Host "FAILED: Server did not start. Check server-error.log:"
    Get-Content $logErr -ErrorAction SilentlyContinue
}
