# Cleanup script - Kill all Flask and ngrok processes

Write-Host "Stopping all Flask and ngrok processes..." -ForegroundColor Yellow

# Kill Python processes
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "✓ Stopped $($pythonProcesses.Count) Python process(es)" -ForegroundColor Green
} else {
    Write-Host "✓ No Python processes running" -ForegroundColor Gray
}

# Kill ngrok processes
$ngrokProcesses = Get-Process ngrok -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    $ngrokProcesses | Stop-Process -Force
    Write-Host "✓ Stopped $($ngrokProcesses.Count) ngrok process(es)" -ForegroundColor Green
} else {
    Write-Host "✓ No ngrok processes running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "All processes cleaned up!" -ForegroundColor Cyan
Write-Host "Ready to run .\backend.ps1" -ForegroundColor Cyan
