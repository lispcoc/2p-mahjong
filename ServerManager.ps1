# encoding: utf-8
# Encoding setting
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Load WPF assemblies
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName System.Windows.Forms

# Global variables
$script:backendJob = $null
$script:frontendJob = $null
$script:isRunning = $false
$script:scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:LogBox = $null

# Log output function
function Write-Log {
    param([string]$message)
    if ($script:LogBox) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        $script:LogBox.AppendText("[$timestamp] $message`n")
        $script:LogBox.ScrollToEnd()
    }
}

# Process cleanup function
function Cleanup-Processes {
    Write-Log "Cleaning up processes..."
    
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    
    # Clear processes on ports 3000-3010
    for ($port = 3000; $port -le 3010; $port++) {
        $netstat = netstat -ano 2>$null | Select-String ":$port.*LISTENING"
        if ($netstat) {
            $pid = $netstat -split '\s+' | Select-Object -Last 1
            if ($pid -match '^\d+$') {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
    }
    Start-Sleep -Seconds 1
    Write-Log "Cleanup completed"
}

# Start servers function
function Start-Servers {
    $backendPath = Join-Path $script:scriptRoot "backend"
    $frontendPath = Join-Path $script:scriptRoot "frontend"
    $logsDir = Join-Path $script:scriptRoot "logs"
    
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    if (-not (Test-Path $backendPath)) {
        Write-Log "ERROR: Backend folder not found"
        return $false
    }
    if (-not (Test-Path $frontendPath)) {
        Write-Log "ERROR: Frontend folder not found"
        return $false
    }
    
    $backendLogPath = Join-Path $logsDir "backend.log"
    $frontendLogPath = Join-Path $logsDir "frontend.log"
    
    Write-Log "Starting backend: npm start (port 3001)"
    $script:backendJob = Start-Job -ScriptBlock {
        Set-Location $args[0]
        cmd /c "npm start" *> $args[1]
    } -ArgumentList $backendPath, $backendLogPath
    
    Start-Sleep -Seconds 3
    
    Write-Log "Starting frontend: npm run dev (port 3000)"
    $script:frontendJob = Start-Job -ScriptBlock {
        Set-Location $args[0]
        cmd /c "npm run dev" *> $args[1]
    } -ArgumentList $frontendPath, $frontendLogPath
    
    Start-Sleep -Seconds 2
    
    Write-Log "Ready!"
    Write-Log "Browser: http://localhost:3000"
    Write-Log "Backend API: http://localhost:3001"
    
    $script:isRunning = $true
    return $true
}

# Stop servers function
function Stop-Servers {
    Write-Log "Stopping servers..."
    
    if ($script:backendJob) {
        $script:backendJob | Stop-Job -ErrorAction SilentlyContinue
        $script:backendJob | Remove-Job -ErrorAction SilentlyContinue
    }
    
    if ($script:frontendJob) {
        $script:frontendJob | Stop-Job -ErrorAction SilentlyContinue
        $script:frontendJob | Remove-Job -ErrorAction SilentlyContinue
    }
    
    Cleanup-Processes
    Write-Log "Server stopped"
    
    $script:isRunning = $false
}

# XAML UI definition
$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Server Manager - Mahjong Game"
        Width="600"
        Height="700"
        WindowStartupLocation="CenterScreen"
        Background="#F5F5F5">
    <Grid>
        <StackPanel VerticalAlignment="Stretch" Margin="15">
            <!-- Title -->
            <TextBlock Text="Mahjong Game - Server Manager"
                       FontSize="18"
                       FontWeight="Bold"
                       Foreground="#333"
                       Margin="0,0,0,20" />
            
            <!-- Status -->
            <Grid Margin="0,0,0,15">
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="120"/>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <TextBlock Text="Status:"
                           FontWeight="Bold"
                           VerticalAlignment="Center" />
                <TextBlock x:Name="StatusText"
                           Grid.Column="1"
                           Text="Stopped"
                           FontSize="14"
                           Foreground="#D32F2F"
                           VerticalAlignment="Center" />
            </Grid>
            
            <!-- Button Panel -->
            <StackPanel Orientation="Horizontal"
                        Margin="0,0,0,20">
                <Button x:Name="StartButton"
                        Content="Start"
                        Width="100"
                        Height="40"
                        FontSize="12"
                        FontWeight="Bold"
                        Background="#4CAF50"
                        Foreground="White"
                        Cursor="Hand"
                        Margin="0,0,10,0" />
                <Button x:Name="StopButton"
                        Content="Stop"
                        Width="100"
                        Height="40"
                        FontSize="12"
                        FontWeight="Bold"
                        Background="#F44336"
                        Foreground="White"
                        Cursor="Hand"
                        Margin="0,0,10,0" />
                <Button x:Name="RestartButton"
                        Content="Restart"
                        Width="100"
                        Height="40"
                        FontSize="12"
                        FontWeight="Bold"
                        Background="#2196F3"
                        Foreground="White"
                        Cursor="Hand"
                        Margin="0,0,10,0" />
                <Button x:Name="ClearButton"
                        Content="Clear"
                        Width="100"
                        Height="40"
                        FontSize="12"
                        FontWeight="Bold"
                        Background="#9C27B0"
                        Foreground="White"
                        Cursor="Hand" />
            </StackPanel>
            
            <!-- Log Area -->
            <TextBlock Text="Log:"
                       FontWeight="Bold"
                       Margin="0,10,0,5" />
            <Border BorderBrush="#CCCCCC"
                    BorderThickness="1"
                    CornerRadius="4"
                    Background="White">
                <TextBox x:Name="LogBox"
                         IsReadOnly="True"
                         AcceptsReturn="True"
                         VerticalScrollBarVisibility="Auto"
                         TextWrapping="Wrap"
                         Padding="10"
                         Height="450"
                         FontFamily="Consolas"
                         FontSize="11"
                         Foreground="#333" />
            </Border>
            
            <!-- Footer -->
            <TextBlock Text="Open Browser:"
                       FontWeight="Bold"
                       Margin="0,15,0,5" />
            <StackPanel Orientation="Horizontal">
                <Button x:Name="BrowserButton"
                        Content="http://localhost:3000"
                        Width="220"
                        Height="35"
                        FontSize="11"
                        Background="#FFC107"
                        Foreground="Black"
                        Cursor="Hand"
                        Margin="0,0,10,0" />
                <TextBlock Text="API: http://localhost:3001"
                           VerticalAlignment="Center"
                           FontSize="11"
                           Foreground="#666" />
            </StackPanel>
        </StackPanel>
    </Grid>
</Window>
"@

# Create Window from XAML
$reader = (New-Object System.Xml.XmlNodeReader ([xml]$xaml))
$window = [Windows.Markup.XamlReader]::Load($reader)

# Get control references
$StatusText = $window.FindName("StatusText")
$StartButton = $window.FindName("StartButton")
$StopButton = $window.FindName("StopButton")
$RestartButton = $window.FindName("RestartButton")
$ClearButton = $window.FindName("ClearButton")
$LogBox = $window.FindName("LogBox")
$BrowserButton = $window.FindName("BrowserButton")

# Store LogBox in global variable for Write-Log function
$script:LogBox = $LogBox

# Event handlers
$StartButton.Add_Click({
    if (-not $script:isRunning) {
        Write-Log "===== Starting Server ====="
        Cleanup-Processes
        if (Start-Servers) {
            $StatusText.Text = "Running"
            $StatusText.Foreground = "#4CAF50"
        }
    } else {
        Write-Log "Server is already running"
    }
})

$StopButton.Add_Click({
    if ($script:isRunning) {
        Write-Log "===== Stopping Server ====="
        Stop-Servers
        $StatusText.Text = "Stopped"
        $StatusText.Foreground = "#D32F2F"
    } else {
        Write-Log "Server is already stopped"
    }
})

$RestartButton.Add_Click({
    Write-Log "===== Restarting Server ====="
    Stop-Servers
    Start-Sleep -Seconds 2
    Cleanup-Processes
    if (Start-Servers) {
        $StatusText.Text = "Running"
        $StatusText.Foreground = "#4CAF50"
    }
})

$ClearButton.Add_Click({
    $LogBox.Clear()
    Write-Log "Log cleared"
})

$BrowserButton.Add_Click({
    Start-Process "http://localhost:3000"
})

# Window closing event
$window.Add_Closing({
    if ($script:isRunning) {
        $result = [System.Windows.MessageBox]::Show(
            "Server is running. Are you sure you want to exit?",
            "Confirmation",
            [System.Windows.MessageBoxButton]::YesNo,
            [System.Windows.MessageBoxImage]::Question
        )
        
        if ($result -eq [System.Windows.MessageBoxResult]::Yes) {
            Stop-Servers
        } else {
            $_.Cancel = $true
        }
    }
})

# Initial message
Write-Log "Server Manager started"
Write-Log "Press Start button to begin"

# Show window
$window.ShowDialog() | Out-Null
