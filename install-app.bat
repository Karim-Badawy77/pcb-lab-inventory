@echo off
setlocal
cd /d "%~dp0"

echo Installing dependencies...
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo.
    echo Dependency install failed.
    pause
    exit /b 1
)

echo Building frontend...
call npm run build
if errorlevel 1 (
    echo.
    echo Frontend build failed.
    pause
    exit /b 1
)

echo Starting app...
call npm start
if errorlevel 1 (
    echo.
    echo App failed to start.
    pause
    exit /b 1
)