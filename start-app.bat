@echo off
cd /d "%~dp0"

set "POS_X=0"
set "POS_Y=0"
set "WIN_WIDTH=400"
set "WIN_HEIGHT=300"
powershell -Command "$code = '[DllImport(\"kernel32.dll\")] public static extern IntPtr GetConsoleWindow(); [DllImport(\"user32.dll\")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);'; Add-Type -MemberDefinition $code -Name Win32 -Namespace Native; $hwnd = [Native.Win32]::GetConsoleWindow(); [void][Native.Win32]::MoveWindow($hwnd, %POS_X%, %POS_Y%, %WIN_WIDTH%, %WIN_HEIGHT%, $true)"

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
