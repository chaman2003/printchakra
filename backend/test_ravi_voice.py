"""
Test OneCore Ravi voice directly
"""
import sys
sys.path.insert(0, '.')

from modules.voice_ai import speak_text

print("Testing Microsoft Ravi OneCore voice...")
print("=" * 70)

test_text = "Hello! This is Microsoft Ravi speaking. Testing the text to speech system with OneCore voices."

success = speak_text(test_text)

if success:
    print("\n✅ Microsoft Ravi TTS test completed!")
else:
    print("\n❌ TTS test failed!")
