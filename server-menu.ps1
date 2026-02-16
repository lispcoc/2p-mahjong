# Encoding: utf-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$script:backendJob = $null
$script:frontendJob = $null
$script:isRunning = $false
$script:scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Banner {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "  Mahjong Game Server Manager" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
}

function Cleanup-Processes {
    Write-Host "[*] Cleaning up processes..." -ForegroundColor Yellow
    
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    
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
    Write-Host "[+] Cleanup complete" -ForegroundColor Green
}

function Start-Servers {
    $backendPath = Join-Path $script:scriptRoot "backend"
    $frontendPath = Join-Path $script:scriptRoot "frontend"
    $logsDir = Join-Path $script:scriptRoot "logs"
    
    if (-not (Test-Path $backendPath)) {
        Write-Host "ERROR: Backend folder not found" -ForegroundColor Red
        return $false
    }
    if (-not (Test-Path $frontendPath)) {
        Write-Host "ERROR: Frontend folder not found" -ForegroundColor Red
        return $false
    }
    
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    $backendLogPath = Join-Path $logsDir "backend.log"
    $frontendLogPath = Join-Path $logsDir "frontend.log"
    
    Write-Host ""
    Write-Host "[2/2] Starting servers..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host ">> Backend: npm start (port 3001)" -ForegroundColor Green
    Write-Host "   Log: $backendLogPath" -ForegroundColor Gray
    $script:backendJob = Start-Job -ScriptBlock {
        Set-Location $args[0]
        cmd /c "npm start" *> $args[1]
    } -ArgumentList $backendPath, $backendLogPath
    
    Start-Sleep -Seconds 3
    
    Write-Host ">> Frontend: npm run dev (port 3000)" -ForegroundColor Green
    Write-Host "   Log: $frontendLogPath" -ForegroundColor Gray
    $script:frontendJob = Start-Job -ScriptBlock {
        Set-Location $args[0]
        cmd /c "npm run dev" *> $args[1]
    } -ArgumentList $frontendPath, $frontendLogPath
    
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  Servers ready!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Browser: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "API: http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    
    $script:isRunning = $true
    return $true
}

function Stop-Servers {
    Write-Host "[*] Stopping servers..." -ForegroundColor Yellow
    
    if ($script:backendJob) {
        $script:backendJob | Stop-Job -ErrorAction SilentlyContinue
        $script:backendJob | Remove-Job -ErrorAction SilentlyContinue
        $script:backendJob = $null
    }
    
    if ($script:frontendJob) {
        $script:frontendJob | Stop-Job -ErrorAction SilentlyContinue
        $script:frontendJob | Remove-Job -ErrorAction SilentlyContinue
        $script:frontendJob = $null
    }
    
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "[+] Servers stopped" -ForegroundColor Green
    $script:isRunning = $false
}

function Show-Menu {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "  Menu" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($script:isRunning) {
        Write-Host "  [1] Restart Server" -ForegroundColor Green
        Write-Host "  [2] Stop Server" -ForegroundColor Yellow
        Write-Host "  [3] View Logs" -ForegroundColor Cyan
        Write-Host "  [0] Exit" -ForegroundColor Red
    } else {
        Write-Host "  [1] Start Server" -ForegroundColor Green
        Write-Host "  [0] Exit" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host -NoNewline "Status: "
    if ($script:isRunning) {
        Write-Host "Running" -ForegroundColor Green -NoNewline
        Write-Host " [OK]"
    } else {
        Write-Host "Stopped" -ForegroundColor Red -NoNewline
        Write-Host " [x]"
    }
    Write-Host ""
}

function Show-Logs {
    $logsDir = Join-Path $script:scriptRoot "logs"
    $backendLogPath = Join-Path $logsDir "backend.log"
    $frontendLogPath = Join-Path $logsDir "frontend.log"
    
    Write-Host ""
    Write-Host "Select log:" -ForegroundColor Cyan
    Write-Host "  [1] Backend log (last 50 lines)" -ForegroundColor Gray
    Write-Host "  [2] Frontend log (last 50 lines)" -ForegroundColor Gray
    Write-Host "  [0] Back to menu" -ForegroundColor Gray
    Write-Host ""
    Write-Host -NoNewline "Choice: "
    $choice = Read-Host
    
    if ($choice -eq "1") {
        if (Test-Path $backendLogPath) {
            Write-Host ""
            Write-Host "=== Backend Log ===" -ForegroundColor Cyan
            Get-Content $backendLogPath -Tail 50
        } else {
            Write-Host "Log file not found" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Press Enter to continue..."
        Read-Host | Out-Null
    } elseif ($choice -eq "2") {
        if (Test-Path $frontendLogPath) {
            Write-Host ""
            Write-Host "=== Frontend Log ===" -ForegroundColor Cyan
            Get-Content $frontendLogPath -Tail 50
        } else {
            Write-Host "Log file not found" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "Press Enter to continue..."
        Read-Host | Out-Null
    }
}

function Main {
    Show-Banner
    
    Write-Host "[1/2] Cleaning up processes..." -ForegroundColor Yellow
    Cleanup-Processes
    
    Start-Servers
    
    while ($true) {
        Show-Menu
        
        Write-Host -NoNewline "Choice [0-3]: "
        $choice = Read-Host
        
        if ($choice -eq "1") {
            Write-Host ""
            if ($script:isRunning) {
                Write-Host "Restarting..." -ForegroundColor Yellow
                Stop-Servers
                Start-Sleep -Seconds 2
                Cleanup-Processes
                Start-Servers
            } else {
                Write-Host "Starting..." -ForegroundColor Yellow
                Cleanup-Processes
                Start-Servers
            }
        } elseif ($choice -eq "2") {
            if ($script:isRunning) {
                Write-Host ""
                Write-Host "Stopping..." -ForegroundColor Yellow
                Stop-Servers
            } else {
                Write-Host "Server is already stopped" -ForegroundColor Gray
            }
        } elseif ($choice -eq "3") {
            if ($script:isRunning) {
                Show-Logs
            } else {
                Write-Host "Server is not running" -ForegroundColor Red
            }
        } elseif ($choice -eq "0") {
            Write-Host ""
            if ($script:isRunning) {
                Write-Host "Stopping servers before exit..." -ForegroundColor Yellow
                Stop-Servers
            }
            Write-Host "Exiting" -ForegroundColor Green
            Write-Host ""
            exit 0
        } else {
            Write-Host "Invalid choice" -ForegroundColor Red
        }
    }
}

Main
