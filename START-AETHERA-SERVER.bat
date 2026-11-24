@echo off
title Aethera Backend (port 8000)
cd /d "%~dp0"

echo Stopping anything on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Starting Aethera backend...
echo Folder: %CD%
echo.
node --env-file-if-exists=.env server.js
pause
