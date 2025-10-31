"""
Enhanced TTS with OneCore voice support (Microsoft Ravi)
"""
import subprocess
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

def speak_with_powershell(text: str, voice_name: str = "Microsoft Ravi") -> bool:
    """
    Use PowerShell to speak with OneCore voices (like Microsoft Ravi)
    
    Args:
        text: Text to speak
        voice_name: Voice name (default: Microsoft Ravi)
        
    Returns:
        bool: True if successful
    """
    try:
        # PowerShell script to use Speech Synthesis
        ps_script = f"""
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer

# Try to select the specified voice
$voices = $speak.GetInstalledVoices()
$targetVoice = $voices | Where-Object {{ $_.VoiceInfo.Name -like "*{voice_name}*" }}

if ($targetVoice) {{
    $speak.SelectVoice($targetVoice.VoiceInfo.Name)
    Write-Host "Using voice: $($targetVoice.VoiceInfo.Name)"
}} else {{
    Write-Host "Voice {voice_name} not found, using default"
}}

$speak.Rate = 1
$speak.Volume = 100
$speak.Speak("{text.replace('"', '`"')}")
$speak.Dispose()
"""
        
        # Execute PowerShell
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            logger.info(f"✅ PowerShell TTS: {result.stdout.strip()}")
            return True
        else:
            logger.error(f"❌ PowerShell TTS failed: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ PowerShell TTS error: {e}")
        return False


def list_all_voices():
    """List all available voices including OneCore"""
    ps_script = """
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $speak.GetInstalledVoices()

foreach ($voice in $voices) {
    $info = $voice.VoiceInfo
    Write-Host "Name: $($info.Name)"
    Write-Host "Culture: $($info.Culture)"
    Write-Host "Gender: $($info.Gender)"
    Write-Host "Age: $($info.Age)"
    Write-Host "---"
}
$speak.Dispose()
"""
    
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_script],
        capture_output=True,
        text=True
    )
    
    print(result.stdout)


if __name__ == "__main__":
    print("Listing all available voices:")
    print("=" * 70)
    list_all_voices()
    
    print("\nTesting Microsoft Ravi voice:")
    print("=" * 70)
    success = speak_with_powershell("Hello! This is Microsoft Ravi speaking. Testing the text to speech system.")
    
    if success:
        print("✅ Ravi voice test completed!")
    else:
        print("❌ Ravi voice test failed!")
