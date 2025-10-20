# Run backend and ngrok in separate terminals

$backendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend"

# Start backend
Start-Process powershell.exe -ArgumentList "-NoExit", "cd '$backendPath'; & '.\venv\Scripts\Activate.ps1'; python app.py"

# Start ngrok with browser warning disabled
Start-Process powershell.exe -ArgumentList "-NoExit", "ngrok http --domain=freezingly-nonsignificative-edison.ngrok-free.dev --request-header-add='ngrok-skip-browser-warning:true' 5000"