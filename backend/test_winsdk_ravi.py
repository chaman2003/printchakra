"""
Ravi TTS using Python with Windows Runtime
"""
import asyncio
import tempfile
import os
from pathlib import Path

try:
    # Import Windows Runtime
    import winsdk.windows.media.speechsynthesis as speechsynthesis
    import winsdk.windows.storage.streams as streams
    
    async def speak_with_ravi_async(text: str) -> bool:
        """Speak text using Microsoft Ravi via Windows Runtime"""
        try:
            # Create synthesizer
            synth = speechsynthesis.SpeechSynthesizer()
            
            # List all voices
            all_voices = speechsynthesis.SpeechSynthesizer.all_voices
            print("\nAvailable Windows Runtime voices:")
            for voice in all_voices:
                print(f"  - {voice.display_name} [{voice.language}]")
            
            # Find Ravi voice
            ravi_voice = None
            for voice in all_voices:
                if 'ravi' in voice.display_name.lower():
                    ravi_voice = voice
                    break
            
            if not ravi_voice:
                print("❌ Ravi voice not found!")
                return False
            
            print(f"\n✅ Using voice: {ravi_voice.display_name}")
            synth.voice = ravi_voice
            
            # Synthesize speech to stream
            print(f"Speaking: {text}")
            stream = await synth.synthesize_text_to_stream_async(text)
            
            # Save to temporary WAV file
            temp_file = os.path.join(tempfile.gettempdir(), 'ravi_tts.wav')
            
            # Read stream and save to file
            reader = streams.DataReader(stream)
            await reader.load_async(stream.size)
            
            with open(temp_file, 'wb') as f:
                buffer = reader.read_buffer(stream.size)
                # Convert buffer to bytes
                data = bytes(buffer)
                f.write(data)
            
            reader.close()
            stream.close()
            
            # Play the audio file
            import winsound
            winsound.PlaySound(temp_file, winsound.SND_FILENAME)
            
            # Cleanup
            try:
                os.remove(temp_file)
            except:
                pass
            
            print("✅ Speech completed!")
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def speak_with_ravi(text: str) -> bool:
        """Synchronous wrapper"""
        return asyncio.run(speak_with_ravi_async(text))
    
    # Test
    if __name__ == "__main__":
        print("=" * 70)
        print("Testing Microsoft Ravi with Windows Runtime")
        print("=" * 70)
        
        test_text = "Hello! This is Microsoft Ravi speaking. Testing the text to speech system."
        success = speak_with_ravi(test_text)
        
        if success:
            print("\n✅ Test completed successfully!")
        else:
            print("\n❌ Test failed!")

except ImportError as e:
    print(f"❌ Windows SDK not available: {e}")
    print("Install with: pip install winsdk")
