@echo off
chcp 65001 >nul

:: ─────────── Server Manager Deploy ───────────
set "MANAGER_DIR=%~dp0"
if "%MANAGER_DIR:~-1%"=="\" set "MANAGER_DIR=%MANAGER_DIR:~0,-1%"

echo [INFO] Server Manager ビルド開始...
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js が見つかりません。
    echo         https://nodejs.org/ からインストールしてください。
    pause
    exit /b 1
)

:: Install if needed
if not exist "%MANAGER_DIR%\node_modules\electron" (
    echo [INFO] 依存パッケージをインストール中...
    cd /d "%MANAGER_DIR%"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install に失敗しました。
        pause
        exit /b 1
    )
    echo.
)

:: Deploy
cd /d "%MANAGER_DIR%"
node deploy.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] ビルドに失敗しました。
    pause
    exit /b 1
)

echo.
pause
