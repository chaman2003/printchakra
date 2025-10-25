# PrintChakra LocalTunnel Script
# Starts localtunnel with a fixed subdomain for consistent API endpoint

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PrintChakra LocalTunnel Launcher" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Fixed subdomain for consistency
$SUBDOMAIN = "printchakra-api"
$PORT = 5000
$FULL_URL = "https://$SUBDOMAIN.loca.lt"

Write-Host "Starting LocalTunnel with fixed subdomain..." -ForegroundColor Yellow
Write-Host "   Subdomain: $SUBDOMAIN" -ForegroundColor White
Write-Host "   Local Port: $PORT" -ForegroundColor White
Write-Host "   Public URL: $FULL_URL" -ForegroundColor Green
Write-Host ""

# Check if localtunnel is installed
if (-not (Get-Command lt -ErrorAction SilentlyContinue)) {
    Write-Host "LocalTunnel not found. Installing..." -ForegroundColor Red
    npm install -g localtunnel
    Write-Host "LocalTunnel installed successfully!" -ForegroundColor Green
    Write-Host ""
}

# Check if backend is running on port 5000
$backendRunning = $false
try {
    $connection = Test-NetConnection -ComputerName localhost -Port $PORT -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    $backendRunning = $connection.TcpTestSucceeded
} catch {
    $backendRunning = $false
}

if (-not $backendRunning) {
    Write-Host "Backend not running on port $PORT" -ForegroundColor Yellow
    Write-Host "   Please start the backend first:" -ForegroundColor White
    Write-Host "   1. Open a new terminal" -ForegroundColor White
    Write-Host "   2. Run: .\backend.ps1" -ForegroundColor Cyan
    Write-Host ""
    $response = Read-Host "Do you want to continue anyway? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Exiting..." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: Copy this URL to frontend config!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  API_BASE_URL: $FULL_URL" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Update frontend/src/config.ts:" -ForegroundColor Yellow
Write-Host "  const API_BASE_URL = '$FULL_URL';" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Start localtunnel with the fixed subdomain
# Note: You may need to visit the URL first to approve the tunnel
lt --port $PORT --subdomain $SUBDOMAIN
