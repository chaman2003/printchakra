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
Write-Host "  https://freezingly-nonsignificative-edison.ngrok-free.dev" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Run ngrok with CORS headers, ngrok browser bypass, and custom domain
ngrok http --log=false --domain=freezingly-nonsignificative-edison.ngrok-free.dev --response-header-add="Access-Control-Allow-Origin:*" --response-header-add="ngrok-skip-browser-warning:69" 5000
