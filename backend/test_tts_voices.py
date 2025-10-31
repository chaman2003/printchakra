"""
Test script to list all available TTS voices and test Microsoft Ravi
"""
import pyttsx3

def list_voices():
    """List all available TTS voices"""
    print("=" * 70)
    print("Available TTS Voices:")
    print("=" * 70)
    
    engine = pyttsx3.init('sapi5')
    voices = engine.getProperty('voices')
    
    for i, voice in enumerate(voices):
        print(f"\n{i+1}. Voice ID: {voice.id}")
        print(f"   Name: {voice.name}")
        print(f"   Languages: {voice.languages}")
        print(f"   Gender: {voice.gender if hasattr(voice, 'gender') else 'N/A'}")
        print(f"   Age: {voice.age if hasattr(voice, 'age') else 'N/A'}")
    
    print("\n" + "=" * 70)
    
    # Try to find Ravi
    ravi_voice = None
    for voice in voices:
        if 'ravi' in voice.name.lower():
            ravi_voice = voice
            print(f"\n✅ Found Microsoft Ravi: {voice.name}")
            print(f"   Voice ID: {voice.id}")
            break
    
    if not ravi_voice:
        print("\n❌ Microsoft Ravi voice not found!")
        print("   Available voices are listed above.")
        print("\nTo install Microsoft Ravi:")
        print("1. Open Windows Settings")
        print("2. Go to Time & Language > Speech")
        print("3. Click 'Manage voices'")
        print("4. Click 'Add voices'")
        print("5. Search for 'Microsoft Ravi' (Hindi - India)")
        print("6. Download and install")
        return None
    
    return ravi_voice

def test_ravi():
    """Test Microsoft Ravi voice"""
    print("\n" + "=" * 70)
    print("Testing Microsoft Ravi Voice")
    print("=" * 70)
    
    try:
        engine = pyttsx3.init('sapi5')
        voices = engine.getProperty('voices')
        
        ravi_voice = None
        for voice in voices:
            if 'ravi' in voice.name.lower():
                ravi_voice = voice
                break
        
        if not ravi_voice:
            print("❌ Microsoft Ravi not found. Using default voice.")
            if voices:
                engine.setProperty('voice', voices[0].id)
                print(f"Using: {voices[0].name}")
        else:
            engine.setProperty('voice', ravi_voice.id)
            print(f"✅ Using Microsoft Ravi: {ravi_voice.name}")
        
        engine.setProperty('rate', 220)
        engine.setProperty('volume', 0.9)
        
        test_text = "Hello! This is a test of the text to speech system. Microsoft Ravi is now speaking."
        print(f"\nSpeaking: {test_text}")
        
        engine.say(test_text)
        engine.runAndWait()
        
        print("✅ TTS test completed successfully!")
        
        engine.stop()
        del engine
        
    except Exception as e:
        print(f"❌ Error testing TTS: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("\n🔍 Checking Available TTS Voices...\n")
    ravi = list_voices()
    
    print("\n")
    test_input = input("Do you want to test the voice? (y/n): ")
    
    if test_input.lower() == 'y':
        test_ravi()
    
    print("\n✅ Script completed!")
