@echo off
setlocal
title Unstop E2E Test Lab Quick Start

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 if not exist "%ProgramFiles%\nodejs\npm.cmd" (
  echo npm was not found. Reinstall Node.js LTS with npm, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo Installing project dependencies. This may take a few minutes the first time...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo Starting the dashboard and API...
start "Unstop E2E Test Lab server" cmd /k "cd /d ""%~dp0"" && npm.cmd run dev"
echo Waiting for the dashboard to start...
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"
echo.
echo The dashboard is opening at http://localhost:5173
echo Keep the server terminal open. Click Launch Cypress in the dashboard to run tests.
echo Install Google Chrome on this PC before launching headed Cypress tests.
echo Close the server terminal or press Ctrl+C there to stop the app.
echo.
pause
endlocal
