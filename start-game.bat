@echo off
REM 二人麻雀ゲーム - フロントエンド＆バックエンド同時起動スクリプト
REM 

setlocal enabledelayedexpansion

REM 現在のディレクトリを大文字で出力
echo ===================================
echo 二人麻雀ゲーム 起動スクリプト
echo ===================================
echo.

REM 既走プロセスをクリーンアップ
echo [準備] 既走プロセスをクリーンアップ中...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001.*LISTENING"') do (
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do (
    taskkill /PID %%a /F 2>nul
)
timeout /t 1 /nobreak >nul

REM バックエンドディレクトリ
cd /d "%~dp0backend"

echo [1/3] バックエンドを起動中...
start "Mahjong Backend" cmd /k "npm start"

REM フロントエンドディレクトリ
cd /d "%~dp0frontend"

echo [2/3] フロントエンドを起動中...
start "Mahjong Frontend" cmd /k "npm run dev"

echo [3/3] 起動完了！
echo.
echo ===================================
echo ブラウザで http://localhost:3000 を開いてください
echo バックエンド: http://localhost:3001
echo ===================================
echo.
echo 注意: ウィンドウは手動で閉じるか、Ctrl+C で停止してください
pause
