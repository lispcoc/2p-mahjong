# 流局になるまでテストを繰り返す

$attemptCount = 0
$maxAttempts = 100
$found = $false

Write-Host "流局になるまでCPU対戦テストを実行します" -ForegroundColor Cyan
Write-Host "最大試行回数: $maxAttempts" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

while ($attemptCount -lt $maxAttempts -and -not $found) {
    $attemptCount++
    Write-Host "試行 #$attemptCount..." -ForegroundColor Yellow
    
    # テストを実行
    $outputText = node test-cpu-battle.js 2>&1 | Out-String
    
    # 流局（draw）を検出
    if ($outputText -match "Draw -" -or $outputText -match "流局" -or $outputText -match "引き分け") {
        Write-Host "✅ 流局が検出されました！" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "流局テスト結果" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host $outputText
        $found = $true
        break
    }
    
    # 勝者を検出して表示
    if ($outputText -match "勝者:\s*([^\s]+)") {
        $winner = $matches[1]
        if ($outputText -match "総ターン数:\s*(\d+)") {
            $turns = $matches[1]
            Write-Host "  結果: $winner が $turns ターンで勝利"
        }
    }
}

if (-not $found) {
    Write-Host ""
    Write-Host "⚠️ $maxAttempts 回の試行で流局が検出されませんでした" -ForegroundColor Yellow
    Write-Host "流局は確率的に発生するため、より多くの試行が必要な場合があります" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "テスト完了: $attemptCount 回試行"
