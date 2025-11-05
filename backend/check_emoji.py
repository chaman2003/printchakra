#!/usr/bin/env python3
import os
import re

# List of emoji to check
emojis = ['❌', '✅', '🤖', '📝', '🎤', '🚀', '⚠', '📷', '🎯', '📤', '🔍', '🖨']

print("Checking for emoji in logging/print statements...")
found_any = False

for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.py'):
            filepath = os.path.join(root, f)
            try:
                with open(filepath, encoding='utf-8') as file:
                    for i, line in enumerate(file, 1):
                        if ('logger.' in line or 'print(' in line) and any(emoji in line for emoji in emojis):
                            print(f"{filepath}:{i}: {line.strip()}")
                            found_any = True
            except:
                pass

if not found_any:
    print("✅ No emoji found in logging/print statements!")
