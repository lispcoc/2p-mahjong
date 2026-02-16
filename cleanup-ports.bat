@echo off
REM ポート 3001 と 3000 を使用しているプロセスを強制終了

setlocal enabledelayedexpansion

echo ===================================
echo ポートのクリーンアップを実行中...
echo ===================================
echo.

REM ポート 3001 を使用しているプロセスを終了
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001.*LISTENING"') do (
    echo [3001] PID %%a を終了中...
    taskkill /PID %%a /F 2>nul
)

REM ポート 3000 を使用しているプロセスを終了
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do (
    echo [3000] PID %%a を終了中...
    taskkill /PID %%a /F 2>nul
)

REM Node.js の既走プロセスを終了
echo.
echo Node.js プロセスをクリーンアップ中...
taskkill /IM node.exe /F 2>nul

timeout /t 2 /nobreak

echo.
echo ===================================
echo ポートのクリーンアップが完了しました
echo ===================================
echo.
pause
