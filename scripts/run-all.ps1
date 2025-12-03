# PrintChakra Full Stack - Backend + Frontend

$rootDir = "C:\Users\chama\OneDrive\Desktop\printchakra"
$backendScript = Join-Path $rootDir "scripts\backend.ps1"
$frontendScript = Join-Path $rootDir "scripts\frontend.ps1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PrintChakra Full Stack Launcher" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $backendScript)) {
    Write-Host "Backend script not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendScript)) {
    Write-Host "Frontend script not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; .\scripts\backend.ps1"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir'; .\scripts\frontend.ps1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Backend running on http://localhost:5000" -ForegroundColor Green
Write-Host "✓ Frontend running on http://localhost:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
