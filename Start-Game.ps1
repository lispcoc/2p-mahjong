# 二人麻雀ゲーム - PowerShell起動スクリプト

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "二人麻雀ゲーム 起動スクリプト" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

# ポート番号をクリーンアップ
Write-Host "[準備] ポート 3000, 3001 をクリーンアップ中..." -ForegroundColor Yellow

# ポート 3001 を使用しているプロセスを終了
$process3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($process3001) {
    $pid3001 = $process3001.OwningProcess
    Write-Host "  ポート 3001 のプロセス (PID: $pid3001) を終了中..." -ForegroundColor Gray
    Stop-Process -Id $pid3001 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

# ポート 3000 を使用しているプロセスを終了
$process3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($process3000) {
    $pid3000 = $process3000.OwningProcess
    Write-Host "  ポート 3000 のプロセス (PID: $pid3000) を終了中..." -ForegroundColor Gray
    Stop-Process -Id $pid3000 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

Write-Host ""

# バックエンド起動
Write-Host "[1/2] バックエンドを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm start" `
    -WindowStyle Normal | Out-Null

# 起動に時間がかかる場合のための待機
Start-Sleep -Seconds 2

# フロントエンド起動
Write-Host "[2/2] フロントエンドを起動中..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" `
    -WindowStyle Normal | Out-Null

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "起動完了！" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
Write-Host "ブラウザで開く：" -ForegroundColor Cyan
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "バックエンド: http://localhost:3001" -ForegroundColor Gray
Write-Host ""
Write-Host "サーバー停止方法:" -ForegroundColor Yellow
Write-Host "各ウィンドウで Ctrl+C を押すか、ウィンドウを閉じてください" -ForegroundColor Gray
