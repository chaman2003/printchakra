import os
import subprocess
import sys

import win32print
import win32api

# Get default printer info
printer_name = None
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
    sys.exit(1)

# Use the PDF file
file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "blank.pdf")
print(f"File to print: {file_path}")

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    sys.exit(1)

print("File exists, attempting to print...")

def print_pdf(pdf_path, printer):
    """Print PDF using multiple methods for reliability."""
    
    # Method 1: ShellExecute with "print" verb (uses default PDF handler)
    try:
        print("Method 1: ShellExecute print...")
        win32api.ShellExecute(
            0,           # handle to parent window
            "print",     # operation
            pdf_path,    # file to print
            None,        # parameters
            os.path.dirname(pdf_path),  # working directory
            0            # show command (0 = hide)
        )
        print("✓ Print command sent via ShellExecute")
        return True
    except Exception as e:
        print(f"ShellExecute failed: {e}")
    
    # Method 2: PowerShell Start-Process with PrintTo verb
    try:
        print("Method 2: PowerShell PrintTo...")
        escaped_path = pdf_path.replace("\\", "\\\\")
        escaped_printer = printer.replace("\\", "\\\\")
        ps_cmd = f'Start-Process -FilePath "{escaped_path}" -Verb PrintTo -ArgumentList \\"{escaped_printer}\\" -WindowStyle Hidden'
        
        result = subprocess.run(
            ["powershell", "-Command", ps_cmd],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✓ Print command sent via PowerShell")
            return True
        else:
            print(f"PowerShell returned error: {result.stderr}")
    except Exception as e:
        print(f"PowerShell PrintTo failed: {e}")
    
    # Method 3: Try SumatraPDF if available (best for silent printing)
    sumatra_paths = [
        r"C:\Program Files\SumatraPDF\SumatraPDF.exe",
        r"C:\Program Files (x86)\SumatraPDF\SumatraPDF.exe",
        os.path.expanduser(r"~\AppData\Local\SumatraPDF\SumatraPDF.exe")
    ]
    
    for sumatra_path in sumatra_paths:
        if os.path.exists(sumatra_path):
            try:
                print(f"Method 3: SumatraPDF at {sumatra_path}...")
                subprocess.run(
                    [sumatra_path, "-print-to", printer, "-silent", pdf_path],
                    capture_output=True,
                    timeout=30
                )
                print("✓ Print command sent via SumatraPDF")
                return True
            except Exception as e:
                print(f"SumatraPDF failed: {e}")
    
    # Method 4: Try Adobe Reader if available
    adobe_paths = [
        r"C:\Program Files\Adobe\Acrobat DC\Acrobat\Acrobat.exe",
        r"C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe",
        r"C:\Program Files\Adobe\Acrobat Reader DC\Reader\AcroRd32.exe",
    ]
    
    for adobe_path in adobe_paths:
        if os.path.exists(adobe_path):
            try:
                print(f"Method 4: Adobe Reader at {adobe_path}...")
                subprocess.run(
                    [adobe_path, "/t", pdf_path, printer],
                    capture_output=True,
                    timeout=30
                )
                print("✓ Print command sent via Adobe Reader")
                return True
            except Exception as e:
                print(f"Adobe Reader failed: {e}")
    
    return False

# Execute print
if print_pdf(file_path, printer_name):
    print("\n" + "="*40)
    print("✅ PRINT JOB SENT SUCCESSFULLY")
    print("Check the printer for the blank page.")
    print("="*40)
else:
    print("\n" + "="*40)
    print("❌ ALL PRINT METHODS FAILED")
    print("Please install a PDF viewer (Adobe Reader, SumatraPDF, etc.)")
    print("="*40)
    sys.exit(1)
