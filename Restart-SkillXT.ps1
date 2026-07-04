# Restart-SkillXT.ps1
# Kills all SkillXT servers and restarts them. Run this anytime things break.

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Restarting SkillXT Servers" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Kill node processes on port 5000 (backend)
Write-Host "`nStopping backend (port 5000)..." -ForegroundColor Yellow
$backendPids = netstat -ano | Select-String ":5000.*LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique
foreach ($pid in $backendPids) {
    taskkill /PID $pid /F 2>$null | Out-Null
}

# Kill node processes on port 5173 (frontend)
Write-Host "Stopping frontend (port 5173)..." -ForegroundColor Yellow
$frontendPids = netstat -ano | Select-String ":5173.*LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Sort-Object -Unique
foreach ($pid in $frontendPids) {
    taskkill /PID $pid /F 2>$null | Out-Null
}

Start-Sleep -Seconds 2
Write-Host "All old processes killed." -ForegroundColor Green

# Start PostgreSQL
Write-Host "`nStarting PostgreSQL..." -ForegroundColor Cyan
& "$projectRoot\setup-postgres.ps1"
Start-Sleep -Seconds 3

# Start Backend
Write-Host "`nStarting Backend (port 5000)..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "src/index.js" -WorkingDirectory "$projectRoot\backend" -WindowStyle Minimized

# Wait for backend
$retries = 0
while ($retries -lt 15) {
    Start-Sleep -Seconds 1
    $listening = netstat -ano | Select-String ":5000.*LISTENING"
    if ($listening) { break }
    $retries++
}

if ($listening) {
    Write-Host "Backend is running!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Backend may not have started." -ForegroundColor Red
}

# Start Frontend
Write-Host "`nStarting Frontend (port 5173)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$projectRoot\frontend`" && npx vite" -WindowStyle Minimized

Start-Sleep -Seconds 5
Write-Host "`nOpening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  All services restarted!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
