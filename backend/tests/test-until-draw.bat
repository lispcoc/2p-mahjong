@echo off
setlocal enabledelayedexpansion

set attemptCount=0
set maxAttempts=100
set found=0

echo 流局になるまでCPU対戦テストを実行します
echo 最大試行回数: %maxAttempts%
echo.

cd /d %~dp0

:loop
if %found% equ 1 goto done
if %attemptCount% geq %maxAttempts% goto done

set /a attemptCount+=1
echo 試行 #%attemptCount%...

node test-cpu-battle.js > temp-output.txt 2>&1

findstr /I "Draw -" temp-output.txt >nul
if not errorlevel 1 (
    set found=1
    echo.
    echo =====================================
    echo 流局が検出されました！
    echo =====================================
    echo.
    type temp-output.txt
    goto done
)

findstr /I "勝者:" temp-output.txt >nul
if not errorlevel 1 (
    for /f "tokens=2" %%a in ('findstr /I "総ターン数:" temp-output.txt') do (
        set turns=%%a
    )
    echo   結果: ターン数 !turns!
)

goto loop

:done
if %found% equ 0 (
    echo.
    echo 警告: %maxAttempts% 回の試行で流局が検出されませんでした
    echo 流局は確率的に発生するため、より多くの試行が必要な場合があります
)

echo.
echo テスト完了: %attemptCount% 回試行

del /q temp-output.txt 2>nul

endlocal
