#!/usr/bin/env python3
"""
Printer Test Script
Simplified version: Prints blank.pdf using the default printer.
"""

import os
import sys
import time
import logging
import subprocess
import win32print
import win32api
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

# Paths
BACKEND_ROOT = Path(__file__).parent.parent.parent
BLANK_PDF_PATH = BACKEND_ROOT / 'public' / 'blank.pdf'

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
    """Print PDF using default system handler."""
    logger.info(f"Printing {pdf_path.name} to {printer_name}...")
    
    # Method 1: PowerShell Start-Process (Best for Windows 10/11)
    try:
        cmd = f'Start-Process -FilePath "{pdf_path}" -Verb PrintTo -ArgumentList "{printer_name}" -Wait -WindowStyle Hidden'
        subprocess.run(["powershell", "-Command", cmd], check=True)
        logger.info("✓ Sent to printer via PowerShell")
        return True
    except subprocess.CalledProcessError as e:
        logger.warning("PowerShell print failed. This usually means no default PDF viewer is installed.")
        logger.warning("Windows requires a PDF viewer (like Adobe Reader) to print PDFs.")

    # Method 2: ShellExecute (Fallback)
    try:
        win32api.ShellExecute(0, "printto", str(pdf_path), f'"{printer_name}"', ".", 0)
        logger.info("✓ Sent to printer via ShellExecute")
        return True
    except Exception as e:
        logger.error(f"ShellExecute failed: {e}")
        print("\n" + "!"*50)
        print("CRITICAL ERROR: NO PDF VIEWER FOUND")
        print("!"*50)
        print("Windows cannot print PDF files natively without a helper application.")
        print("Please install one of the following:")
        print("1. Adobe Acrobat Reader (Recommended)")
        print("2. Foxit Reader")
        print("3. SumatraPDF")
        print("\nAfter installing, set it as the default app for .pdf files.")
        print("!"*50 + "\n")
    
    return False

def main():
    print("\n" + "="*40)
    print("SIMPLE PRINTER TEST")
    print("="*40 + "\n")

    # 1. Check file
    if not BLANK_PDF_PATH.exists():
        logger.error(f"✗ File not found: {BLANK_PDF_PATH}")
        sys.exit(1)
    
    # 2. Get printer
    printer_name = get_default_printer()
    if not printer_name:
        logger.error("✗ No default printer found.")
        sys.exit(1)
        
    logger.info(f"Printer: {printer_name}")
    logger.info(f"File:    {BLANK_PDF_PATH.name}")
    print("-" * 40)

    # 3. Print
    if print_pdf(BLANK_PDF_PATH, printer_name):
        print("\n" + "="*40)
        print("✅ TEST COMPLETED")
        print("Check the printer for a blank page.")
        print("="*40 + "\n")
    else:
        print("\n" + "="*40)
        print("❌ TEST FAILED")
        print("="*40 + "\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
