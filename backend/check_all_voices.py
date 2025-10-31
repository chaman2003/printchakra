"""
Check for Windows 10/11 modern TTS voices (including Ravi)
"""
import subprocess

def check_modern_voices():
    """Check Windows modern voices using PowerShell"""
    
    # Check installed language packs and voices
    ps_script = """
# Method 1: Check Windows Speech Platform
Write-Host "=== Method 1: System.Speech ==="
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $speak.GetInstalledVoices()
foreach ($voice in $voices) {
    Write-Host "  - $($voice.VoiceInfo.Name) [$($voice.VoiceInfo.Culture)]"
}
$speak.Dispose()

Write-Host "`n=== Method 2: Get-WinUserLanguageList ==="
Get-WinUserLanguageList | Select-Object LanguageTag, InputMethodTips

Write-Host "`n=== Method 3: Registry Check for TTS ==="
$registryPaths = @(
    "HKLM:\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens",
    "HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens"
)

foreach ($path in $registryPaths) {
    Write-Host "`nChecking: $path"
    if (Test-Path $path) {
        Get-ChildItem $path | ForEach-Object {
            $voiceName = (Get-ItemProperty $_.PSPath).'(default)'
            Write-Host "  - $voiceName"
        }
    } else {
        Write-Host "  Path not found"
    }
}

Write-Host "`n=== Method 4: Windows.Media.SpeechSynthesis ==="
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

try {
    [Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime] | Out-Null
    $synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
    
    Write-Host "All Voices available:"
    foreach ($voice in [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices) {
        Write-Host "  - $($voice.DisplayName) [$($voice.Language)]"
    }
} catch {
    Write-Host "Could not access Windows.Media.SpeechSynthesis: $_"
}
"""
    
    result = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
        capture_output=True,
        text=True,
        timeout=30
    )
    
    print(result.stdout)
    if result.stderr:
        print("ERRORS:")
        print(result.stderr)

if __name__ == "__main__":
    print("Checking for all TTS voices on Windows...")
    print("=" * 80)
    check_modern_voices()
