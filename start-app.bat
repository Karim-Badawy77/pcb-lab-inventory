@echo off
cd /d "%~dp0"

echo Building frontend...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo Frontend build failed.
    pause
    exit /b 1
)

echo.
echo Starting app...
echo.
start http://localhost:3000
call node scripts/start.js
if errorlevel 1 (
    echo.
    echo App failed to start.
    pause
    exit /b 1
)
