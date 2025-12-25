#!/usr/bin/env python3
"""
Quick test to verify VoiceChatService and VoiceAIOrchestrator initialization
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def test_imports():
    """Test that all voice modules import correctly"""
    print("Testing imports...")
    
    try:
        from app.modules.voice import VoiceAIOrchestrator, VoiceChatService, WhisperTranscriptionService
        print("✓ Successfully imported VoiceAIOrchestrator, VoiceChatService, WhisperTranscriptionService")
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    
    return True


def test_orchestrator_initialization():
    """Test that VoiceAIOrchestrator initializes with chat_service"""
    print("\nTesting VoiceAIOrchestrator initialization...")
    
    try:
        from app.modules.voice import voice_ai_orchestrator
        
        # Check that chat_service attribute exists
        if not hasattr(voice_ai_orchestrator, 'chat_service'):
            print("✗ voice_ai_orchestrator does not have 'chat_service' attribute")
            return False
        
        print(f"✓ voice_ai_orchestrator.chat_service exists: {type(voice_ai_orchestrator.chat_service)}")
        
        # Check that chat_service has required methods
        required_methods = ['generate_response', 'check_ollama_available', 'is_available', 'reset_conversation']
        for method in required_methods:
            if not hasattr(voice_ai_orchestrator.chat_service, method):
                print(f"✗ chat_service missing method: {method}")
                return False
            print(f"✓ chat_service.{method} exists")
        
        return True
        
    except Exception as e:
        print(f"✗ Initialization error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("VoiceAIOrchestrator Fix Verification")
    print("=" * 60)
    
    if not test_imports():
        print("\n✗ Import test FAILED")
        return 1
    
    if not test_orchestrator_initialization():
        print("\n✗ Initialization test FAILED")
        return 1
    
    print("\n" + "=" * 60)
    print("✓ All tests PASSED - Fix is working!")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
