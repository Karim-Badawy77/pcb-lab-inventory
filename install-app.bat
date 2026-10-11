@echo off
setlocal
cd /d "%~dp0"

echo Installing dependencies...
echo.
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo.
    echo Dependency install failed.
    pause
    exit /b 1
)

echo.
echo Building frontend...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo Frontend build failed.
    pause
    exit /b 1
)

start http://localhost:3000
echo.
echo Starting app...
echo.
call node scripts/start.js
if errorlevel 1 (
    echo.
    echo App failed to start.
    pause
    exit /b 1
)