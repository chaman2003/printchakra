# PrintChakra - Setup Configuration Tool
# This script helps you set up environment variables

$scriptDir = $PSScriptRoot
$frontendDir = Join-Path $scriptDir "..\frontend"
$backendDir = Join-Path $scriptDir "..\backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PrintChakra Environment Setup Tool" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Choose your setup:" -ForegroundColor Yellow
Write-Host "1. Local Development (localhost)"
Write-Host "2. ngrok Tunnel (remote access)"
Write-Host "3. Deployed Production"
Write-Host "4. Same Network (LAN)"
Write-Host "5. Exit (don't change anything)"
Write-Host ""

$choice = Read-Host "Enter choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "✓ Local Development Setup" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your setup:" -ForegroundColor Cyan
        Write-Host "  Frontend: http://localhost:3000"
        Write-Host "  Backend: http://localhost:5000"
        Write-Host ""
        Write-Host "No configuration needed! The app auto-detects localhost." -ForegroundColor Green
        Write-Host ""
        Write-Host "To start:" -ForegroundColor Yellow
        Write-Host "  Terminal 1: .\backend.ps1"
        Write-Host "  Terminal 2: .\frontend.ps1"
        Write-Host ""
    }

    "2" {
        Write-Host ""
        Write-Host "✓ ngrok Tunnel Setup" -ForegroundColor Green
        Write-Host ""
        
        $ngrokUrl = Read-Host "Enter your ngrok URL (e.g., https://abc123.ngrok-free.dev)"
        
        if ($ngrokUrl -eq "") {
            Write-Host "❌ No URL provided" -ForegroundColor Red
            exit 1
        }

        # Create .env.local for frontend
        $envLocalPath = Join-Path $frontendDir ".env.local"
        $envContent = "REACT_APP_API_URL=$ngrokUrl"
        
        Set-Content -Path $envLocalPath -Value $envContent -Encoding UTF8
        
        Write-Host ""
        Write-Host "✓ Created frontend/.env.local" -ForegroundColor Green
        Write-Host "  Content: REACT_APP_API_URL=$ngrokUrl"
        Write-Host ""
        Write-Host "Your setup:" -ForegroundColor Cyan
        Write-Host "  Frontend: http://localhost:3000"
        Write-Host "  Backend: $ngrokUrl"
        Write-Host ""
        Write-Host "To start:" -ForegroundColor Yellow
        Write-Host "  Terminal 1: .\backend.ps1"
        Write-Host "  Terminal 2: .\ngrok.ps1"
        Write-Host "  Terminal 3: .\frontend.ps1"
        Write-Host ""
        Write-Host "Share URL: $ngrokUrl" -ForegroundColor Green
        Write-Host ""
    }

    "3" {
        Write-Host ""
        Write-Host "✓ Production Deployment Setup" -ForegroundColor Green
        Write-Host ""
        
        $apiUrl = Read-Host "Enter your backend API URL (e.g., https://api.example.com)"
        $frontendUrl = Read-Host "Enter your frontend URL (e.g., https://app.example.com) [optional]"
        
        if ($apiUrl -eq "") {
            Write-Host "❌ Backend URL required" -ForegroundColor Red
            exit 1
        }

        # Create .env.local for frontend
        $envLocalPath = Join-Path $frontendDir ".env.local"
        $envContent = "REACT_APP_API_URL=$apiUrl"
        Set-Content -Path $envLocalPath -Value $envContent -Encoding UTF8
        
        Write-Host ""
        Write-Host "✓ Created frontend/.env.local" -ForegroundColor Green
        Write-Host "  Content: REACT_APP_API_URL=$apiUrl"
        
        # Create .env for backend if frontend URL provided
        if ($frontendUrl -ne "") {
            $backendEnvPath = Join-Path $backendDir ".env"
            $backendEnvContent = @"
FRONTEND_URL=$frontendUrl
FLASK_ENV=production
FLASK_DEBUG=False
"@
            Set-Content -Path $backendEnvPath -Value $backendEnvContent -Encoding UTF8
            Write-Host ""
            Write-Host "✓ Created backend/.env" -ForegroundColor Green
            Write-Host "  FRONTEND_URL=$frontendUrl"
            Write-Host "  FLASK_ENV=production"
        }
        
        Write-Host ""
        Write-Host "Your setup:" -ForegroundColor Cyan
        Write-Host "  Frontend: $apiUrl"
        Write-Host "  Backend: $apiUrl"
        Write-Host ""
        Write-Host "Steps to complete:" -ForegroundColor Yellow
        Write-Host "  1. Deploy backend to production"
        Write-Host "  2. Deploy frontend to production with .env.local"
        Write-Host "  3. Frontend will automatically connect to your backend"
        Write-Host ""
    }

    "4" {
        Write-Host ""
        Write-Host "✓ Same Network (LAN) Setup" -ForegroundColor Green
        Write-Host ""
        
        # Show local IP
        $ipConfig = ipconfig | Select-String "IPv4"
        Write-Host "Your machine IPs:" -ForegroundColor Cyan
        Write-Host $ipConfig
        
        Write-Host ""
        $machineIp = Read-Host "Enter your machine IP (e.g., 192.168.1.100)"
        
        if ($machineIp -eq "") {
            Write-Host "❌ IP address required" -ForegroundColor Red
            exit 1
        }

        # Create .env.local for frontend
        $envLocalPath = Join-Path $frontendDir ".env.local"
        $envContent = "REACT_APP_API_URL=http://$machineIp`:5000"
        
        Set-Content -Path $envLocalPath -Value $envContent -Encoding UTF8
        
        Write-Host ""
        Write-Host "✓ Created frontend/.env.local" -ForegroundColor Green
        Write-Host "  Content: REACT_APP_API_URL=http://$machineIp`:5000"
        Write-Host ""
        Write-Host "Your setup:" -ForegroundColor Cyan
        Write-Host "  Frontend local: http://localhost:3000"
        Write-Host "  Frontend remote: http://$machineIp`:3000"
        Write-Host "  Backend: http://$machineIp`:5000"
        Write-Host ""
        Write-Host "To start:" -ForegroundColor Yellow
        Write-Host "  Terminal 1: .\backend.ps1"
        Write-Host "  Terminal 2: .\frontend.ps1"
        Write-Host ""
        Write-Host "Access from other device on network:" -ForegroundColor Green
        Write-Host "  http://$machineIp`:3000"
        Write-Host ""
    }

    "5" {
        Write-Host "Exiting without changes" -ForegroundColor Yellow
        exit 0
    }

    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 For more information, see:" -ForegroundColor Yellow
Write-Host "   - README_SETUP.md (overview)"
Write-Host "   - QUICKSTART.md (quick start)"
Write-Host "   - NGROK_SETUP.md (detailed guide)"
Write-Host ""
