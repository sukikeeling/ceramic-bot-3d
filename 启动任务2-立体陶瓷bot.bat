@echo off
title Ceramic Bot 3D
cd /d "%~dp0"
echo ================================================
echo   Task 2: 3D Ceramic Bot
echo   URL : http://127.0.0.1:5182
echo   Close this window to stop the server.
echo ================================================
echo.
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://127.0.0.1:5182"
python -m http.server 5182 --bind 127.0.0.1 --directory dist
