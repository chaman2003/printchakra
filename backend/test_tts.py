"""
Simple TTS Test - Verify if pyttsx3 works on your system
"""

import pyttsx3
import sys

print("=" * 60)
print("🔊 Testing Text-to-Speech (pyttsx3)")
print("=" * 60)

try:
    # Initialize engine
    print("\n1. Initializing pyttsx3 engine...")
    engine = pyttsx3.init()
    print("   ✅ Engine initialized")
    
    # Get available voices
    print("\n2. Available voices:")
    voices = engine.getProperty('voices')
    for i, voice in enumerate(voices):
        print(f"   [{i}] {voice.name}")
        print(f"       ID: {voice.id}")
        print(f"       Languages: {voice.languages}")
        print()
    
    # Configure voice
    print("3. Configuring voice...")
    david_voice = None
    for voice in voices:
        if 'david' in voice.name.lower():
            david_voice = voice
            break
    
    if david_voice:
        engine.setProperty('voice', david_voice.id)
        print(f"   ✅ Using voice: {david_voice.name}")
    elif voices:
        engine.setProperty('voice', voices[0].id)
        print(f"   ✅ Using voice: {voices[0].name}")
    
    # Set properties
    engine.setProperty('rate', 200)
    engine.setProperty('volume', 1.0)
    print(f"   Rate: 200 WPM")
    print(f"   Volume: 100%")
    
    # Test speech
    print("\n4. Testing speech output...")
    print("   🔊 You should hear: 'Hello, this is a test'")
    test_text = "Hello, this is a test"
    
    engine.say(test_text)
    print("   ⏳ Waiting for speech to complete...")
    engine.runAndWait()
    print("   ✅ Speech completed")
    
    # Cleanup
    del engine
    
    print("\n" + "=" * 60)
    print("✅ TTS TEST PASSED - Audio should have played")
    print("=" * 60)
    print("\n💡 If you didn't hear anything, check:")
    print("   1. System volume (unmuted?)")
    print("   2. Default audio device")
    print("   3. Windows Sound settings")
    print("   4. Volume mixer (Python.exe muted?)")
    
except Exception as e:
    print(f"\n❌ TTS TEST FAILED")
    print(f"   Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
