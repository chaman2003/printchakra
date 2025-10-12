import win32print
import os
import subprocess

# Get default printer info
try:
    printer_name = win32print.GetDefaultPrinter()
    print(f"Default printer: {printer_name}")
    
    # Check printer status
    handle = win32print.OpenPrinter(printer_name)
    printer_info = win32print.GetPrinter(handle, 2)
    win32print.ClosePrinter(handle)
    print(f"Printer status: {printer_info['Status']}")
    
except Exception as e:
    print(f"Error getting printer info: {e}")

# Use the blank PDF file
file_path = os.path.join(os.getcwd(), "blank.pdf")
print(f"File to print: {file_path}")

if os.path.exists(file_path):
    print("File exists, attempting to print...")
    
    # Print using PowerShell Out-Printer (working method)
    try:
        print("Printing using PowerShell...")
        powershell_cmd = f'Get-Content "{file_path}" -Raw | Out-Printer -Name "{printer_name}"'
        result = subprocess.run([
            'powershell.exe', '-Command', powershell_cmd
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("Successfully printed!")
        else:
            print(f"PowerShell failed: {result.stderr}")
            
    except Exception as e:
        print(f"Printing failed: {e}")
        
else:
    print(f"File not found: {file_path}")
