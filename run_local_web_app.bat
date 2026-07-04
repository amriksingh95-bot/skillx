@echo off
title SkillXT Reward Program Runner
echo ==========================================
echo   SkillXT Reward Program - Local Server
echo ==========================================

:: 1. Start PostgreSQL Database
echo.
echo [1/4] Starting PostgreSQL Database...
powershell -ExecutionPolicy Bypass -File "%~dp0setup-postgres.ps1"
if %errorlevel% neq 0 (
    echo.
    echo WARNING: PostgreSQL setup had an issue.
    echo Checking if PostgreSQL is already running on port 5432...
    netstat -ano | findstr ":5432" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: PostgreSQL is NOT running. Database will not work.
        pause
    )
)

:: 2. Kill any stale processes on ports 5000 and 5173
echo.
echo [2/4] Clearing old processes on ports 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo Ports cleared.

:: 3. Start Backend
echo.
echo [3/4] Launching Backend Server on http://localhost:5000 ...
start "SkillXT Backend" cmd /k "cd /d \"%~dp0backend\" && echo Backend starting... && node src/index.js"

:: Wait for backend to be ready
echo Waiting for backend to start...
set /a retries=0
:wait_backend
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    set /a retries+=1
    if !retries! lss 15 goto wait_backend
    echo WARNING: Backend may not have started yet.
) else (
    echo Backend is running!
)

:: 4. Start Frontend
echo.
echo [4/4] Launching Frontend Server on http://localhost:5173 ...
start "SkillXT Frontend" cmd /k "cd /d \"%~dp0frontend\" && echo Frontend starting... && npx vite"

:: 5. Open Web Browser
echo.
echo ==========================================
echo   All services started!
echo   Opening browser in 5 seconds...
echo ==========================================
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo To stop everything, close the "SkillXT Backend" and "SkillXT Frontend" windows.
echo ==========================================
pause
