"""
Test script for PrintChakra API endpoints
Tests the new modular processing system
"""

import json
import os

import requests

BASE_URL = "http://localhost:5000"


def test_health():
    """Test health endpoint"""
    print("\n🔍 Testing /health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(json.dumps(data, indent=2))
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_index():
    """Test index endpoint"""
    print("\n🔍 Testing / endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Index endpoint passed!")
            print(json.dumps(data, indent=2))
            return True
        else:
            print(f"❌ Index check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_pipeline_info():
    """Test pipeline info endpoint"""
    print("\n🔍 Testing /pipeline/info endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/pipeline/info")
        if response.status_code == 200:
            data = response.json()
            print("✅ Pipeline info retrieved successfully!")
            print(json.dumps(data, indent=2))
            return True
        else:
            print(f"❌ Pipeline info failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_files_list():
    """Test files listing endpoint"""
    print("\n🔍 Testing /files endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/files")
        if response.status_code == 200:
            data = response.json()
            print("✅ Files listing passed!")
            print(f"Found {len(data.get('files', []))} files")
            return True
        else:
            print(f"❌ Files listing failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_validate_quality():
    """Test quality validation with a sample image"""
    print("\n🔍 Testing /validate/quality endpoint...")

    # Check if there's a sample image in uploads
    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    if not os.path.exists(uploads_dir):
        print("⚠️ Uploads directory not found")
        return False

    files = [f for f in os.listdir(uploads_dir) if f.endswith((".jpg", ".jpeg", ".png"))]
    if not files:
        print("⚠️ No sample images found in uploads directory")
        return False

    sample_file = files[0]
    print(f"   Using sample file: {sample_file}")

    try:
        file_path = os.path.join(uploads_dir, sample_file)
        with open(file_path, "rb") as f:
            files_data = {"file": (sample_file, f, "image/jpeg")}
            response = requests.post(f"{BASE_URL}/validate/quality", files=files_data)

        if response.status_code == 200:
            data = response.json()
            print("✅ Quality validation passed!")
            print(json.dumps(data, indent=2))
            return True
        else:
            print(f"❌ Quality validation failed: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("PrintChakra API Test Suite")
    print("=" * 60)

    results = {
        "Health Check": test_health(),
        "Index Endpoint": test_index(),
        "Pipeline Info": test_pipeline_info(),
        "Files Listing": test_files_list(),
        "Quality Validation": test_validate_quality(),
    }

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:.<40} {status}")

    print("=" * 60)
    print(f"Total: {passed}/{total} tests passed")
    print("=" * 60)

    return passed == total


if __name__ == "__main__":
    import sys

    success = main()
    sys.exit(0 if success else 1)
