# PrintChakra Development Startup Script
# Starts both backend and frontend servers concurrently

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PrintChakra Development Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found! Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found! Please install Node.js 14 or higher." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Backend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start backend in new terminal
$backendPath = Join-Path $PSScriptRoot "backend"
$backendScript = @"
Set-Location '$backendPath'
Write-Host 'Installing Python dependencies...' -ForegroundColor Yellow
pip install -r requirements.txt --quiet
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Backend Server Starting on Port 5000' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
python app.py
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

Write-Host "✓ Backend server starting in new terminal..." -ForegroundColor Green
Write-Host "  URL: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

# Wait a bit for backend to start
Start-Sleep -Seconds 3

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Frontend Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start frontend in new terminal
$frontendPath = Join-Path $PSScriptRoot "frontend"
$frontendScript = @"
Set-Location '$frontendPath'
Write-Host 'Installing Node dependencies...' -ForegroundColor Yellow
npm install --quiet
Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  Frontend Server Starting on Port 3000' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
npm start
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

Write-Host "✓ Frontend server starting in new terminal..." -ForegroundColor Green
Write-Host "  URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PrintChakra is starting up!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Both servers are running in separate terminals." -ForegroundColor Yellow
Write-Host "Press Ctrl+C in each terminal to stop the servers." -ForegroundColor Yellow
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
Write-Host ""

# Keep this terminal open
Read-Host "Press Enter to close this window"
