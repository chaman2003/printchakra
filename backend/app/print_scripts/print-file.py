#!/usr/bin/env python3
"""
Print File Script
Prints blank.pdf using the default printer.
Uses the same proven approach as printer_test.py
"""

import os
import sys
import subprocess
import win32print
import win32api
from pathlib import Path

# Paths - same as printer_test.py
SCRIPT_DIR = Path(__file__).parent
BLANK_PDF_PATH = SCRIPT_DIR / "blank.pdf"

def get_default_printer():
    """Get the default printer name."""
    try:
        printer_name = win32print.GetDefaultPrinter()
        if printer_name:
            return printer_name
    except Exception:
        pass
    return None

def print_pdf(pdf_path, printer_name):
    """Print PDF using default system handler - same as printer_test.py."""
    print(f"Printing {pdf_path.name} to {printer_name}...")
    
    # Method 1: PowerShell Start-Process (Best for Windows 10/11)
    try:
        cmd = f'Start-Process -FilePath "{pdf_path}" -Verb PrintTo -ArgumentList "{printer_name}" -Wait -WindowStyle Hidden'
        subprocess.run(["powershell", "-Command", cmd], check=True, timeout=30)
        print("✓ Sent to printer via PowerShell")
        return True
    except subprocess.CalledProcessError:
        print("PowerShell print failed. Trying fallback...")
    except subprocess.TimeoutExpired:
        print("PowerShell print timed out. Trying fallback...")

    # Method 2: ShellExecute (Fallback)
    try:
        win32api.ShellExecute(0, "printto", str(pdf_path), f'"{printer_name}"', ".", 0)
        print("✓ Sent to printer via ShellExecute")
        return True
    except Exception as e:
        print(f"ShellExecute failed: {e}")
    
    return False

def main():
    print("\n" + "="*40)
    print("PRINT BLANK PDF")
    print("="*40 + "\n")

    # 1. Check file
    if not BLANK_PDF_PATH.exists():
        print(f"✗ File not found: {BLANK_PDF_PATH}")
        sys.exit(1)
    
    # 2. Get printer
    printer_name = get_default_printer()
    if not printer_name:
        print("✗ No default printer found.")
        sys.exit(1)
        
    print(f"Printer: {printer_name}")
    print(f"File:    {BLANK_PDF_PATH.name}")
    print("-" * 40)

    # 3. Print
    if print_pdf(BLANK_PDF_PATH, printer_name):
        print("\n" + "="*40)
        print("✅ PRINT JOB SENT")
        print("Check the printer for output.")
        print("="*40 + "\n")
    else:
        print("\n" + "="*40)
        print("❌ PRINT FAILED")
        print("="*40 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
