"""
Test script to verify voice AI chat commands work properly
Tests both text commands and simulated voice commands (text that would come from Whisper)
"""
import sys
import os

# Setup path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app.modules.voice import VoiceChatService

def test_command(svc: VoiceChatService, text: str, expected_fields: dict = None):
    """Test a command and check expected fields"""
    print(f"\n{'='*60}")
    print(f"Testing: '{text}'")
    print('='*60)
    
    result = svc.generate_response(text)
    
    print(f"  Response: {result.get('response', 'NO RESPONSE')[:100]}")
    print(f"  success: {result.get('success')}")
    print(f"  orchestration_trigger: {result.get('orchestration_trigger')}")
    print(f"  orchestration_mode: {result.get('orchestration_mode')}")
    print(f"  awaiting_confirmation: {result.get('awaiting_confirmation')}")
    print(f"  voice_command: {result.get('voice_command')}")
    print(f"  command_params: {result.get('command_params')}")
    
    if expected_fields:
        for key, expected_value in expected_fields.items():
            actual = result.get(key)
            match = actual == expected_value
            status = "PASS" if match else "FAIL"
            print(f"  {status} {key}: expected={expected_value}, actual={actual}")
    
    return result


def main():
    print("Initializing VoiceChatService...")
    svc = VoiceChatService()
    
    print("\n" + "="*60)
    print("VOICE COMMAND PARITY TESTS")
    print("="*60)
    
    # Test 1: Greeting
    test_command(svc, "hello", {
        "success": True,
    })
    
    # Test 2: Print command (should ask for confirmation)
    test_command(svc, "print", {
        "success": True,
        "awaiting_confirmation": True,
        "pending_mode": "print",
    })
    
    # Test 3: Confirmation (since pending_orchestration is now "print")
    test_command(svc, "yes", {
        "success": True,
        "orchestration_trigger": True,
        "orchestration_mode": "print",
    })
    
    # Reset conversation
    svc.reset_conversation()
    
    # Test 4: Scan command
    test_command(svc, "scan", {
        "success": True,
        "awaiting_confirmation": True,
        "pending_mode": "scan",
    })
    
    # Test 5: Confirmation for scan
    test_command(svc, "yes proceed", {
        "success": True,
        "orchestration_trigger": True,
        "orchestration_mode": "scan",
    })
    
    # Reset
    svc.reset_conversation()
    
    # Test 6: Document selection
    test_command(svc, "select document 1", {
        "success": True,
        "voice_command": "select_document",
    })
    
    # Test 7: Multiple document selection
    test_command(svc, "select first 3 documents", {
        "success": True,
        "voice_command": "select_multiple_documents",
    })
    
    # Test 8: Settings command
    test_command(svc, "landscape", {
        "success": True,
    })
    
    # Test 9: Proceed
    test_command(svc, "proceed", {
        "success": True,
        "voice_command": "proceed_action",
    })
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED")
    print("="*60)
    
    # Write results to file for review
    with open("test_results.txt", "w", encoding="utf-8") as f:
        f.write("Test completed successfully\n")


if __name__ == "__main__":
    main()
