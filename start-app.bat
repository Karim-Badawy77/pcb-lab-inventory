@echo off
cd /d "%~dp0"

echo Building frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo Frontend build failed.
    pause
    exit /b 1
)

echo.
echo Starting app...
start http://localhost:3000
call npm start
if errorlevel 1 (
    echo.
    echo App failed to start.
    pause
    exit /b 1
)
