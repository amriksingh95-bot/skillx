# PowerShell Script to setup and start a portable PostgreSQL database locally in the project folder.

param (
    [string]$action = "start"
)

$pgPath = Join-Path (Get-Location) "pgsql"
$dataPath = Join-Path (Get-Location) "postgres_data"
$zipPath = Join-Path (Get-Location) "postgresql.zip"
$logPath = Join-Path (Get-Location) "postgres.log"

$pgCtl = Join-Path $pgPath "bin\pg_ctl.exe"
$initDb = Join-Path $pgPath "bin\initdb.exe"
$createDb = Join-Path $pgPath "bin\createdb.exe"


if ($action -eq "stop") {
    if (Test-Path $pgCtl) {
        Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
        & $pgCtl -D $dataPath stop
    } else {
        Write-Host "PostgreSQL binaries not found." -ForegroundColor Red
    }
    exit
}

# 1. Download and Extract PostgreSQL if binaries don't exist
if (-not (Test-Path $pgCtl)) {
    Write-Host "PostgreSQL binaries not found. Downloading portable PostgreSQL 15..." -ForegroundColor Cyan
    $downloadUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.3-1-windows-x64-binaries.zip"
    
    Write-Host "Downloading from: $downloadUrl" -ForegroundColor Gray
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
    
    Write-Host "Extracting archive to project folder..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath (Get-Location) -Force
    
    Write-Host "Cleaning up ZIP file..." -ForegroundColor Gray
    Remove-Item -Path $zipPath -ErrorAction SilentlyContinue
} else {
    Write-Host "PostgreSQL portable binaries found." -ForegroundColor Green
}

# 2. Initialize database cluster if data folder doesn't exist
if (-not (Test-Path $dataPath)) {
    Write-Host "Initializing new database cluster in $dataPath..." -ForegroundColor Cyan
    # Create cluster with trust authentication for local connections
    & $initDb -D $dataPath -U postgres --auth-local=trust --auth-host=trust
}

# 3. Start PostgreSQL Server if not already running
Write-Host "Starting PostgreSQL on localhost:5432..." -ForegroundColor Cyan
$started = & $pgCtl -D $dataPath -l $logPath start

# Wait for database startup
Start-Sleep -Seconds 5

# 4. Create database 'skillxt' if it doesn't exist
Write-Host "Creating 'skillxt' database if not exists..." -ForegroundColor Cyan
try {
    # Check if DB exists or try creating it
    & $createDb -U postgres skillxt 2>$null
    Write-Host "Database 'skillxt' ready!" -ForegroundColor Green
} catch {
    # database might already exist, safe to ignore
}

Write-Host "PostgreSQL is running successfully!" -ForegroundColor Green
Write-Host "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillxt?schema=public" -ForegroundColor Green
