# PrintChakra HTTPS Local Network Setup
# Starts backend and frontend servers in separate PowerShell windows
# Usage: .\https-local.ps1

$ErrorActionPreference = "Stop"

# Define paths
$frontendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\frontend"
$backendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend"
$certPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend\certs\cert.pem"
$keyPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend\certs\key.pem"
$apiUrl = "https://10.116.132.88:5000"

# Create backend script
$backendScript = @"
cd $backendPath
`$env:SSL_CERT = "$certPath"
`$env:SSL_KEY = "$keyPath"
python app.py
"@

# Create frontend script
$frontendScript = @"
cd $frontendPath
`$env:REACT_APP_API_URL = "$apiUrl"
`$env:HTTPS = "true"
`$env:SSL_CRT_FILE = "$certPath"
`$env:SSL_KEY_FILE = "$keyPath"
npm start
"@

# Save temporary scripts
$backendScriptPath = Join-Path $env:TEMP "printchakra_backend.ps1"
$frontendScriptPath = Join-Path $env:TEMP "printchakra_frontend.ps1"

$backendScript | Out-File -FilePath $backendScriptPath -Encoding UTF8
$frontendScript | Out-File -FilePath $frontendScriptPath -Encoding UTF8

# Start both servers in separate windows
Write-Host "Starting PrintChakra Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", $backendScriptPath -WindowStyle Normal

Write-Host "Starting PrintChakra Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-File", $frontendScriptPath -WindowStyle Normal

Write-Host ""
Write-Host "Both servers are starting in separate windows." -ForegroundColor Cyan
