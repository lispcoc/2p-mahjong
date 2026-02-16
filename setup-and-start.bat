@echo off
REM 二人麻雀ゲーム - セットアップ＆起動スクリプト（初回用）
REM 依存関係のインストールと同時起動を行います

setlocal enabledelayedexpansion

echo ===================================
echo 二人麻雀ゲーム セットアップ
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

REM バックエンドの依存関係インストール
echo.
echo [1/4] バックエンド依存関係をインストール中...
cd /d "%~dp0backend"
if not exist "node_modules" (
    call npm install
) else (
    echo バックエンド依存関係は既にインストール済みです
)

REM フロントエンドの依存関係インストール
echo.
echo [2/4] フロントエンド依存関係をインストール中...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    call npm install
) else (
    echo フロントエンド依存関係は既にインストール済みです
)

REM バックエンド起動
echo.
echo [3/4] バックエンドを起動中...
cd /d "%~dp0backend"
start "Mahjong Backend - http://localhost:3001" cmd /k "npm start"

REM フロントエンド起動
echo.
echo [4/4] フロントエンドを起動中...
cd /d "%~dp0frontend"
start "Mahjong Frontend - http://localhost:3000" cmd /k "npm run dev"

echo.
echo ===================================
echo 起動完了！
echo ===================================
echo.
echo ブラウザで開く：http://localhost:3000
echo.
echo - フロントエンドウィンドウ: 「Mahjong Frontend」
echo - バックエンドウィンドウ: 「Mahjong Backend」
echo.
echo サーバー停止方法:
echo 各ウィンドウで Ctrl+C を押すか、ウィンドウを閉じてください
echo.
pause
