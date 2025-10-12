# Run backend and ngrok in separate terminals

$backendPath = "c:\Users\chama\OneDrive\Desktop\printchakra\backend"

# Start backend
Start-Process powershell.exe -ArgumentList "-NoExit", "cd '$backendPath'; & '.\venv\Scripts\Activate.ps1'; python app.py"

# Start ngrok
Start-Process powershell.exe -ArgumentList "-NoExit", "ngrok http --domain=freezingly-nonsignificative-edison.ngrok-free.dev 5000"