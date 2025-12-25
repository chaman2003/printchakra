import requests
import json
import time

BASE_URL = "http://localhost:5000"

uploaded_filename = None

# Step 1: Upload test image
print("\n[1] Uploading test image...")
try:
    with open('public/data/uploads/test_invoice.jpg', 'rb') as f:
        files = {'file': f}
        response = requests.post(f"{BASE_URL}/upload", files=files, timeout=30)
        
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        uploaded_filename = data.get('filename')
        print(f"Uploaded filename: {uploaded_filename}")
    except:
        print(f"Response text: {response.text[:500]}")
except Exception as e:
    print(f"Upload error: {e}")

# Wait for processing
print("\n[2] Waiting for background processing (15 seconds)...")
time.sleep(15)

# Step 2: Request OCR on processed file
if uploaded_filename:
    # The filename returned is already the processed one
    print(f"\n[3] Requesting OCR on: {uploaded_filename}")
    
    response = requests.post(f"{BASE_URL}/ocr/process/{uploaded_filename}", timeout=60)
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        if data.get('success'):
            print(f"✓ OCR succeeded with original filename")
            print(f"  Words detected: {data.get('ocr_result', {}).get('word_count', 0)}")
        else:
            print(f"✗ OCR failed: {data.get('error')}")
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(f"Response: {response.text[:500]}")

# Step 3: Check what files exist
import os
processed_dir = 'public/data/processed'
print(f"\n[4] Files in processed directory:")
if os.path.exists(processed_dir):
    files = os.listdir(processed_dir)
    for f in files:
        print(f"   - {f}")
else:
    print("   Directory not found")

print("\nTest complete!")
