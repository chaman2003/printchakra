# PrintChakra Frontend - React Development Server

$frontendDir = "C:\Users\chama\OneDrive\Desktop\printchakra\frontend"
$nodeModulesDir = Join-Path $frontendDir "node_modules"

if (-not (Test-Path $frontendDir)) {
    Write-Host "Frontend directory not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $nodeModulesDir)) {
    Write-Host "node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    cd $frontendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PrintChakra React Frontend" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing Node processes on port 3000
$existingProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object OwningProcess
if ($existingProcess) {
    Stop-Process -Id $existingProcess.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "Starting React development server on localhost:3000..." -ForegroundColor Yellow
Write-Host ""
Write-Host "TIP: Run backend separately with: .\backend.ps1" -ForegroundColor Green
Write-Host ""

# Run React development server
cd $frontendDir
$env:BROWSER = 'none'
npm start
