import win32print
import os
import subprocess
import sys

print("="*60)
print("🖨️  PRINT SCRIPT STARTED")
print("="*60)

# Get default printer info
try:
    printer_name = win32print.GetDefaultPrinter()
    print(f"✓ Default printer: {printer_name}")
    
    # Check printer status
    handle = win32print.OpenPrinter(printer_name)
    printer_info = win32print.GetPrinter(handle, 2)
    win32print.ClosePrinter(handle)
    
    status = printer_info['Status']
    if status == 0:
        print(f"✓ Printer status: Ready")
    else:
        print(f"⚠ Printer status code: {status}")
    
except Exception as e:
    print(f"❌ Error getting printer info: {e}")
    sys.exit(1)

# Use the PDF file - check current directory first, then script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(script_dir, "blank.pdf")

print(f"📄 Looking for: {file_path}")

if os.path.exists(file_path):
    print(f"✓ File exists ({os.path.getsize(file_path)} bytes)")
    
    # Print using PowerShell Out-Printer (most reliable method)
    try:
        print("🖨️  Sending to printer via PowerShell...")
        powershell_cmd = f'Get-Content "{file_path}" -Raw | Out-Printer -Name "{printer_name}"'
        result = subprocess.run(
            ['powershell.exe', '-Command', powershell_cmd],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Successfully sent to printer!")
            print("="*60)
            sys.exit(0)
        else:
            print(f"❌ PowerShell error: {result.stderr}")
            print("="*60)
            sys.exit(1)
            
    except subprocess.TimeoutExpired:
        print(f"❌ Print command timed out after 30 seconds")
        print("="*60)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Printing failed: {e}")
        print("="*60)
        sys.exit(1)
        
else:
    print(f"❌ File not found: {file_path}")
    print(f"   Current directory: {os.getcwd()}")
    print(f"   Script directory: {script_dir}")
    print("="*60)
    sys.exit(1)
