# 📚 PrintChakra AI - Complete Conversations & Triggerable Features Guide

**Created**: November 1, 2025  
**Version**: 2.0 (Complete AI System Reference)

---

## 📖 Table of Contents

1. [System Overview](#system-overview)
2. [Core Intent Detection System](#core-intent-detection-system)
3. [Conversation Flows](#conversation-flows)
4. [Voice Commands (In Modal)](#voice-commands-in-modal)
5. [Text Input Commands](#text-input-commands)
6. [General Chat Conversations](#general-chat-conversations)
7. [Triggerable Orchestration Events](#triggerable-orchestration-events)
8. [AI Response Patterns](#ai-response-patterns)
9. [Error & Edge Cases](#error--edge-cases)
10. [Testing Scenarios](#testing-scenarios)

---

## 🤖 System Overview

### Architecture
```
User Input (Voice/Text)
    ↓
WhisperTranscriptionService (Speech-to-Text)
    ↓
Smollm2ChatService (Intent Detection + AI Response)
    ↓
Command Parser (Extracts parameters)
    ↓
OrchestrationVoiceControl (Frontend execution)
    ↓
Dashboard/Orchestration Modal (State updates)
```

### Key Components
- **Backend**: `backend/modules/voice_ai.py` (WhisperTranscriptionService + Smollm2ChatService)
- **Frontend**: `frontend/src/components/OrchestrationVoiceControl.tsx`
- **Services**: `backend/services/orchestration_service.py` (Intent routing)
- **Models**: Whisper Large-v3 Turbo + Smollm2:135m (Ollama on localhost:11434)

### State Management
```typescript
orchestrateMode: 'print' | 'scan' | null
orchestrateStep: 1 (mode) | 2 (config) | 3 (confirm)
orchestrateOptions: { all user settings }
pending_orchestration: 'print' | 'scan' | null
isSessionActive: boolean
isRecording: boolean
```

---

## 🎯 Core Intent Detection System

### Priority Levels

```
PRIORITY 1: Pending Orchestration Check
├─ If waiting for print/scan confirmation
├─ Looks for: "yes", "proceed", "go ahead", "okay", "ok", "sure", "yep", "yeah"
└─ Triggers: TRIGGER_ORCHESTRATION:{mode}

PRIORITY 2: Print/Scan Intent Detection
├─ Print keywords: "print", "printing", "printout", "hard copy", "paper copy"
├─ Scan keywords: "scan", "scanning", "capture", "digitize", "photo"
├─ Extract parameters: color, copies, layout, resolution, duplex
└─ Returns: "Ready to [mode]. Shall we proceed?"

PRIORITY 3: General Conversation
├─ Routes to Ollama Smollm2 LLM
├─ System prompt guides responses
└─ Limited to 25 words max for TTS
```

### Direct Intent Matching (Before LLM)

These keywords are matched BEFORE the LLM sees them:

```python
# Print Detection
"print" in message.lower()

# Scan Detection  
"scan" in message.lower() or "capture" in message.lower()

# Confirmation Words (when pending_orchestration is set)
["yes", "proceed", "go ahead", "okay", "ok", "sure", "yep", "yeah"]
```

---

## 💬 Conversation Flows

### Flow 1: Trigger Print via Voice

```
User: "Hey, I want to print a document"
AI:   "Ready to print. Shall we proceed?"
User: "Yes"
AI:   "TRIGGER_ORCHESTRATION:print Opening print interface now!"
      └─ Frontend opens Orchestration Modal at Step 2 (config)
      └─ Voice control panel embedded
      └─ All print settings ready to configure
```

**Code Path**:
```python
# backend/modules/voice_ai.py
1. User message detected with "print"
2. self.pending_orchestration = "print"
3. Returns: "Ready to print. Shall we proceed?"
4. User says "yes"
5. Confirmation detected → TRIGGER_ORCHESTRATION:print
```

---

### Flow 2: Trigger Scan via Voice

```
User: "Can we scan something?"
AI:   "Ready to scan. Shall we proceed?"
User: "Sure"
AI:   "TRIGGER_ORCHESTRATION:scan Opening scan interface now!"
      └─ Frontend opens Orchestration Modal at Step 2 (config)
      └─ Scan-specific options visible
      └─ Voice control active
```

**Variations**:
```
"capture a document"    → Scan intent
"scan with OCR"         → Scan + extracts OCR=true
"high quality scan"     → Scan + resolution=600
"scan in grayscale"     → Scan + color_mode=grayscale
```

---

### Flow 3: Multi-Step Configuration with Voice

```
User: "Select document"
AI:   "SELECT_DOCUMENT command triggered"
      └─ Opens document picker modal

User: "Landscape"
AI:   "SET_LAYOUT command triggered with layout=landscape"
      └─ Updates UI to landscape mode

User: "Color"
AI:   "SET_COLOR command triggered with colorMode=color"
      └─ Updates UI to color mode

User: "High quality"
AI:   "SET_RESOLUTION command triggered with dpi=600"
      └─ Updates scan resolution

User: "Apply settings"
AI:   "APPLY_SETTINGS command triggered"
      └─ Moves to next step/confirms action
```

---

### Flow 4: General Questions (No Orchestration)

```
User: "What can PrintChakra do?"
AI:   "OCR, file conversion, printing, scanning, voice commands!"

User: "What formats do you support?"
AI:   "PDF, DOCX, images, text files, and more!"

User: "How does voice work?"
AI:   "Just say 'Hey' then your command!"

User: "Thanks for your help"
AI:   "You're welcome!"
```

**System Prompt Ensures**:
- Short responses (max 25 words)
- No conversational loops
- Direct, action-focused answers
- Only handles non-orchestration questions

---

### Flow 5: Error Recovery

```
User: "Can we print?"
AI:   "Ready to print. Shall we proceed?"
User: "Maybe later"  ← NOT a confirmation
AI:   "I'm here to help with document scanning and printing!"
      └─ Clears pending_orchestration
      └─ Returns to general chat mode

User: "Actually, yes"
AI:   "I'm here to help with document scanning and printing!"
      └─ No pending orchestration, treated as general chat
      └─ Would need to say "print" again to re-trigger
```

---

## 🎙️ Voice Commands (In Modal)

### Command Categories

#### 1. **Document Selection**

| Voice Input | Exact Match | Action | Code |
|-------------|------------|--------|------|
| "Select document" | `.includes('select') && .includes('document')` | Opens file picker | `onCommand('SELECT_DOCUMENT')` |
| "Select file" | `.includes('select') && .includes('file')` | Opens file picker | `onCommand('SELECT_DOCUMENT')` |

**Example Conversations**:
```
User: "Select document"
Frontend: Shows file selector modal
Result: Document selected and ready for printing/scanning
```

---

#### 2. **Navigation & Scrolling**

| Voice Input | Exact Match | Action | Code |
|-------------|------------|--------|------|
| "Scroll down" | `.includes('scroll down')` OR `.includes('scroll to bottom')` | Scroll down | `onCommand('SCROLL_DOWN')` |
| "Scroll up" | `.includes('scroll up')` OR `.includes('scroll to top')` | Scroll up | `onCommand('SCROLL_UP')` |
| "Go back" | `.includes('back')` OR `.includes('previous')` OR `.includes('go back')` | Previous step | `onCommand('GO_BACK')` |
| "Back" | `.includes('back')` | Previous step | `onCommand('GO_BACK')` |

**Example Conversations**:
```
User: "I can't see all the options"
User: "Scroll down"
Frontend: Modal body scrolls down
Result: More options visible
```

---

#### 3. **Confirmation & Action**

| Voice Input | Exact Match | Action | Code |
|-------------|------------|--------|------|
| "Apply settings" | `.includes('apply')` | Confirm & continue | `onCommand('APPLY_SETTINGS')` |
| "Submit" | `.includes('submit')` | Confirm & continue | `onCommand('APPLY_SETTINGS')` |
| "Continue" | `.includes('continue')` | Confirm & continue | `onCommand('APPLY_SETTINGS')` |
| "Cancel" | `.includes('cancel')` | Close modal | `onCommand('CANCEL')` |
| "Close" | `.includes('close')` | Close modal | `onCommand('CANCEL')` |
| "Exit" | `.includes('exit')` | Close modal | `onCommand('CANCEL')` |

**Example Conversations**:
```
User: "I'm done configuring"
User: "Apply settings"
Frontend: Modal advances to next step/confirmation
Result: Ready to print/scan

User: "Actually, cancel this"
User: "Cancel"
Frontend: Modal closes, settings cleared
Result: Back to main dashboard
```

---

#### 4. **Color Mode Settings**

| Voice Input | Exact Match | Action | Code |
|-------------|------------|--------|------|
| "Color" | `.includes('color')` | Set color mode | `onCommand('SET_COLOR', { colorMode: 'color' })` |
| "Grayscale" | `.includes('grayscale')` | Set B&W mode | `onCommand('SET_COLOR', { colorMode: 'grayscale' })` |
| "Black and white" | `.includes('black and white')` | Set B&W mode | `onCommand('SET_COLOR', { colorMode: 'grayscale' })` |

**Example Conversations**:
```
User: "I want color printing"
User: "Color"
Frontend: UI updates - color mode selected
Result: Print settings show color option

User: "Actually, save some ink. Grayscale"
User: "Grayscale"
Frontend: UI updates - grayscale mode selected
Result: Print settings show grayscale option
```

**In Modal UI**:
```
🎨 Color Mode
┌──────────────────────┐
│ ✓ Color              │  ← After saying "color"
│   Grayscale          │
└──────────────────────┘
```

---

#### 5. **Layout & Orientation**

| Voice Input | Exact Match | Action | Code |
|-------------|------------|--------|------|
| "Portrait" | `.includes('portrait')` | Portrait orientation | `onCommand('SET_LAYOUT', { layout: 'portrait' })` |
| "Landscape" | `.includes('landscape')` | Landscape orientation | `onCommand('SET_LAYOUT', { layout: 'landscape' })` |

**Example Conversations**:
```
User: "I need landscape orientation"
User: "Landscape"
Frontend: UI updates - landscape selected
Result: Document will print in landscape

User: "Wait, portrait is better"
User: "Portrait"
Frontend: UI updates - portrait selected
Result: Document will print in portrait
```

**Visual Feedback**:
```
BEFORE: Portrait ✓

User says: "Landscape"

AFTER:  Landscape ✓
```

---

#### 6. **Resolution & Quality (Scan Mode)**

| Voice Input | Exact Match | Action | Code |
|-------------|------------|--------|------|
| "High quality" | `.includes('high') && .includes('quality')` | 600 DPI | `onCommand('SET_RESOLUTION', { dpi: 600 })` |
| "Low quality" | `.includes('low') && .includes('quality')` | 150 DPI | `onCommand('SET_RESOLUTION', { dpi: 150 })` |

**Example Conversations**:
```
User (scanning old document): "I need high quality"
User: "High quality"
Frontend: Resolution updates to 600 DPI
Result: Scan at maximum quality

User (scanning just for reference): "Low quality is fine"
User: "Low quality"
Frontend: Resolution updates to 150 DPI
Result: Faster scanning, smaller file size
```

**Settings Updated**:
```
Before: 300 DPI (default)
User says: "High quality"
After: 600 DPI ✓
```

---

#### 7. **OCR Toggle (Scan Mode Only)**

| Voice Input | Exact Match | Action | Code |
|-------------|------------|--------|------|
| "Enable OCR" | `.includes('enable') && .includes('ocr')` | Turn OCR on | `onCommand('TOGGLE_OCR', { enabled: true })` |
| "Disable OCR" | `.includes('disable') && .includes('ocr')` | Turn OCR off | `onCommand('TOGGLE_OCR', { enabled: false })` |

**Example Conversations**:
```
User: "I want text extraction"
User: "Enable OCR"
Frontend: OCR toggle switches ON
Result: Scanned document will have searchable text

User: "Actually, I don't need OCR"
User: "Disable OCR"
Frontend: OCR toggle switches OFF
Result: Just scan the image, no text processing
```

**Modal Display**:
```
📝 Text Recognition (OCR)
☐ Disabled (default)

User says: "Enable OCR"

✓ Enabled
  └─ Text will be extracted from scanned documents
```

---

## ⌨️ Text Input Commands

### How Text Input Works

**Location**: In voice control panel  
**Trigger**: Type command and press Enter or click Send button  
**Processing**: Same as voice commands (parsed, parameters extracted, action triggered)

### Text Command Examples

```typescript
// All the voice commands work identically with text input

// Navigation
"scroll down"           → SCROLL_DOWN
"scroll up"            → SCROLL_UP
"go back"              → GO_BACK

// Selection
"select document"      → SELECT_DOCUMENT

// Actions
"apply settings"       → APPLY_SETTINGS
"cancel"              → CANCEL

// Settings
"color"               → SET_COLOR { colorMode: 'color' }
"grayscale"           → SET_COLOR { colorMode: 'grayscale' }
"portrait"            → SET_LAYOUT { layout: 'portrait' }
"landscape"           → SET_LAYOUT { layout: 'landscape' }
"high quality"        → SET_RESOLUTION { dpi: 600 }
"low quality"         → SET_RESOLUTION { dpi: 150 }
"enable ocr"          → TOGGLE_OCR { enabled: true }
"disable ocr"         → TOGGLE_OCR { enabled: false }
```

### Text Input Workflow

```
1. User types in text field
   Input: "select document"

2. User presses Enter OR clicks Send button
   Event: handleTextCommand()

3. Text sent to backend /voice/chat endpoint
   Payload: { message: "select document", context: "orchestration-print" }

4. Backend processes with AI
   Returns: AI response + command parsing

5. Frontend parses for commands
   parseAndExecuteCommand("select document", aiResponse)

6. Command executed
   onCommand('SELECT_DOCUMENT')

7. UI updates
   File picker modal opens
```

---

## 💭 General Chat Conversations

### Available Topics (Non-Orchestration)

These conversations DON'T trigger orchestration - they're just AI chat:

#### Topic 1: System Capabilities

```
User: "What can PrintChakra do?"
AI:   "OCR, file conversion, printing, scanning, voice commands!"

User: "What are your features?"
AI:   "I help with document management - scan, print, convert!"

User: "Tell me about PrintChakra"
AI:   "Document control with AI orchestration and voice!"
```

**Conversation Rules**:
- Keep responses short (max 25 words)
- Be direct and friendly
- Focus on features, not implementation details

---

#### Topic 2: Supported Formats

```
User: "What formats do you support?"
AI:   "PDF, DOCX, images, text files, and more!"

User: "Can you convert to PDF?"
AI:   "Yes! PDF, Word, images - many formats supported!"

User: "Do you support JPEG?"
AI:   "Yes, JPEG and other image formats work!"
```

---

#### Topic 3: Voice Control & Features

```
User: "How does voice work?"
AI:   "Just say 'Hey' then your command!"

User: "Can I use voice commands?"
AI:   "Yes! Say commands like 'select document' or 'color'!"

User: "Does voice control work?"
AI:   "Absolutely! Speak clearly and I'll execute commands!"

User: "How do I use the voice feature?"
AI:   "Click the microphone, speak your command, done!"
```

---

#### Topic 4: OCR & Text Recognition

```
User: "What's OCR?"
AI:   "Optical Character Recognition - extracts text from images!"

User: "Can you extract text?"
AI:   "Yes! Use OCR to pull text from scanned documents!"

User: "How do I enable text extraction?"
AI:   "Say 'enable OCR' when scanning or use the toggle!"
```

---

#### Topic 5: General Courtesy

```
User: "Thank you"
AI:   "You're welcome!"

User: "Thanks for helping"
AI:   "Happy to help with your documents!"

User: "Great job"
AI:   "Thanks! Let me know if you need anything else!"

User: "Hello"
AI:   "Hi! Ready to help with printing or scanning!"

User: "Goodbye"
AI:   "Bye! Thanks for using PrintChakra!"
```

---

#### Topic 6: Status & Help

```
User: "What can I do?"
AI:   "Print documents, scan, convert files, extract text!"

User: "Help"
AI:   "Say 'print', 'scan', or ask about features!"

User: "I'm confused"
AI:   "No problem! Say 'print' or 'scan' to get started!"
```

---

### System Prompt Guidelines

The AI follows this system prompt:

```
You are PrintChakra AI - a direct, action-focused assistant.

⚠️ CRITICAL: The system handles print/scan intents automatically. 
You should NEVER see messages about printing or scanning - they are 
intercepted before reaching you.

YOUR ROLE:
- Answer general questions about PrintChakra features
- Help with document questions
- Be friendly but concise (under 10 words)
- If somehow print/scan slips through, say: "Opening interface now!"

TOPICS YOU HANDLE:
✅ "What can PrintChakra do?" → Features
✅ "What formats?" → Supported formats
✅ "How does voice work?" → Voice documentation
✅ "What about OCR?" → Text recognition help

NEVER DO:
❌ Ask questions like "What kind of document?"
❌ Say "Tell me more about..."
❌ Ask for additional details
❌ Engage in open-ended conversation

BE DIRECT:
- Keep responses SHORT (under 25 words)
- One sentence per response
- Action-focused, not conversational
```

---

## 🔔 Triggerable Orchestration Events

### Event 1: TRIGGER_ORCHESTRATION:print

**When it triggers**:
```python
# Scenario 1: Direct voice command
User: "print this document"
→ pending_orchestration = "print"
→ AI: "Ready to print. Shall we proceed?"
→ User: "yes"
→ TRIGGER_ORCHESTRATION:print

# Scenario 2: Confirmation after prompt
User: "Hey, can we print?"
→ pending_orchestration = "print"
→ AI: "Ready to print. Shall we proceed?"
→ User: "proceed"
→ TRIGGER_ORCHESTRATION:print
```

**Frontend Handler**:
```typescript
// In OrchestrationVoiceControl.tsx or Dashboard.tsx
if (aiResponse.includes('TRIGGER_ORCHESTRATION:print')) {
  setOrchestrateMode('print');
  setOrchestrateStep(2);  // Skip to configuration
  orchestrateModal.onOpen();
  // Voice control panel becomes active
}
```

**Result**:
- ✅ Orchestration Modal opens
- ✅ Print mode selected
- ✅ Skip Mode Selection (Step 1)
- ✅ Show Configuration (Step 2)
- ✅ Voice control panel active
- ✅ User can configure and submit

---

### Event 2: TRIGGER_ORCHESTRATION:scan

**When it triggers**:
```python
# Scenario 1: Direct voice command
User: "scan a document"
→ pending_orchestration = "scan"
→ AI: "Ready to scan. Shall we proceed?"
→ User: "sure"
→ TRIGGER_ORCHESTRATION:scan

# Scenario 2: Capture intent
User: "I want to capture something"
→ pending_orchestration = "scan"
→ AI: "Ready to scan. Shall we proceed?"
→ User: "go ahead"
→ TRIGGER_ORCHESTRATION:scan
```

**Frontend Handler**:
```typescript
if (aiResponse.includes('TRIGGER_ORCHESTRATION:scan')) {
  setOrchestrateMode('scan');
  setOrchestrateStep(2);  // Skip to configuration
  orchestrateModal.onOpen();
  // Voice control panel shows scan options
}
```

**Result**:
- ✅ Orchestration Modal opens
- ✅ Scan mode selected
- ✅ Scan-specific options visible
- ✅ Voice control panel active with scan commands
- ✅ User can configure OCR, resolution, etc.

---

### Event 3: SELECT_DOCUMENT Command

**When it triggers**:
```
User (in modal): "Select document"
Frontend: Detects command
Triggered: onCommand('SELECT_DOCUMENT')
```

**Handler Code**:
```typescript
// In Dashboard.tsx orchestration handler
case 'SELECT_DOCUMENT':
  // Open file selection modal
  setShowFileSelector(true);
  toast({
    title: 'Select Documents',
    description: 'Choose files to print/scan',
    status: 'info',
  });
  break;
```

**Result**:
- ✅ File selection modal/picker opens
- ✅ User can select one or multiple documents
- ✅ Selected files highlighted
- ✅ Ready for next step

---

### Event 4: SCROLL_DOWN / SCROLL_UP Commands

**When it triggers**:
```
User (in modal): "Scroll down" OR "Scroll up"
Frontend: Detects command
Triggered: onCommand('SCROLL_DOWN') or onCommand('SCROLL_UP')
```

**Handler Code**:
```typescript
// In Dashboard.tsx
case 'SCROLL_DOWN':
  modalBodyRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
  toast({ title: 'Scrolling down...', status: 'info' });
  break;

case 'SCROLL_UP':
  modalBodyRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
  toast({ title: 'Scrolling up...', status: 'info' });
  break;
```

**Result**:
- ✅ Modal content scrolls smoothly
- ✅ User can see hidden options
- ✅ Toast notification confirms action

---

### Event 5: APPLY_SETTINGS Command

**When it triggers**:
```
User (in modal, step 2): "Apply settings"
Frontend: Detects command
Triggered: onCommand('APPLY_SETTINGS')
```

**Handler Code**:
```typescript
case 'APPLY_SETTINGS':
  setOrchestrateStep(3);  // Move to confirmation
  toast({
    title: 'Settings Applied',
    description: 'Review and confirm to proceed',
    status: 'success',
  });
  break;
```

**Result**:
- ✅ Advance to step 3 (confirmation)
- ✅ Show summary of settings
- ✅ Ready for final submission

---

### Event 6: GO_BACK Command

**When it triggers**:
```
User (in modal, any step): "Go back" OR "Back"
Frontend: Detects command
Triggered: onCommand('GO_BACK')
```

**Handler Code**:
```typescript
case 'GO_BACK':
  if (orchestrateStep > 1) {
    setOrchestrateStep(orchestrateStep - 1);
    toast({
      title: 'Going Back',
      description: 'Previous step',
      status: 'info',
    });
  }
  break;
```

**Result**:
- ✅ Go to previous step
- ✅ Keep all settings intact
- ✅ Can modify previous choices

**Step Flow**:
```
Step 1 (Mode Selection)
  ↓
Step 2 (Configuration)
  ↓ "Go back"
Step 1 (Mode Selection)
  ↓ Choose again
Step 2 (Configuration)
```

---

### Event 7: CANCEL Command

**When it triggers**:
```
User (in modal, any step): "Cancel" OR "Close" OR "Exit"
Frontend: Detects command
Triggered: onCommand('CANCEL')
```

**Handler Code**:
```typescript
case 'CANCEL':
  orchestrateModal.onClose();
  setOrchestrateStep(1);
  // Settings persist via orchestrateOptions
  // But mode remains for re-opening
  toast({
    title: 'Cancelled',
    description: 'You can re-open the interface anytime',
    status: 'info',
  });
  break;
```

**Result**:
- ✅ Modal closes
- ✅ Settings preserved in state
- ✅ "Re-open [Mode] Configuration" button appears
- ✅ Can resume later

---

### Event 8: SET_COLOR Command

**When it triggers**:
```
User (in modal): "Color" OR "Grayscale" OR "Black and white"
Frontend: Detects command
Triggered: onCommand('SET_COLOR', { colorMode: 'color' | 'grayscale' })
```

**Handler Code**:
```typescript
case 'SET_COLOR':
  setOrchestrateOptions({
    ...orchestrateOptions,
    printColorMode: params.colorMode,  // For print
    scanColorMode: params.colorMode,   // For scan
  });
  toast({
    title: `${params.colorMode.charAt(0).toUpperCase() + params.colorMode.slice(1)} Mode`,
    description: `Document will be ${params.colorMode}`,
    status: 'success',
  });
  break;
```

**Result**:
- ✅ Color mode updated
- ✅ UI reflects change
- ✅ Will be applied to final output

---

### Event 9: SET_LAYOUT Command

**When it triggers**:
```
User (in modal): "Portrait" OR "Landscape"
Frontend: Detects command
Triggered: onCommand('SET_LAYOUT', { layout: 'portrait' | 'landscape' })
```

**Handler Code**:
```typescript
case 'SET_LAYOUT':
  setOrchestrateOptions({
    ...orchestrateOptions,
    printLayout: params.layout,  // For print
    scanLayout: params.layout,   // For scan
  });
  toast({
    title: `${params.layout.charAt(0).toUpperCase() + params.layout.slice(1)} Layout`,
    description: `Document will be in ${params.layout}`,
    status: 'success',
  });
  break;
```

**Result**:
- ✅ Layout updated
- ✅ Preview updates
- ✅ Applied to output

---

### Event 10: SET_RESOLUTION Command

**When it triggers**:
```
User (in scan modal): "High quality" OR "Low quality"
Frontend: Detects command
Triggered: onCommand('SET_RESOLUTION', { dpi: 600 | 150 })
```

**Handler Code**:
```typescript
case 'SET_RESOLUTION':
  setOrchestrateOptions({
    ...orchestrateOptions,
    scanResolution: params.dpi,
  });
  toast({
    title: `${params.dpi} DPI`,
    description: `Scan quality set to ${params.dpi === 600 ? 'high' : 'low'}`,
    status: 'success',
  });
  break;
```

**Result**:
- ✅ Scan resolution updated
- ✅ File size estimate changes
- ✅ Applied to final scan

---

### Event 11: TOGGLE_OCR Command

**When it triggers**:
```
User (in scan modal): "Enable OCR" OR "Disable OCR"
Frontend: Detects command
Triggered: onCommand('TOGGLE_OCR', { enabled: true | false })
```

**Handler Code**:
```typescript
case 'TOGGLE_OCR':
  setOrchestrateOptions({
    ...orchestrateOptions,
    scanTextMode: params.enabled,
  });
  toast({
    title: `OCR ${params.enabled ? 'Enabled' : 'Disabled'}`,
    description: `Text detection is ${params.enabled ? 'on' : 'off'}`,
    status: 'success',
  });
  break;
```

**Result**:
- ✅ OCR toggle updated
- ✅ Text extraction enabled/disabled
- ✅ Applied to final scan

---

## 🤝 AI Response Patterns

### Response Structure

```json
{
  "success": true,
  "response": "AI text response",
  "model": "smollm2:135m",
  "timestamp": "2025-11-01T10:30:00",
  "tts_enabled": true,
  "spoken": false
}
```

### Orchestration Trigger Response

```json
{
  "success": true,
  "response": "TRIGGER_ORCHESTRATION:print Opening print interface now!",
  "model": "smollm2:135m",
  "timestamp": "2025-11-01T10:30:00",
  "tts_enabled": true,
  "spoken": false
}
```

**How Frontend Detects**:
```typescript
if (response.includes('TRIGGER_ORCHESTRATION:')) {
  const mode = response.match(/TRIGGER_ORCHESTRATION:(\w+)/)[1];
  // mode = 'print' or 'scan'
  handleOrchestrationTrigger(mode);
}
```

---

### General Chat Response

```json
{
  "success": true,
  "response": "OCR, file conversion, printing, scanning, voice commands!",
  "model": "smollm2:135m",
  "timestamp": "2025-11-01T10:30:00",
  "tts_enabled": true,
  "spoken": false
}
```

**Constraints**:
- Max 25 words
- Single or double sentences
- No questions back to user
- Action-focused

---

### Error Response

```json
{
  "success": false,
  "error": "Ollama API error: 503",
  "response": ""
}
```

**User Sees**:
```
Toast: "Failed to process command"
AI: "I'm here to help with document scanning and printing!"
```

---

## ⚠️ Error & Edge Cases

### Case 1: Confirmation Expected, Non-Confirmation Received

```python
# pending_orchestration = "print"
# AI: "Ready to print. Shall we proceed?"

User: "Maybe later"  ← NOT a confirmation word
→ Confirmation check fails
→ pending_orchestration = None (cleared)
→ Treated as general chat
→ AI: "I'm here to help with document scanning and printing!"
→ To trigger print again, must say "print"
```

---

### Case 2: No Session Active

```
User opens modal but doesn't expand voice control
User: (voice control not active)
→ Session not started
→ Must click to expand voice control
→ startSession() called
→ Voice control activated
```

---

### Case 3: Ollama Not Running

```
User: "print"
Backend: Checks if Ollama available
→ Returns: { success: false, error: "Ollama not available" }
Frontend: Shows toast
→ "Voice control unavailable - Ollama not running"
User: Must start Ollama backend
```

---

### Case 4: Microphone Permission Denied

```
User: Clicks microphone button
Browser: Requests microphone permission
User: "Block" or denies
Frontend: 
→ Toast: "Microphone permission denied"
→ Can still use text input
→ Voice recording disabled
```

---

### Case 5: Invalid Command Text

```
User: "fdhskhdfhsd"  ← gibberish
Frontend: Parses command
→ No match in parseAndExecuteCommand()
→ Toast: "Command not recognized"
→ Shows available commands
→ Continues listening
```

---

### Case 6: Command Outside Modal

```
User: Speaks/types command while modal is closed
Frontend: No onCommand handler active
→ Command parsed but not executed
→ No effect
→ Must open modal first for commands to work
```

---

## 🧪 Testing Scenarios

### Test Suite 1: Voice Print Trigger

```
✓ Setup: Open modal, select Print mode
✓ Step 1: User says "print"
  └─ Verify: AI responds "Ready to print. Shall we proceed?"
✓ Step 2: User says "yes"
  └─ Verify: Modal opens to Step 2 configuration
✓ Step 3: User says "landscape"
  └─ Verify: Layout changes to landscape
✓ Step 4: User says "color"
  └─ Verify: Color mode selected
✓ Step 5: User says "apply settings"
  └─ Verify: Moves to confirmation step
✓ Step 6: User clicks Submit or says "submit"
  └─ Verify: Print job executed
```

---

### Test Suite 2: Voice Scan Trigger

```
✓ Setup: Modal closed, fresh session
✓ Step 1: User says "scan this document"
  └─ Verify: AI responds "Ready to scan. Shall we proceed?"
✓ Step 2: User says "proceed"
  └─ Verify: Scan modal opens to Step 2
✓ Step 3: User says "high quality"
  └─ Verify: Resolution set to 600 DPI
✓ Step 4: User says "enable ocr"
  └─ Verify: OCR toggle turns ON
✓ Step 5: User says "landscape"
  └─ Verify: Orientation changes
✓ Step 6: User says "apply settings"
  └─ Verify: Ready for confirmation
```

---

### Test Suite 3: General Conversations

```
✓ Setup: Modal open, not in orchestration flow
✓ Step 1: User says "What can you do?"
  └─ Verify: AI responds with features
✓ Step 2: User says "What formats?"
  └─ Verify: AI lists supported formats
✓ Step 3: User says "How does voice work?"
  └─ Verify: AI explains voice commands
✓ Step 4: User says "Thanks"
  └─ Verify: AI responds with courtesy
```

---

### Test Suite 4: Text Input Commands

```
✓ Setup: Modal open, voice control expanded
✓ Step 1: Type "select document" + Enter
  └─ Verify: File picker opens
✓ Step 2: Type "landscape" + Enter
  └─ Verify: Layout changes
✓ Step 3: Type "color" + Enter
  └─ Verify: Color mode selected
✓ Step 4: Type "apply settings" + Enter
  └─ Verify: Next step triggered
✓ Step 5: Type "invalid command" + Enter
  └─ Verify: Toast shows "Command not recognized"
```

---

### Test Suite 5: Navigation Commands

```
✓ Setup: Modal in Step 2 configuration
✓ Step 1: User says "scroll down"
  └─ Verify: Modal scrolls down
✓ Step 2: User says "scroll up"
  └─ Verify: Modal scrolls up
✓ Step 3: User says "go back"
  └─ Verify: Returns to Step 1
✓ Step 4: User selects Print again
  └─ Verify: Back in Step 2
✓ Step 5: User says "cancel"
  └─ Verify: Modal closes
✓ Step 6: Verify "Re-open Print Configuration" button appears
```

---

### Test Suite 6: Settings Persistence

```
✓ Setup: Configure print with specific settings
✓ Step 1: Set Layout → Landscape
✓ Step 2: Set Color → Grayscale
✓ Step 3: Select 3 copies (if applicable)
✓ Step 4: Click Cancel
  └─ Verify: Modal closes
✓ Step 5: Click "Re-open Print Configuration" button
  └─ Verify: All settings preserved (Landscape, Grayscale, 3 copies)
✓ Step 6: Change Color to Color
  └─ Verify: New setting takes effect
✓ Step 7: Apply and submit
```

---

### Test Suite 7: Error Handling

```
✓ Setup: Modal open with voice control
✓ Step 1: User says unclear audio (background noise)
  └─ Verify: Transcription shows partial/wrong text
  └─ Verify: Command parsing handles gracefully
✓ Step 2: Say "gibberish sound"
  └─ Verify: Toast shows "Command not recognized"
✓ Step 3: Type invalid text
  └─ Verify: Toast shows "Command not recognized"
✓ Step 4: Say "print" then "maybe"
  └─ Verify: pending_orchestration cleared
  └─ Verify: Must say "print" again to trigger
```

---

## 🔗 Quick Reference Commands Matrix

### All Voice/Text Commands

| Command | Exact Text | Triggers | Result |
|---------|-----------|----------|--------|
| **Print** | "print" | pending_orchestration=print → "Ready to print?" | Modal opens (print mode) |
| **Scan** | "scan" / "capture" | pending_orchestration=scan → "Ready to scan?" | Modal opens (scan mode) |
| **Yes** | "yes" / "ok" / "sure" / "proceed" | TRIGGER_ORCHESTRATION:{mode} | Start action |
| **Select** | "select document" | SELECT_DOCUMENT | File picker |
| **Scroll Down** | "scroll down" | SCROLL_DOWN | Scroll modal |
| **Scroll Up** | "scroll up" | SCROLL_UP | Scroll modal |
| **Apply** | "apply settings" / "submit" / "continue" | APPLY_SETTINGS | Next step |
| **Back** | "go back" / "back" / "previous" | GO_BACK | Previous step |
| **Cancel** | "cancel" / "close" / "exit" | CANCEL | Close modal |
| **Color** | "color" | SET_COLOR{color} | Change to color |
| **Grayscale** | "grayscale" / "black and white" | SET_COLOR{grayscale} | Change to B&W |
| **Portrait** | "portrait" | SET_LAYOUT{portrait} | Portrait orientation |
| **Landscape** | "landscape" | SET_LAYOUT{landscape} | Landscape orientation |
| **High Quality** | "high quality" | SET_RESOLUTION{600} | 600 DPI |
| **Low Quality** | "low quality" | SET_RESOLUTION{150} | 150 DPI |
| **Enable OCR** | "enable ocr" | TOGGLE_OCR{true} | Turn on text detection |
| **Disable OCR** | "disable ocr" | TOGGLE_OCR{false} | Turn off text detection |

---

## 📊 State Flow Diagram

```
START
  ↓
┌─────────────────────────────────────┐
│ User Input (Voice or Text)          │
└──────────────┬──────────────────────┘
               ↓
        ┌──────────────┐
        │ Is "print"?  │
        └──┬───────┬──┘
           │       │
         YES      NO
          │        ↓
          │    ┌──────────────┐
          │    │ Is "scan"?   │
          │    └──┬───────┬──┘
          │      YES     NO
          │       │       ↓
          │       │   ┌──────────────────────┐
          │       │   │ Is pending_orch?     │
          │       │   └──┬─────────────────┬─┘
          │       │     YES               NO
          │       │      │                 ↓
          │       │      │          General Chat
          │       │      │          (LLM Response)
          │       ↓      ↓
          │   ┌─────────────────┐
          │   │ Check Confirm?  │
          │   │ (yes/ok/sure)   │
          │   └──┬────────┬─────┘
          │     YES      NO
          │      │        ↓
          │      │   Treat as chat
          │      │   Return response
          │      ↓
          │   TRIGGER_ORCHESTRATION
          │   (modal opens)
          ↓
        ┌───────────────────┐
        │ Voice Control     │
        │ Active in Modal   │
        └─────┬─────┬───────┘
              │     │
         Commands  Chat
          Parsed   (LLM)
              │     │
              ↓     ↓
         ┌─────────────────┐
         │ UPDATE UI STATE │
         └────────┬────────┘
                  ↓
            APPLY SETTINGS
                  ↓
            SUBMIT / EXECUTE
```

---

## 💾 Conversation History Management

### How History Works

```python
# In Smollm2ChatService
self.conversation_history = [
    {"role": "user", "content": "print a document"},
    {"role": "assistant", "content": "Ready to print. Shall we proceed?"},
    {"role": "user", "content": "yes"},
    {"role": "assistant", "content": "TRIGGER_ORCHESTRATION:print..."},
]

# Kept for context (max 8 exchanges = 16 messages)
# Older messages pruned to prevent token overflow
```

### Reset Points

History is cleared when:
```
1. User clicks "New Session" button
2. User exits and re-enters application
3. Voice session ends (endSession() called)
4. Manual reset via UI
```

---

## 🎯 Key Takeaways

### What Triggers Orchestration
1. **"print"** keyword → Print intent detected
2. **"scan"** or **"capture"** → Scan intent detected
3. **Confirmation words** (yes, ok, sure, proceed) after prompt → Trigger orchestration

### What Doesn't Trigger Orchestration
1. General questions about features
2. Non-confirmation responses
3. Commands like "scroll", "apply", "color" (these execute in modal, not trigger)
4. Gibberish or unrecognized input

### Voice Commands Execute
- Only when modal is OPEN
- Only in voice control panel (expanded)
- Directly update UI state
- No backend orchestration needed

### General Chat
- Works when modal is closed or open
- Routes to LLM (Ollama Smollm2)
- Keeps responses short
- System-prompt guided

---

## 📞 Support Reference

### Common Issues & Solutions

**Issue**: "Voice control not responding"
```
Solution:
1. Check if modal is open
2. Check if voice control is expanded (click chevron)
3. Check if microphone permission granted
4. Check if Ollama running on localhost:11434
```

**Issue**: "Command not executing"
```
Solution:
1. Ensure modal is open
2. Speak clearly
3. Use exact command phrases
4. Check if in correct mode (print/scan)
```

**Issue**: "AI keeps asking questions"
```
Solution:
1. This shouldn't happen with current system prompt
2. Report if still occurring
3. Try refreshing browser
4. Check AI model response settings
```

---

**Version**: 2.0  
**Last Updated**: November 1, 2025  
**Status**: Complete & Production-Ready  

---

**For questions or updates, refer to**:
- `backend/modules/voice_ai.py` - Core AI logic
- `frontend/src/components/OrchestrationVoiceControl.tsx` - Voice control UI
- `backend/services/orchestration_service.py` - Intent routing
