# 🎯 PrintChakra AI - Quick Reference Card

**Last Updated**: November 1, 2025

---

## 📋 Quick Command Reference

### 🖨️ Print Trigger
```
User says:    "print a document"
AI responds:  "Ready to print. Shall we proceed?"
User says:    "yes" / "proceed" / "ok"
Result:       ✅ Print modal opens (Step 2 - Configuration)
```

### 📷 Scan Trigger
```
User says:    "scan this" / "capture" / "digitize"
AI responds:  "Ready to scan. Shall we proceed?"
User says:    "yes" / "sure" / "go ahead"
Result:       ✅ Scan modal opens (Step 2 - Configuration)
```

---

## 🎙️ In-Modal Voice Commands

### Navigation
| Say | Action |
|-----|--------|
| "Scroll down" | Scroll down in modal |
| "Scroll up" | Scroll up in modal |
| "Go back" | Previous step |
| "Cancel" | Close modal |

### Selection
| Say | Action |
|-----|--------|
| "Select document" | Open file picker |

### Settings (Print & Scan)
| Say | Action |
|-----|--------|
| "Color" | Set color mode ✓ |
| "Grayscale" | Set B&W mode ✓ |
| "Portrait" | Portrait orientation ✓ |
| "Landscape" | Landscape orientation ✓ |

### Settings (Scan Only)
| Say | Action |
|-----|--------|
| "High quality" | 600 DPI ✓ |
| "Low quality" | 150 DPI ✓ |
| "Enable OCR" | Turn on text extraction ✓ |
| "Disable OCR" | Turn off text extraction ✓ |

### Confirmation
| Say | Action |
|-----|--------|
| "Apply settings" | Continue to next step |
| "Submit" | Continue to next step |
| "Continue" | Continue to next step |

---

## 💬 General Chat (No Orchestration)

### Topics AI Can Answer
```
"What can you do?"           → Features overview
"What formats?"              → Supported formats
"How does voice work?"       → Voice commands help
"What is OCR?"              → Text extraction explanation
"Thank you" / "Thanks"      → Courtesy response
"Hello" / "Goodbye"         → Greeting
```

### System Prompt Rules
- ✅ Direct, concise responses (max 25 words)
- ✅ Action-focused, not conversational
- ✅ Print/scan keywords intercepted BEFORE AI sees them
- ✅ No asking clarifying questions

---

## 🔔 Triggerable Events

### Via Voice (After Opening Modal)
```
onCommand('SELECT_DOCUMENT')          ← "Select document"
onCommand('SCROLL_DOWN')              ← "Scroll down"
onCommand('SCROLL_UP')                ← "Scroll up"
onCommand('APPLY_SETTINGS')           ← "Apply settings" / "Submit"
onCommand('GO_BACK')                  ← "Go back" / "Back"
onCommand('CANCEL')                   ← "Cancel" / "Close"
onCommand('SET_COLOR', {colorMode})   ← "Color" / "Grayscale"
onCommand('SET_LAYOUT', {layout})     ← "Portrait" / "Landscape"
onCommand('SET_RESOLUTION', {dpi})    ← "High/Low quality"
onCommand('TOGGLE_OCR', {enabled})    ← "Enable/Disable OCR"
```

### Via LLM (All Scenarios)
```
TRIGGER_ORCHESTRATION:print  ← When user confirms print intent
TRIGGER_ORCHESTRATION:scan   ← When user confirms scan intent
```

---

## 🔄 State Machine

### Print Flow
```
START
  ↓
"print" spoken
  ↓
pending_orchestration = 'print'
AI: "Ready to print. Shall we proceed?"
  ↓
"yes" spoken
  ↓
TRIGGER_ORCHESTRATION:print
  ↓
Modal opens at Step 2 (Configuration)
  ↓
Configure: color, layout, etc.
  ↓
"Apply settings" → Step 3 (Confirmation)
  ↓
Click Submit → Print executed
```

### Scan Flow
```
START
  ↓
"scan" or "capture" spoken
  ↓
pending_orchestration = 'scan'
AI: "Ready to scan. Shall we proceed?"
  ↓
"proceed" / "ok" spoken
  ↓
TRIGGER_ORCHESTRATION:scan
  ↓
Modal opens at Step 2 (Configuration)
  ↓
Configure: OCR, resolution, layout, etc.
  ↓
"Apply settings" → Step 3 (Confirmation)
  ↓
Click Submit → Scan executed
```

---

## ⚙️ Technical Stack

| Component | Technology | Details |
|-----------|-----------|---------|
| **Speech-to-Text** | Whisper Large-v3 Turbo | Local GGML model, offline |
| **AI Model** | Smollm2:135m | Ollama on localhost:11434 |
| **TTS** | pyttsx3 (Microsoft Ravi) | Windows OneCore voices |
| **Frontend** | React 19 + TypeScript | Chakra UI components |
| **Backend** | Flask + Python | REST API endpoints |

---

## 📊 Command Priority

```
PRIORITY 1: Check pending orchestration
  If waiting for print/scan confirmation
  Look for: "yes", "ok", "proceed", "sure", "go ahead"
  
PRIORITY 2: Check for print/scan intent
  If "print" or "scan" in message
  Return: "Ready to [action]. Shall we proceed?"
  
PRIORITY 3: General conversation
  Route to Ollama LLM
  Keep response under 25 words
```

---

## ✅ Testing Checklist

### Test 1: Print Trigger
- [ ] Say "print"
- [ ] AI asks "Ready to print?"
- [ ] Say "yes"
- [ ] Modal opens (print mode)
- [ ] Say "landscape"
- [ ] Layout changes
- [ ] Say "apply"
- [ ] Next step triggered

### Test 2: Scan Trigger
- [ ] Say "scan"
- [ ] AI asks "Ready to scan?"
- [ ] Say "ok"
- [ ] Modal opens (scan mode)
- [ ] Say "high quality"
- [ ] Resolution updated
- [ ] Say "enable ocr"
- [ ] OCR toggle ON

### Test 3: General Chat
- [ ] Say "what formats?"
- [ ] AI lists formats
- [ ] Say "thanks"
- [ ] AI responds with courtesy

### Test 4: Text Input
- [ ] Type "select document" + Enter
- [ ] File picker opens
- [ ] Type "landscape" + Enter
- [ ] Layout changes
- [ ] Type "invalid" + Enter
- [ ] Toast shows "not recognized"

### Test 5: Settings Persistence
- [ ] Configure print (landscape + color)
- [ ] Click cancel
- [ ] Click "Re-open Print Configuration"
- [ ] Settings preserved ✓

---

## 🎯 Key Phrases

### Guaranteed to Work
```
✅ "print" / "scan" / "capture"         → Intent detection
✅ "yes" / "ok" / "proceed"             → Confirmation
✅ "select document" / "select file"    → File picker
✅ "scroll down" / "scroll up"          → Navigation
✅ "color" / "grayscale"                → Color settings
✅ "portrait" / "landscape"             → Layout
✅ "high quality" / "low quality"       → Resolution
✅ "enable ocr" / "disable ocr"         → OCR toggle
✅ "apply settings" / "submit"          → Next step
✅ "go back" / "cancel" / "close"       → Close/back
```

### General Questions
```
✅ "What can you do?"                   → Features
✅ "What formats?"                      → Formats
✅ "How does voice work?"               → Voice help
✅ "What is OCR?"                       → OCR explanation
✅ "Thank you"                          → Courtesy
```

---

## 🚀 Quick Start

1. **Open Modal**: Click "Orchestrate Print & Capture"
2. **Say "print"** or **"scan"**
3. AI asks "Ready to [action]?"
4. Say **"yes"**
5. Modal opens with voice control active
6. Say commands: **"landscape"**, **"color"**, **"apply settings"**
7. Complete the action

---

## ❌ Common Mistakes

| ❌ Don't | ✅ Do |
|---------|--------|
| Whisper commands | Speak clearly |
| Give multiple commands | One command at a time |
| Say vague phrases | Use exact keywords |
| Speak in noisy areas | Find quiet location |
| Forget to expand voice panel | Click chevron to expand |
| Close modal and lose settings | Use "Re-open" button |

---

## 📱 Modal Keyboard Shortcuts

```
Enter (text input)      → Send text command
Shift + Click button    → Usually triggers alt action
Escape (while in modal) → Close modal (may work)
```

**Note**: Voice is primary input. Keyboard only for text input in command field.

---

## 🔧 Troubleshooting

### "Voice not working"
1. Check modal is open
2. Check voice control is expanded (click ▼ icon)
3. Check microphone permissions
4. Check Ollama running (`localhost:11434`)

### "Command didn't execute"
1. Speak clearly, not too fast
2. One command at a time
3. Use exact phrases from chart
4. Wait for AI response before next command

### "AI keeps talking"
1. System prompt should prevent this
2. Try refreshing browser
3. Check if Ollama model updated

### "No microphone detected"
1. Check system audio settings
2. Test microphone in other apps
3. Grant browser microphone permission
4. Use text input instead (type + Enter)

---

## 📞 Backend Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/voice/start` | POST | Start voice session |
| `/voice/process` | POST | Transcribe audio |
| `/voice/chat` | POST | Get AI response |
| `/voice/speak` | POST | TTS output |
| `/voice/end` | POST | End session |
| `/orchestrate/print` | POST | Submit print job |
| `/orchestrate/scan` | POST | Submit scan job |

---

## 🌐 Session Management

```
startSession()          ← Called when voice control expanded
  └─ Initializes conversation history
  └─ Sets isSessionActive = true

endSession()            ← Called when modal closes
  └─ Clears conversation history
  └─ Sets isSessionActive = false
  └─ Clears pending_orchestration

reset_conversation()    ← Called on app reload
  └─ Clears all history
  └─ Resets state
```

---

## 💾 Data Persistence

### Persists Across Modal Close/Open
- ✅ `orchestrateMode` (print/scan)
- ✅ `orchestrateOptions` (all settings)
- ✅ Re-open button shows when modal closed

### Clears On
- ❌ Browser refresh
- ❌ Click "Orchestrate" button (new session)
- ❌ App restart

### To Resume Previous Session
- Click **"Re-open [Mode] Configuration"** button
- All settings restored
- Can modify and resubmit

---

## 📊 Response Limits

```
AI Response Max:      25 words
Max History:          8 exchanges (16 messages)
Session Timeout:      Until browser close
Modal Scroll:         Unlimited (can scroll anywhere)
Command Queue:        1 at a time (waits for response)
```

---

## 🎓 Example Conversations

### Example 1: Complete Print Workflow
```
User:  "Hey, print the document"
AI:    "Ready to print. Shall we proceed?"
User:  "Yes"
Modal: Opens (print mode)

User:  "Landscape"
UI:    Layout → Landscape

User:  "Color"
UI:    Color Mode → Color

User:  "Apply settings"
UI:    Move to confirmation

User:  (clicks Submit button)
Result: ✅ Print job executed
```

### Example 2: Scan with OCR
```
User:  "Scan this"
AI:    "Ready to scan. Shall we proceed?"
User:  "Go ahead"
Modal: Opens (scan mode)

User:  "High quality"
UI:    Resolution → 600 DPI

User:  "Enable OCR"
UI:    OCR toggle → ON

User:  "Landscape"
UI:    Layout → Landscape

User:  "Apply"
UI:    Confirmation step

User:  (clicks Submit)
Result: ✅ Scan with OCR executed
```

### Example 3: General Questions
```
User:  "What formats do you support?"
AI:    "PDF, DOCX, images, text files, and more!"

User:  "How does voice control work?"
AI:    "Just say 'Hey' then your command!"

User:  "Thanks for helping!"
AI:    "You're welcome!"
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `PRINTCHAKRA_AI_CONVERSATIONS_GUIDE.md` | Full comprehensive guide |
| `PRINTCHAKRA_AI_QUICK_REFERENCE.md` | This file - quick reference |
| `VOICE_CONTROL_QUICK_START.md` | Getting started guide |
| `VOICE_CONTROL_ORCHESTRATION.md` | Detailed orchestration docs |
| `TESTING_VOICE_CONTROL.md` | Testing procedures |

---

**Status**: ✅ Production Ready  
**Last Verified**: November 1, 2025  
**Version**: 2.0  

---

Need the full guide? See: `PRINTCHAKRA_AI_CONVERSATIONS_GUIDE.md`
