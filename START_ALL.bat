@echo off
REM Campus Connect - Start Frontend Only (Windows)
REM This script starts the frontend server

echo.
echo =============================================================================
echo   Campus Connect - Frontend Startup Script (Windows)
echo =============================================================================
echo.

REM Get the directory where this script is located
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%campus-connect-now

REM Check if project directory exists
if not exist "%PROJECT_DIR%" (
    echo ❌ Error: Project directory not found at %PROJECT_DIR%
    echo Please run this script from the Campus Connect root directory
    pause
    exit /b 1
)

echo ✅ Found project at: %PROJECT_DIR%
echo.

echo 📋 Starting frontend server...
echo.

REM Start frontend in the current window or a new one
cd /d "%PROJECT_DIR%"
npm run dev

echo.
echo =============================================================================
echo.
echo ✅ Frontend server is starting!
echo    • Local URL: http://localhost:8088
echo.
echo =============================================================================
echo.
pause
