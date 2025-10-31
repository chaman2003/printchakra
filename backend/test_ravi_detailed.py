"""
Test Ravi voice with explicit logging
"""
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

sys.path.insert(0, '.')

from modules.voice_ai import speak_text

print("\n" + "=" * 70)
print("Testing Microsoft Ravi Voice")
print("=" * 70)

test_texts = [
    "Hello! This is Microsoft Ravi speaking.",
    "Testing the text to speech system with OneCore voices.",
    "If you can hear this in Ravi's voice, the fix is working!"
]

for i, text in enumerate(test_texts, 1):
    print(f"\nTest {i}/{len(test_texts)}: {text[:50]}...")
    success = speak_text(text)
    if not success:
        print(f"❌ Test {i} failed!")
        break
    print(f"✅ Test {i} completed!")

print("\n" + "=" * 70)
print("All tests completed!")
print("=" * 70)
