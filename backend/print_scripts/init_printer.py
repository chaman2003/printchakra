"""
Printer Initialization Script
Verifies printer is available and blank.pdf exists
"""
import win32print
import os
import sys

def check_printer():
    """Check if default printer is available and ready"""
    try:
        printer_name = win32print.GetDefaultPrinter()
        print(f"✓ Default printer found: {printer_name}")
        
        # Get printer status
        handle = win32print.OpenPrinter(printer_name)
        printer_info = win32print.GetPrinter(handle, 2)
        win32print.ClosePrinter(handle)
        
        status = printer_info['Status']
        if status == 0:
            print(f"✓ Printer is ready")
            return True, printer_name
        else:
            print(f"⚠ Printer status code: {status}")
            print(f"  (0=Ready, 1=Paused, 2=Error, 4=Pending deletion, etc.)")
            return True, printer_name  # Still usable
            
    except Exception as e:
        print(f"❌ Printer error: {e}")
        return False, None

def check_blank_pdf():
    """Check if blank.pdf exists"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    blank_pdf = os.path.join(script_dir, "blank.pdf")
    
    if os.path.exists(blank_pdf):
        size = os.path.getsize(blank_pdf)
        print(f"✓ blank.pdf found ({size} bytes)")
        return True, blank_pdf
    else:
        print(f"❌ blank.pdf not found at: {blank_pdf}")
        return False, None

def main():
    print("\n" + "="*60)
    print("🖨️  PRINTER INITIALIZATION CHECK")
    print("="*60 + "\n")
    
    # Check printer
    printer_ok, printer_name = check_printer()
    
    # Check blank.pdf
    pdf_ok, pdf_path = check_blank_pdf()
    
    print("\n" + "="*60)
    if printer_ok and pdf_ok:
        print("✅ PRINTER SYSTEM READY")
        print(f"   Printer: {printer_name}")
        print(f"   PDF: {pdf_path}")
        print("="*60 + "\n")
        return 0
    else:
        print("❌ PRINTER SYSTEM NOT READY")
        if not printer_ok:
            print("   - No printer available")
        if not pdf_ok:
            print("   - blank.pdf missing")
        print("="*60 + "\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
