# エンコーディング設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=====================================" 
Write-Host "Mahjong Game - Reset & Start"
Write-Host "=====================================" 
Write-Host ""

# [1/3] Kill existing processes
Write-Host "[1/3] Cleaning up processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Kill processes on ports 3000-3010
for ($port = 3000; $port -le 3010; $port++) {
    $netstat = netstat -ano 2>$null | Select-String ":$port.*LISTENING"
    if ($netstat) {
        $listeningPid = $netstat -split '\s+' | Select-Object -Last 1
        if ($listeningPid -match '^\d+$') {
            Stop-Process -Id $listeningPid -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 2

# [2/3] Start backend & frontend
Write-Host "[2/3] Starting backend and frontend..." -ForegroundColor Yellow
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

# Verify paths exist
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: Backend folder not found" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $frontendPath)) {
    Write-Host "ERROR: Frontend folder not found" -ForegroundColor Red
    exit 1
}

# Create logs directory
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Define log files
$backendLogPath = Join-Path $logsDir "backend.log"
$frontendLogPath = Join-Path $logsDir "frontend.log"

# Start backend using Job with log output
Write-Host "Starting backend: npm start (port 3001)" -ForegroundColor Green
Write-Host "Backend log: $backendLogPath" -ForegroundColor Gray
$backendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    cmd /c "npm start" *> $args[1]
} -ArgumentList $backendPath, $backendLogPath

Start-Sleep -Seconds 3

# Start frontend using Job with log output
Write-Host "Starting frontend: npm run dev (port 3000)" -ForegroundColor Green
Write-Host "Frontend log: $frontendLogPath" -ForegroundColor Gray
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $args[0]
    cmd /c "npm run dev" *> $args[1]
} -ArgumentList $frontendPath, $frontendLogPath

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Ready!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Browser: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Close this window to stop the game." -ForegroundColor Yellow
Write-Host ""

# Wait for jobs (will keep running)
$backendJob | Wait-Job | Out-Null
$frontendJob | Wait-Job | Out-Null

Write-Host "Game stopped." -ForegroundColor Yellow


