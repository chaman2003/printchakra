# PrintChakra AI Workflow Documentation

This document outlines the AI-driven workflow and command structure for PrintChakra. It serves as a reference for both developers and users to understand how the AI assistant interacts with the system across different states and workflows.

---

## 🧠 AI Workflow Architecture

PrintChakra uses a strict state-machine-based AI assistant that ensures users follow a logical progression for printing and scanning tasks. The assistant supports both voice and text inputs with identical behavior.

### Workflow States

| State | Description | Valid Entry Commands |
|-------|-------------|----------------------|
| **DASHBOARD** | The default state. AI is ready to start a new workflow. | `print`, `scan`, `help`, `status` |
| **PRINT_WORKFLOW** | Active when a user is preparing a print job. | `sorry, print` (if in Scan mode) |
| **SCAN_WORKFLOW** | Active when a user is preparing a scan job. | `sorry, scan` (if in Print mode) |

---

## 🔄 Mode Switching (The "Sorry" Protocol)

To prevent accidental workflow interruptions, switching between Print and Scan modes while one is active requires the "sorry" keyword.

| Action | Command Example | AI Response |
|--------|-----------------|-------------|
| Switch to Scan from Print | `sorry, scan` | `Scan mode.` |
| Switch to Print from Scan | `sorry, print` | `Print mode.` |
| Attempt switch without "sorry" | `scan` (while in Print) | `Say "sorry" first to switch to scan.` |

---

## 🖨️ Print Workflow Commands

The print workflow follows a 4-step progression: **Select -> Configure -> Review -> Execute**.

### Step 1: Document Selection
*State: `PRINT_WORKFLOW` | Step: `SELECT_DOCUMENT`*

| Command Type | Patterns | Example | AI Response |
|--------------|----------|---------|-------------|
| **Select** | `select`, `choose`, `pick` | `select document 1` | `Got it, document 1.` |
| **Section** | `converted`, `uploaded`, `originals` | `switch to converted` | `Converted.` |
| **Navigation** | `next`, `previous`, `back` | `next document` | `Next.` |
| **Continue** | `confirm`, `proceed`, `next step` | `confirm selection` | `Ready. Confirm?` |

### Step 2: Configuration
*State: `PRINT_WORKFLOW` | Step: `CONFIGURATION`*

| Setting | Patterns | Example | AI Response |
|---------|----------|---------|-------------|
| **Layout** | `portrait`, `landscape` | `set landscape` | `Landscape.` |
| **Color** | `color`, `grayscale`, `bw` | `color mode` | `Color.` |
| **Copies** | `copies`, `copy` | `3 copies` | `3 copies.` |
| **Paper Size** | `A4`, `Letter`, `Legal` | `A4 size` | `A4.` |
| **Quality** | `draft`, `normal`, `high` | `high quality` | `High quality.` |
| **Duplex** | `duplex`, `double sided` | `double sided` | `Double-sided.` |

### Step 3: Review & Step 4: Execution
*State: `PRINT_WORKFLOW` | Step: `REVIEW` / `EXECUTING`*

| Action | Patterns | Example | AI Response |
|--------|----------|---------|-------------|
| **Execute** | `confirm`, `start`, `print` | `confirm print` | `Printing now!` |
| **Cancel** | `cancel`, `stop`, `abort` | `cancel print` | `Cancelled.` |
| **Status** | `status`, `progress` | `what's the status?` | `Printing...` |

---

## 📸 Scan Workflow Commands

The scan workflow follows a 5-step progression: **Source -> Select -> Configure -> Review -> Execute**.

### Step 1: Source Selection
*State: `SCAN_WORKFLOW` | Step: `SOURCE_SELECTION`*

| Action | Patterns | Example | AI Response |
|--------|----------|---------|-------------|
| **Feed Tray** | `feed`, `tray`, `insert` | `use feed tray` | `Feeding documents.` |
| **Manual Select** | `select`, `manual` | `select from files` | `Opening selection.` |

### Step 2 & 3: Selection & Configuration
*State: `SCAN_WORKFLOW` | Step: `SELECT_DOCUMENT` / `CONFIGURATION`*

| Setting | Patterns | Example | AI Response |
|---------|----------|---------|-------------|
| **OCR** | `ocr`, `text mode`, `recognize` | `enable ocr` | `OCR on.` |
| **Format** | `pdf`, `jpeg`, `png` | `save as pdf` | `PDF.` |
| **Resolution** | `dpi`, `resolution` | `300 dpi` | `300 DPI.` |
| **Mode** | `single`, `multi`, `batch` | `multi page scan` | `Multi page.` |

---

## 🌐 Global & UI Commands

These commands are available across most states to control the interface and get information.

| Category | Command | Example | Action |
|----------|---------|---------|--------|
| **Help** | `help`, `commands` | `what can you do?` | Shows help dialog |
| **Status** | `status`, `where are we` | `current status` | Reports current mode/step |
| **Navigation** | `scroll up`, `scroll down` | `scroll down` | Scrolls the active panel |
| **UI Control** | `close`, `exit`, `back` | `close panel` | Closes modals or goes back |
| **System** | `connectivity`, `device info` | `check printer` | Shows device status toast |

---

## 🔄 Command Flow Example: Full Print Job

1.  **User**: "print" -> **AI**: "Print mode." (Enters `PRINT_WORKFLOW`)
2.  **User**: "select document 3" -> **AI**: "Got it, document 3."
3.  **User**: "landscape, 2 copies" -> **AI**: "Landscape. 2 copies."
4.  **User**: "confirm" -> **AI**: "Ready. Confirm?" (Moves to `REVIEW`)
5.  **User**: "yes" -> **AI**: "Printing now!" (Moves to `EXECUTING`)

---

## 🛠 Technical Implementation Details

- **Command Parsing**: Handled by `commandParser.ts` using regex and keyword matching.
- **State Validation**: Enforced by `stateManager.ts` to ensure commands are contextually valid.
- **Action Execution**: Dispatched via `actionHandler.ts` to the UI and backend.
- **Voice Bridge**: `useVoiceCommandBridge.ts` synchronizes backend voice intents with frontend state.
