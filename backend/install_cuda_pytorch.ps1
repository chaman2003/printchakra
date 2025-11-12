# Install PyTorch with CUDA 11.8 support for NVIDIA RTX 3060
# Run this script to enable GPU acceleration

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Installing PyTorch with CUDA 11.8 Support" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if NVIDIA GPU exists
Write-Host "Checking for NVIDIA GPU..." -ForegroundColor Yellow
try {
    nvidia-smi | Out-Null
    Write-Host "[OK] NVIDIA GPU detected" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] NVIDIA GPU not detected. Please install NVIDIA drivers first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Uninstalling CPU-only PyTorch..." -ForegroundColor Yellow
pip uninstall -y torch torchvision torchaudio

Write-Host ""
Write-Host "Installing PyTorch with CUDA 11.8 support..." -ForegroundColor Yellow
Write-Host "Note: CUDA 11.8 is compatible with your CUDA 13.0 runtime" -ForegroundColor Gray
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

Write-Host ""
Write-Host "Installing Coqui TTS for GPU-accelerated voice..." -ForegroundColor Yellow
pip install TTS>=0.22.0

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Verifying CUDA Installation" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
python -c "import torch; print(f'PyTorch version: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"

Write-Host ""
Write-Host "[OK] Installation complete!" -ForegroundColor Green
Write-Host "Restart your backend server to use GPU acceleration." -ForegroundColor Yellow
