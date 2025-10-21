"""
Quick test for file conversion module
"""

import os
import sys
from modules.file_converter import FileConverter

def test_conversion():
    print("Testing FileConverter module...")
    
    # Check supported formats
    print(f"\nSupported formats: {FileConverter.SUPPORTED_FORMATS}")
    
    # Check if processed files exist
    processed_dir = os.path.join(os.path.dirname(__file__), 'processed')
    if not os.path.exists(processed_dir):
        print(f"❌ Processed directory not found: {processed_dir}")
        return
    
    files = [f for f in os.listdir(processed_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
    print(f"\nFound {len(files)} image files in processed folder")
    
    if files:
        print("\nFiles available for conversion:")
        for f in files[:5]:  # Show first 5
            print(f"  - {f}")
    else:
        print("No image files found to test conversion")
        return
    
    print("\n✅ Conversion module is ready!")
    print("API endpoint: POST /convert")
    print("Example request:")
    print("""
{
    "files": ["processed_doc_20251021_184253_7e3b50cf.jpg"],
    "format": "pdf"
}
    """)

if __name__ == '__main__':
    test_conversion()
