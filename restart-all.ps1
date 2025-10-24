# Restart All Services Script
# Stops and restarts backend, frontend, and ngrok

param(
    [switch]$SkipNgrok
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "PrintChakra - Service Restart" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = $PSScriptRoot

# Stop any existing processes
Write-Host "🛑 Stopping existing services..." -ForegroundColor Yellow

# Kill Flask/Python processes on port 5000
try {
    $port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    if ($port5000) {
        $processId = $port5000.OwningProcess
        Write-Host "   Stopping backend (PID: $processId)..." -ForegroundColor Gray
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {
    # Port not in use
}

# Kill Node processes (frontend)
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "   Stopping frontend..." -ForegroundColor Gray
        $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {
    # No node processes
}

Write-Host "✅ Services stopped" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "🚀 Starting Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\backend'; python run.py"
Start-Sleep -Seconds 3

# Check if backend started
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 5
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend may not have started properly" -ForegroundColor Yellow
}
Write-Host ""

# Start Frontend
Write-Host "🚀 Starting Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\frontend'; npm start"
Start-Sleep -Seconds 3
Write-Host "✅ Frontend starting..." -ForegroundColor Green
Write-Host ""

# Start ngrok (optional)
if (-not $SkipNgrok) {
    Write-Host "🚀 Starting ngrok..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; .\ngrok.ps1"
    Start-Sleep -Seconds 3
    Write-Host "✅ ngrok starting..." -ForegroundColor Green
    Write-Host ""
}

Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ All Services Started!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Gray
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Gray
if (-not $SkipNgrok) {
    Write-Host "   ngrok:    http://localhost:4040" -ForegroundColor Gray
}
Write-Host ""
Write-Host "💡 Check each terminal window for status" -ForegroundColor Yellow
Write-Host ""

# Wait a bit and try to get ngrok URL
if (-not $SkipNgrok) {
    Start-Sleep -Seconds 5
    Write-Host "🔗 Getting ngrok URL..." -ForegroundColor Cyan
    try {
        $ngrokUrl = Invoke-RestMethod http://localhost:4040/api/tunnels | 
                    Select-Object -ExpandProperty tunnels | 
                    Where-Object { $_.proto -eq 'https' } | 
                    Select-Object -ExpandProperty public_url
        
        if ($ngrokUrl) {
            Write-Host "   ngrok Public URL: $ngrokUrl" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  ngrok may still be starting..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Ready! Open http://localhost:3000 in your browser" -ForegroundColor Green
Write-Host ""
