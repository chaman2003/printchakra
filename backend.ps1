# Run backend and ngrok in separate terminals

$backendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend"
$venvPath = "$backendPath\venv"

# Check if virtual environment exists
if (-not (Test-Path $venvPath)) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run 'setup-backend.ps1' first to set up the backend." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if Flask is installed in venv
$flaskCheck = & "$venvPath\Scripts\python.exe" -c "import flask; print('ok')" 2>&1
if ($flaskCheck -ne "ok") {
    Write-Host "⚠️ Warning: Dependencies may not be installed properly" -ForegroundColor Yellow
    Write-Host "Please run 'setup-backend.ps1' to install all dependencies." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Attempting to start anyway..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
}

Write-Host "🚀 Starting PrintChakra Backend..." -ForegroundColor Green
Write-Host ""

# Start backend
Start-Process powershell.exe -ArgumentList "-NoExit", "cd '$backendPath'; & '.\venv\Scripts\Activate.ps1'; python app.py"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start ngrok with browser warning disabled and response header added
Write-Host "🌐 Starting ngrok tunnel..." -ForegroundColor Green
Write-Host "   - Adding bypass headers for browser compatibility" -ForegroundColor Yellow
Start-Process powershell.exe -ArgumentList "-NoExit", "ngrok http --domain=freezingly-nonsignificative-edison.ngrok-free.dev --response-header-add='Access-Control-Allow-Origin:*' --response-header-add='Access-Control-Allow-Methods:GET,POST,DELETE,OPTIONS' --response-header-add='Access-Control-Allow-Headers:Content-Type,Authorization,ngrok-skip-browser-warning' 5000"

Write-Host ""
Write-Host "✅ Backend and ngrok started in separate windows" -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Ngrok: https://freezingly-nonsignificative-edison.ngrok-free.dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Note: ngrok is configured with CORS headers for cross-origin image loading" -ForegroundColor Yellow