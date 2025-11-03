# Infinite Recording Loop - Simple Explanation

## The Problem
When you opened the Voice AI chat, it would start recording, but then keep restarting over and over endlessly instead of processing your input and stopping. It was like a broken record player that never stopped rewinding.

## Why It Happened
1. **Too Many Starts at Once**: The code had multiple places trying to restart recording at the same time, like multiple people hitting the "start" button on a machine simultaneously.

2. **Memory Problems**: Old recording sessions (from 5 seconds ago) were still trying to restart even though new ones had already started. It's like having 10 different timers all going off at once.

3. **No Traffic Cop**: There was nothing to prevent multiple recording attempts. It's like a intersection with no traffic lights - cars from all directions trying to go at once.

## The Solution
We added **THREE traffic controllers** to prevent the chaos:

### 1️⃣ The Recording Lock (`recordingPendingRef`)
- Before starting a new recording, check: "Is another recording already starting?"
- If YES → Don't start another one, just return
- If NO → Proceed and mark that we're starting

**Think of it like:** A bathroom with one stall. Before entering, you check the light. If it's red ("occupied"), you wait. If it's green ("free"), you enter and turn the light red.

### 2️⃣ The Session Tracker (`isSessionActiveRef`)
- Keep a permanent note of whether the session is active or not
- All old handlers and callbacks use THIS note, not memory from when they were created
- This prevents old timers from using outdated information

**Think of it like:** Instead of each person remembering what the status was when they were born, everyone looks at the current status board on the wall.

### 3️⃣ Guards at Every Restart Point
- Every place that tries to restart recording checks the lock FIRST
- Only proceed if lock is clear

**Think of it like:** Every road onto the highway has a toll booth that checks: "Can we handle another car?" If yes, enter. If no, wait.

## What You'll See
✅ Record once, processes once, restarts once → Smooth continuous conversation
✅ No more CPU spinning up from infinite loops
✅ Clear console messages: "Recording already pending - skipping" if something tries to mess things up
✅ Session stays active until you manually end it

## How to Test
1. Open Voice AI Chat
2. Say "Hello" 
3. Wait for response
4. Say another command
5. **Result**: Should hear response, then ready for next command (NOT endlessly restarting)

## Technical Note
We used React refs (useRef) instead of state (useState) for these controls because:
- **State** updates slowly and can get stale in callbacks
- **Refs** are immediate and always have current values
- **Refs** don't cause re-renders, so no performance penalty

The fix prevents race conditions by ensuring only one `startRecording()` can execute at a time, and all decisions use current session status, not outdated remembered values from callback creation time.
