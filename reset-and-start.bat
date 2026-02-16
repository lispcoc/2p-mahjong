@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0reset-and-start.ps1" -Encoding UTF8
pause
