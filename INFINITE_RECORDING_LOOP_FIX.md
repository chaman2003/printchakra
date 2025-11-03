# Infinite Recording Loop Fix

## Problem
Voice recording was entering an infinite loop, continuously restarting after each audio processing cycle without properly stopping.

## Root Causes

### 1. **Race Condition with Async Recording Restarts**
The component had multiple places where it would call `startRecording()` after audio processing:
- After no voice detection (line 251)
- After processing errors (line 270)  
- After successful processing (line 569)
- After keyword errors (line 594)
- After file access errors (line 607)

These calls were happening asynchronously via `setTimeout`, but without proper guards to prevent simultaneous `startRecording()` invocations.

### 2. **Stale State Closures**
The `mediaRecorder.onstop` handler was defined inside `startRecording()`, creating a closure that captured `isSessionActive` at recording start time. When multiple recordings were active, old handlers would reference stale state values, leading to unexpected restarts.

### 3. **No Duplicate Call Prevention**
There was no mechanism to prevent multiple `startRecording()` calls from executing simultaneously, which could cause:
- Multiple MediaRecorder instances competing for the same audio stream
- Nested recording loops with handlers calling handlers calling handlers
- Stack overflow from recursive startRecording invocations

## Solution

### 1. **Added Recording Lock via `recordingPendingRef`**
```typescript
const recordingPendingRef = useRef<boolean>(false); // Prevent multiple simultaneous startRecording calls
```

**Usage in `startRecording()`:**
```typescript
const startRecording = async () => {
  // Prevent multiple simultaneous startRecording calls (causes infinite loop)
  if (recordingPendingRef.current || isRecording) {
    console.log('⏹️ Recording already pending or active - skipping startRecording call');
    return;
  }
  
  recordingPendingRef.current = true;
  // ... setup code ...
  mediaRecorder.start();
  setIsRecording(true);
  recordingPendingRef.current = false; // Recording started successfully
  // ... audio monitoring code ...
}
```

**Guard in catch block:**
```typescript
} catch (error: any) {
  recordingPendingRef.current = false; // Reset flag on error
  // ... error handling ...
}
```

### 2. **Session State Ref for Closures**
```typescript
const isSessionActiveRef = useRef<boolean>(false); // Track session state in ref for closures
```

Updated all session state changes:
- `startSession()`: `isSessionActiveRef.current = true`
- `endSession()`: `isSessionActiveRef.current = false`
- `closeDrawer()`: `isSessionActiveRef.current = false`

**In `mediaRecorder.onstop` handler:**
```typescript
// Use ref instead of state for closure consistency
if (isSessionActiveRef.current) {
  console.log('🔄 Continuous mode: restarting recording immediately');
  setTimeout(() => startRecording(), 200);
}
```

### 3. **Multiple Guards in Recording Restarts**
All async restart calls now go through the same guard:
```typescript
if (recordingPendingRef.current || isRecording) {
  console.log('⏹️ Recording already pending or active - skipping startRecording call');
  return;
}
```

## Code Changes

### File: `frontend/src/components/voice/VoiceAIChat.tsx`

**Added Refs (Line 49-50):**
```typescript
const recordingPendingRef = useRef<boolean>(false); // Prevent multiple simultaneous startRecording calls
const isSessionActiveRef = useRef<boolean>(false); // Track session state in ref for closures
```

**Updated `startRecording()` (Line 175-180):**
```typescript
const startRecording = async () => {
  // Prevent multiple simultaneous startRecording calls (causes infinite loop)
  if (recordingPendingRef.current || isRecording) {
    console.log('⏹️ Recording already pending or active - skipping startRecording call');
    return;
  }
  
  recordingPendingRef.current = true;
  // ... existing code ...
  mediaRecorder.start();
  setIsRecording(true);
  recordingPendingRef.current = false; // Recording started successfully
```

**Updated `onstop` handler (Line 256-260):**
- Changed `if (isSessionActive)` → `if (isSessionActiveRef.current)`
- Changed `if (isSessionActive)` → `if (isSessionActiveRef.current)` (lines 270-271)

**Updated `startSession()` (Line 123-124):**
```typescript
setIsSessionActive(true);
isSessionActiveRef.current = true; // Update ref for closures
```

**Updated `processAudio()` (Line 564-567, 578-579):**
- Session end: `isSessionActiveRef.current = false`
- Session continue: `if (isSessionActiveRef.current)` for restart

**Updated `endSession()` and `closeDrawer()`:**
- All `setIsSessionActive(false)` calls paired with `isSessionActiveRef.current = false`

## Testing

### Before Fix
- Recording would restart indefinitely
- Multiple MediaRecorder instances competing for audio stream
- Stack of pending setTimeout callbacks accumulating
- Increasing CPU usage over time

### After Fix
- Recording starts cleanly once
- Waits for audio processing to complete
- Restarts only after successful processing or valid error conditions
- Single MediaRecorder active at any given time
- No unnecessary setTimeout accumulation
- Bounded state management

## Performance Impact
- **Memory**: Reduced due to preventing multiple MediaRecorder/AudioContext instances
- **CPU**: Lower due to eliminating stale callback chains
- **Audio Quality**: Improved by preventing resource contention
- **Latency**: No change (processing still completes, then restarts)

## Edge Cases Handled
1. ✅ User speaks while previous recording is processing
2. ✅ Error occurs during processing (silently retries)
3. ✅ Session is manually ended (stops immediately)
4. ✅ User closes the drawer (cleans up all resources)
5. ✅ Multiple error conditions occur in sequence
6. ✅ TTS is playing when recording tries to start (blocked)

## Browser Console Logs
Users will now see clear logging:
```
⏹️ Recording already pending or active - skipping startRecording call
🔄 Continuous mode: restarting recording immediately
📝 Processing audio blob: 45628 bytes, type: audio/wav
✅ Silence after speech detected - processing recording
🔄 Restarting recording for continuous listening...
```

## Deployment Notes
- No backend changes required
- Frontend TypeScript compiles without errors
- No breaking changes to component API
- Fully backward compatible with existing parent components
- Tested with both TTS blocking and continuous listening modes
