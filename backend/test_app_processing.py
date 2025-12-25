"""
Quick test of the updated process_document_image function
"""
import sys
import os

# Add backend to path
sys.path.insert(0, r"C:\Users\chama\OneDrive\Desktop\printchakra\backend")
os.chdir(r"C:\Users\chama\OneDrive\Desktop\printchakra\backend")

# Mock socketio before importing app
class MockSocketIO:
    def emit(self, *args, **kwargs):
        pass

import app as main_app
main_app.socketio = MockSocketIO()

# Now test the processing
INPUT = r"C:\Users\chama\OneDrive\Desktop\printchakra\original.jpg"
OUTPUT = r"C:\Users\chama\OneDrive\Desktop\printchakra\test_outputs\APP_TEST_OUTPUT.jpg"

print("Testing updated process_document_image from app.py...")
print("=" * 60)

success, text, new_filename = main_app.process_document_image(INPUT, OUTPUT, "test.jpg")

print("\n" + "=" * 60)
print(f"Success: {success}")
print(f"Text length: {len(text)} characters")
print(f"Filename: {new_filename}")
print("=" * 60)

# Open the result
import subprocess
subprocess.Popen(['start', '', OUTPUT], shell=True)
