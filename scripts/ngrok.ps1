# PrintChakra Ngrok Tunnel

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PrintChakra Ngrok Tunnel" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing ngrok processes
Stop-Process -Name ngrok -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Make sure Flask backend is running first!" -ForegroundColor Yellow
Write-Host "  Run in another terminal: .\backend.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Expected tunnel URL:" -ForegroundColor Cyan
$domainEnv = $env:NGROK_DOMAIN
if (-not $domainEnv -or $domainEnv -eq '') {
	$domainEnv = 'biteable-preintelligently-angeles.ngrok-free.dev'
}
Write-Host "  $domainEnv" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# If NGROK_AUTHTOKEN is provided, register it (idempotent)
$ngrokToken = $env:NGROK_AUTHTOKEN
if ($ngrokToken -and $ngrokToken -ne '') {
	Write-Host "Registering ngrok auth token..." -ForegroundColor Yellow
	try {
		ngrok authtoken $ngrokToken | Out-Null
	} catch {
		Write-Host "Warning: failed to register ngrok auth token. Continuing..." -ForegroundColor Yellow
	}
}

# Run ngrok with provided domain
Write-Host "Starting ngrok with domain: $domainEnv" -ForegroundColor Cyan
ngrok http --log=false --domain=$domainEnv 5000