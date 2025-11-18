# PrintChakra Backend - Flask Server Only

$backendDir = "C:\Users\chama\OneDrive\Desktop\printchakra\backend"
$venvDir = Join-Path $backendDir "venv"
$pythonExe = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path $venvDir)) {
    Write-Host "Virtual environment not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $pythonExe)) {
    Write-Host "Python executable not found in venv!" -ForegroundColor Red
    exit 1
}

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

# Run Flask directly with venv python to avoid spawning extra shells
cd $backendDir
$env:PYTHONIOENCODING = 'utf-8'
& $pythonExe "app.py"
