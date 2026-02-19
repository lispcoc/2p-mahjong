#!/usr/bin/env pwsh

# 偶然役テスト（一発、海底、嶺上開花）を実行

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "偶然役テスト開始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Node.jsでテストを実行
node test-accidental-yaku.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "テスト完了" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "エラーで終了しました" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Read-Host "Enterキーを押して終了してください"
