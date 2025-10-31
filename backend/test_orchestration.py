"""
AI Orchestration System Test Suite
Quick verification that all components are working
"""

import json
import sys
from datetime import datetime

import requests

# Configuration
BASE_URL = "http://localhost:5000"
TIMEOUT = 5

# Color codes for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")


def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")


def print_error(text):
    print(f"{RED}❌ {text}{RESET}")


def print_info(text):
    print(f"{YELLOW}ℹ️  {text}{RESET}")


def test_health():
    """Test basic health endpoint"""
    print_info("Testing backend health...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Backend is healthy: {data.get('service', 'Unknown')}")
            print_info(f"   Version: {data.get('version', 'Unknown')}")
            return True
        else:
            print_error(f"Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"Cannot connect to backend: {e}")
        return False


def test_orchestration_status():
    """Test orchestration status endpoint"""
    print_info("Testing orchestration status...")
    try:
        response = requests.get(f"{BASE_URL}/orchestrate/status", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            print_success("Orchestration service is available")
            print_info(f"   State: {data.get('current_state', 'unknown')}")
            print_info(f"   Message: {data.get('message', 'N/A')}")
            return True
        else:
            print_error(f"Status check failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Status check error: {e}")
        return False


def test_orchestration_command(command):
    """Test orchestration command processing"""
    print_info(f"Testing command: '{command}'")
    try:
        response = requests.post(
            f"{BASE_URL}/orchestrate/command",
            json={"command": command},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_success(f"Command processed successfully")
                print_info(f"   Intent: {data.get('intent', 'unknown')}")
                print_info(f"   Message: {data.get('message', 'N/A')}")
                print_info(f"   Requires confirmation: {data.get('requires_confirmation', False)}")
                return True, data
            else:
                print_error(f"Command failed: {data.get('error', 'Unknown')}")
                return False, None
        else:
            print_error(f"Command failed: {response.status_code}")
            return False, None
    except Exception as e:
        print_error(f"Command error: {e}")
        return False, None


def test_orchestration_cancel():
    """Test orchestration cancellation"""
    print_info("Testing action cancellation...")
    try:
        response = requests.post(f"{BASE_URL}/orchestrate/cancel", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_success("Cancellation successful")
                return True
            else:
                print_info(f"   {data.get('message', 'No action to cancel')}")
                return True  # Not an error
        else:
            print_error(f"Cancel failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cancel error: {e}")
        return False


def test_orchestration_reset():
    """Test orchestration reset"""
    print_info("Resetting orchestrator state...")
    try:
        response = requests.post(f"{BASE_URL}/orchestrate/reset", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_success("Reset successful")
                return True
            else:
                print_error(f"Reset failed: {data.get('message', 'Unknown')}")
                return False
        else:
            print_error(f"Reset failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Reset error: {e}")
        return False


def test_orchestration_documents():
    """Test document listing"""
    print_info("Testing document listing...")
    try:
        response = requests.get(f"{BASE_URL}/orchestrate/documents", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                count = data.get("count", 0)
                print_success(f"Document listing successful: {count} documents")
                if count > 0:
                    print_info(f"   First document: {data['documents'][0]['filename']}")
                return True
            else:
                print_error(f"Listing failed: {data.get('error', 'Unknown')}")
                return False
        else:
            print_error(f"Listing failed: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Listing error: {e}")
        return False


def test_voice_status():
    """Test voice AI status"""
    print_info("Testing voice AI system...")
    try:
        response = requests.get(f"{BASE_URL}/voice/status", timeout=TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            print_success("Voice AI system available")
            print_info(f"   Whisper loaded: {data.get('whisper_loaded', False)}")
            print_info(f"   Ollama available: {data.get('ollama_available', False)}")
            return True
        else:
            print_info("Voice AI may not be available (optional)")
            return True  # Non-critical
    except Exception as e:
        print_info("Voice AI not available (optional)")
        return True  # Non-critical


def run_all_tests():
    """Run complete test suite"""
    print_header("🤖 AI ORCHESTRATION SYSTEM TEST SUITE")
    print(f"Testing backend at: {BASE_URL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    results = []

    # Test 1: Health check
    print_header("Test 1: Backend Health")
    results.append(("Health Check", test_health()))

    if not results[-1][1]:
        print_error("\n❌ Backend is not running!")
        print_info("Please start the backend with: cd backend && python app.py")
        return False

    # Test 2: Orchestration status
    print_header("Test 2: Orchestration Status")
    results.append(("Orchestration Status", test_orchestration_status()))

    # Test 3: Document listing
    print_header("Test 3: Document Listing")
    results.append(("Document Listing", test_orchestration_documents()))

    # Test 4: Command - Help
    print_header("Test 4: Help Command")
    success, data = test_orchestration_command("help")
    results.append(("Help Command", success))

    # Test 5: Command - List Documents
    print_header("Test 5: List Documents Command")
    success, data = test_orchestration_command("list documents")
    results.append(("List Command", success))

    # Test 6: Command - Print Intent (will require confirmation)
    print_header("Test 6: Print Command")
    success, data = test_orchestration_command("print this document")
    results.append(("Print Command", success))

    # Test 7: Cancel pending action
    print_header("Test 7: Cancel Action")
    results.append(("Cancel Action", test_orchestration_cancel()))

    # Test 8: Reset orchestrator
    print_header("Test 8: Reset State")
    results.append(("Reset State", test_orchestration_reset()))

    # Test 9: Voice AI status (optional)
    print_header("Test 9: Voice AI System")
    results.append(("Voice AI Status", test_voice_status()))

    # Print summary
    print_header("📊 TEST RESULTS SUMMARY")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"   {name:30} {status}")

    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print(f"{GREEN}✅ ALL TESTS PASSED - System is fully operational!{RESET}")
        print(f"\n{BLUE}Next steps:{RESET}")
        print(f"1. Start frontend: cd frontend && npm start")
        print(f"2. Click 'AI Orchestration' button")
        print(f"3. Try voice commands: 'Talk with PrintChakra AI'")
        return True
    else:
        print(f"{YELLOW}⚠️  Some tests failed - check errors above{RESET}")
        return False


if __name__ == "__main__":
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Tests interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Unexpected error: {e}{RESET}")
        sys.exit(1)
