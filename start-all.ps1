# Campus Connect - Start Frontend Only (Windows PowerShell)
# This script starts the frontend server

Write-Host "`n" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "  Campus Connect - Frontend Startup (Windows PowerShell)" -ForegroundColor Cyan
Write-Host "=============================================================================" -ForegroundColor Cyan
Write-Host "`n"

# Get the directory where this script is located
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PROJECT_DIR = Join-Path $SCRIPT_DIR "campus-connect-now"

# Validate project structure
if (-not (Test-Path $PROJECT_DIR)) {
    Write-Host "❌ Error: Project directory not found at $PROJECT_DIR" -ForegroundColor Red
    Write-Host "Please run this script from the Campus Connect root directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Found project at: $PROJECT_DIR" -ForegroundColor Green
Write-Host "`n"

Write-Host "📋 Starting frontend server...`n" -ForegroundColor Cyan

# Set location and run Vite dev server
Set-Location $PROJECT_DIR
npm run dev
