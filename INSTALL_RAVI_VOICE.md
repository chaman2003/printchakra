# Microsoft Ravi Voice Installation Guide

## Issue
Microsoft Ravi TTS voice is not installed on your Windows system.

## Currently Available Voices
- ✅ Microsoft David Desktop (English - United States) - Male
- ✅ Microsoft Zira Desktop (English - United States) - Female

## Solution

### Option 1: Install Microsoft Ravi Voice (Recommended)

Microsoft Ravi is a Hindi (India) voice. To install it:

1. **Open Windows Settings**
   - Press `Win + I` or search for "Settings"

2. **Navigate to Speech Settings**
   - Go to: **Time & Language** > **Speech**
   - Or search for "Speech settings" in Windows Search

3. **Manage Voices**
   - Click on **"Manage voices"** or **"Add voices"**

4. **Add Microsoft Ravi**
   - Look for voices from **India**
   - Find: **Microsoft Ravi - Hindi (India)**
   - Click **Add** or **Download**

5. **Wait for Installation**
   - The voice will download and install (approximately 50-100 MB)

6. **Verify Installation**
   - Run: `python test_tts_voices.py`
   - You should see "Microsoft Ravi" in the list

### Option 2: Use Alternative Voice

The system will automatically fallback to available voices in this order:
1. Microsoft Ravi (if installed)
2. Microsoft David (currently available) ✅
3. Microsoft Zira (currently available) ✅
4. Any other available voice

**Current Status**: System is using **Microsoft David** as Ravi is not installed.

## Testing TTS

After making changes, test the voice:

```bash
cd backend
python test_tts_voices.py
```

This will:
- List all available voices
- Highlight if Ravi is found
- Allow you to test the voice with sample text

## Alternative: Install Other Voices

Windows 11 supports many additional voices:

### English Voices
- Microsoft Aria (US) - Female
- Microsoft Guy (US) - Male
- Microsoft Jenny (US) - Female

### International Voices
- Microsoft Ravi (Hindi - India) - Male
- Microsoft Heera (Hindi - India) - Female
- And many more in various languages

To browse all available voices:
1. Settings > Time & Language > Speech
2. Click "Add voices"
3. Browse by language or region

## Code Updates Applied

✅ Updated `backend/modules/voice_ai.py`:
- Changed voice preference from "David" to "Ravi"
- Added fallback priority: Ravi > David > Zira > Any available
- Added warning logs when Ravi is not found
- System will work with any available voice

## Current System Behavior

**Without Ravi installed:**
- System uses Microsoft David (currently active)
- Warning logged once at startup: "Preferred voices not found. Using: Microsoft David"
- TTS functionality works normally

**With Ravi installed:**
- System will automatically detect and use Microsoft Ravi
- Log message: "Found preferred voice: Microsoft Ravi"
- Better voice quality for Hindi/Indian accent

## Quick Test

Run the Flask backend and test voice:

```bash
# In backend directory
python app.py

# The first TTS call will log which voice is being used
# Check the console logs for:
# ✅ Found preferred voice: Microsoft Ravi
# OR
# ⚠️ Preferred voices not found. Using: Microsoft David
```

## Need Help?

If you encounter issues:
1. Verify Windows Speech Settings are accessible
2. Check Windows version (Windows 10/11 required)
3. Ensure system language includes English or Hindi
4. Run `test_tts_voices.py` to see all available voices
5. Check backend logs for TTS initialization messages

---

**Status**: ✅ Code updated to prefer Microsoft Ravi with automatic fallback
**Action Required**: Install Microsoft Ravi voice for optimal experience (optional)
**Current Voice**: Microsoft David Desktop (fully functional)
