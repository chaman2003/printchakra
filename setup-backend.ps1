# Backend Setup Script - Installs all dependencies in virtual environment

Write-Host "=== PrintChakra Backend Setup ===" -ForegroundColor Cyan
Write-Host ""

$backendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend"
$venvPath = "$backendPath\venv"

# Check if backend directory exists
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Error: Backend directory not found at: $backendPath" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location $backendPath
Write-Host "📂 Working directory: $backendPath" -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Python not found. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path $venvPath)) {
    Write-Host ""
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Virtual environment created successfully" -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host ""
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& "$venvPath\Scripts\Activate.ps1"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to activate virtual environment" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Virtual environment activated" -ForegroundColor Green

# Upgrade pip
Write-Host ""
Write-Host "📦 Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Warning: Failed to upgrade pip, continuing anyway..." -ForegroundColor Yellow
}

# Install requirements
Write-Host ""
Write-Host "📦 Installing dependencies from requirements.txt..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan

pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Verify key packages are installed
Write-Host ""
Write-Host "🔍 Verifying installations..." -ForegroundColor Yellow

$packages = @("flask", "opencv-python", "pytesseract", "scikit-learn", "flask-cors", "flask-socketio")
$allInstalled = $true

foreach ($package in $packages) {
    $result = pip show $package 2>&1
    if ($LASTEXITCODE -eq 0) {
        $version = ($result | Select-String "Version:").ToString().Split(":")[1].Trim()
        Write-Host "  ✅ $package ($version)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $package - NOT INSTALLED" -ForegroundColor Red
        $allInstalled = $false
    }
}

Write-Host ""
if ($allInstalled) {
    Write-Host "🎉 Backend setup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run 'backend.ps1' to start the backend server and ngrok" -ForegroundColor White
    Write-Host "  2. Or manually run:" -ForegroundColor White
    Write-Host "     - cd backend" -ForegroundColor Gray
    Write-Host "     - .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "     - python app.py" -ForegroundColor Gray
} else {
    Write-Host "⚠️ Setup completed with some missing packages" -ForegroundColor Yellow
    Write-Host "Please check the errors above and try running:" -ForegroundColor Yellow
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
