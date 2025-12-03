# PrintChakra Backend - Flask Server Only

$scriptDir = $PSScriptRoot
$backendDir = Join-Path $scriptDir "..\backend"
$appFile = Join-Path $backendDir "app.py"
$reqFile = Join-Path $backendDir "requirements.txt"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PrintChakra Flask Backend" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify backend directory and app.py exist
if (-not (Test-Path $backendDir)) {
    Write-Host "❌ Backend directory not found at $backendDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $appFile)) {
    Write-Host "❌ app.py not found at $appFile" -ForegroundColor Red
    exit 1
}

# Check if Flask is already running on port 5000
$portInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "⚠️  Port 5000 is already in use. Attempting to free it..." -ForegroundColor Yellow
    $process = Get-Process | Where-Object { $_.Handles -match "5000" } -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -InputObject $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Write-Host "✓ Starting Flask backend on localhost:5000..." -ForegroundColor Green
Write-Host ""
Write-Host "TIP: Run ngrok separately with: .\ngrok.ps1" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Verify Python is available
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python or add it to your PATH" -ForegroundColor Red
    exit 1
}

# Check for missing dependencies (PyTorch, Poppler)
Write-Host "Checking dependencies..." -ForegroundColor Gray
$pyVer = python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
Write-Host "  Python: $pyVer ✓" -ForegroundColor Green

$torchCheck = python -c "import torch; print('OK')" 2>&1
if ($torchCheck -notmatch "OK") {
    Write-Host "  ⚠️  PyTorch: Not installed (GPU features disabled)" -ForegroundColor Yellow
    Write-Host "     To enable GPU acceleration, run:" -ForegroundColor Cyan
    Write-Host "     pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118" -ForegroundColor Cyan
} else {
    Write-Host "  PyTorch: Installed ✓" -ForegroundColor Green
}

$flaskCheck = python -c "import flask; print('OK')" 2>&1
if ($flaskCheck -notmatch "OK") {
    Write-Host "  ❌ Flask: Not installed" -ForegroundColor Red
    Write-Host "     Run: pip install -r $reqFile" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "  Flask: Installed ✓" -ForegroundColor Green
}

Write-Host ""

# Set environment variables and run Flask
$env:PYTHONIOENCODING = 'utf-8'
$env:FLASK_ENV = 'development'

try {
    Set-Location $backendDir
    python $appFile
} catch {
    Write-Host "❌ Error starting Flask server: $_" -ForegroundColor Red
    exit 1
}
