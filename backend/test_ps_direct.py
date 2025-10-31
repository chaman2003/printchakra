"""
Direct PowerShell test for Ravi
"""
import subprocess

ps_script = """
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime] | Out-Null
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer

Write-Host "All available voices:"
foreach ($v in [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices) {
    Write-Host "  - $($v.DisplayName) [$($v.Language)]"
}

$raviVoice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*Ravi*" } | Select-Object -First 1

if ($raviVoice) {
    Write-Host "`nUsing voice: $($raviVoice.DisplayName)"
    $synth.Voice = $raviVoice
    
    $text = "Hello! This is Microsoft Ravi speaking. Testing text to speech."
    Write-Host "Speaking: $text"
    
    $stream = $synth.SynthesizeTextToStreamAsync($text).GetAwaiter().GetResult()
    
    $tempFile = [System.IO.Path]::GetTempFileName() + ".wav"
    Write-Host "Saving to: $tempFile"
    
    $fileStream = [System.IO.File]::Create($tempFile)
    $stream.AsStreamForRead().CopyTo($fileStream)
    $fileStream.Close()
    $stream.Dispose()
    
    Write-Host "Playing audio..."
    $player = New-Object System.Media.SoundPlayer($tempFile)
    $player.PlaySync()
    $player.Dispose()
    
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    Write-Host "Done!"
} else {
    Write-Host "ERROR: Ravi voice not found!"
}

$synth.Dispose()
"""

print("Running PowerShell TTS test...")
print("=" * 70)

result = subprocess.run(
    ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
    capture_output=True,
    text=True,
    timeout=20
)

print(result.stdout)
if result.stderr:
    print("ERRORS:")
    print(result.stderr)

print("\nReturn code:", result.returncode)
