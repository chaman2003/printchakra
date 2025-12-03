# PrintChakra Full Stack - Backend + Frontend

$scriptDir = $PSScriptRoot
$backendScript = Join-Path $scriptDir "backend.ps1"
$frontendScript = Join-Path $scriptDir "frontend.ps1"

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
Start-Process powershell -ArgumentList "-NoExit", "-File", "$backendScript"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", "$frontendScript"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ Backend running on http://localhost:5000" -ForegroundColor Green
Write-Host "✓ Frontend running on http://localhost:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
