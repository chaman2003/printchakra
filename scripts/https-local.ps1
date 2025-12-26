# PrintChakra HTTPS Local Network Setup
# Backend runs in THIS terminal, Frontend opens in a new window
# Usage: .\https-local.ps1

$ErrorActionPreference = "Stop"

# Define paths
$frontendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\frontend"
$backendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend"
$certPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend\certs\cert.pem"
$keyPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend\certs\key.pem"
$apiUrl = "https://10.116.132.88:5000"

# Create frontend script (runs in separate window)
$frontendScript = @"
cd $frontendPath
`$env:REACT_APP_API_URL = "$apiUrl"
`$env:HTTPS = "true"
`$env:SSL_CRT_FILE = "$certPath"
`$env:SSL_KEY_FILE = "$keyPath"
Write-Host "Frontend starting..." -ForegroundColor Cyan
npm start
"@

# Save frontend script to temp
$frontendScriptPath = Join-Path $env:TEMP "printchakra_frontend.ps1"
$frontendScript | Out-File -FilePath $frontendScriptPath -Encoding UTF8

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  PrintChakra HTTPS Local Network Setup" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Start frontend in a NEW window (background)
Write-Host "Starting Frontend in separate window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-File", $frontendScriptPath -WindowStyle Normal

Write-Host "Frontend window opened!" -ForegroundColor Green
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  Backend starting in THIS terminal" -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Set environment and run backend in CURRENT terminal
cd $backendPath
$env:SSL_CERT = $certPath
$env:SSL_KEY = $keyPath

Write-Host "Backend starting (Whisper model pre-loading in background)..." -ForegroundColor Cyan
Write-Host ""

# Run backend - this blocks and runs in current terminal
python app.py
