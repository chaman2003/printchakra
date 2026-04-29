$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$PipecatDir = Join-Path $Root "pipecat-web-voice"
$NgrokDomain = "freezingly-nonsignificative-edison.ngrok-free.dev"
$MlBasePython = "C:/Python/envs/ml-base/Scripts/python.exe"

Write-Host "Starting PrintChakra stack..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$BackendDir'; if (Test-Path '$MlBasePython') { & '$MlBasePython' app.py } else { python app.py }"
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$PipecatDir'; if (Test-Path '$MlBasePython') { & '$MlBasePython' run_backend.py } else { python run_backend.py }"
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$FrontendDir'; npm run dev"
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "ngrok http --domain=$NgrokDomain 5000"
)

Write-Host "Launched backend, pipecat, and frontend in separate PowerShell windows." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000 | Backend: http://localhost:5000 | Pipecat: http://localhost:8765 | Ngrok: https://$NgrokDomain" -ForegroundColor Green
