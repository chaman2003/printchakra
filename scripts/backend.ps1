# PrintChakra Backend - Flask Server Only

$scriptDir = $PSScriptRoot
$backendDir = Join-Path $scriptDir "..\backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PrintChakra Flask Backend" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing Flask processes
Stop-Process -Name python -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting Flask backend on localhost:5000..." -ForegroundColor Yellow
Write-Host ""
Write-Host "TIP: Run ngrok separately with: .\ngrok.ps1" -ForegroundColor Green
Write-Host ""

# Run Flask directly with system python
if (Test-Path $backendDir) {
    cd $backendDir
    $env:PYTHONIOENCODING = 'utf-8'
    python "app.py"
} else {
    Write-Host "Backend directory not found at $backendDir" -ForegroundColor Red
    exit 1
}
