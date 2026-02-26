@echo off
chcp 65001 >nul

:: ─────────── Server Manager Launcher ───────────
set "MANAGER_DIR=%~dp0"
if "%MANAGER_DIR:~-1%"=="\" set "MANAGER_DIR=%MANAGER_DIR:~0,-1%"

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js が見つかりません。
    echo         https://nodejs.org/ からインストールしてください。
    pause
    exit /b 1
)

:: Install if needed
if not exist "%MANAGER_DIR%\node_modules\nw" (
    echo [INFO] 初回セットアップ中...
    cd /d "%MANAGER_DIR%"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] セットアップに失敗しました。
        pause
        exit /b 1
    )
)

:: Launch
cd /d "%MANAGER_DIR%"
start "" /B cmd /c "npx nw . 2>nul"
exit
