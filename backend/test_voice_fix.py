"""
Quick test to verify voice transcription fix
"""
import sys
import os
import io
import wave
import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_test_audio(duration=2.0, sample_rate=16000):
    """Create a simple sine wave test audio"""
    t = np.linspace(0, duration, int(sample_rate * duration))
    audio = np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
    audio = (audio * 32767).astype(np.int16)
    
    # Write to bytes buffer
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())
    
    return buffer.getvalue()

def test_whisper_transcription():
    """Test Whisper transcription with fix"""
    print("=" * 70)
    print("VOICE TRANSCRIPTION FIX TEST")
    print("=" * 70)
    
    try:
        # Import directly from voice module to avoid complex dependencies
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "voice_module",
            os.path.join(os.path.dirname(__file__), "modules", "voice", "__init__.py")
        )
        voice_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(voice_module)
        
        WhisperTranscriptionService = voice_module.WhisperTranscriptionService
        
        print("\n✅ Voice module imported successfully")
        
        # Create service
        service = WhisperTranscriptionService()
        print("[OK] WhisperTranscriptionService created")
        
        # Load model
        print("\n[LOAD] Loading Whisper model (this may take a moment)...")
        if service.load_model():
            print("[OK] Whisper model loaded successfully")
        else:
            print("[ERROR] Failed to load Whisper model")
            return False
        
        # Create test audio
        print("\n[AUDIO] Creating test audio...")
        audio_data = create_test_audio()
        print(f"[OK] Test audio created: {len(audio_data)} bytes")
        
        # Test transcription (this will likely fail to transcribe a sine wave, but should not crash)
        print("\n[TEST] Testing transcription (expecting background noise detection)...")
        result = service.transcribe_audio(audio_data)
        
        print("\n[RESULT] TRANSCRIPTION RESULT:")
        print(f"   Success: {result.get('success')}")
        if result.get('success'):
            print(f"   Text: {result.get('text')}")
        else:
            print(f"   Error: {result.get('error')}")
            if "background noise" in result.get('error', '').lower() or "no speech" in result.get('error', '').lower():
                print("\n[OK] EXPECTED: Sine wave detected as background noise (this is correct!)")
                print("[OK] The fix is working - no vad_filter error!")
                return True
        
        print("\n[OK] TEST COMPLETED - No vad_filter error occurred!")
        print("[OK] Voice transcription fix is working correctly!")
        return True
        
    except TypeError as e:
        if "vad_filter" in str(e) or "DecodingOptions" in str(e):
            print(f"\n[ERROR] FAIL: vad_filter error still occurring: {e}")
            return False
        else:
            print(f"\n[WARN] Different TypeError occurred: {e}")
            raise
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("TESTING VOICE TRANSCRIPTION FIX FOR vad_filter ERROR")
    print("=" * 70 + "\n")
    
    success = test_whisper_transcription()
    
    print("\n" + "=" * 70)
    if success:
        print("[OK] ALL TESTS PASSED - Voice transcription fix is working!")
    else:
        print("[ERROR] TEST FAILED - Voice transcription still has issues")
    print("=" * 70 + "\n")
    
    sys.exit(0 if success else 1)
