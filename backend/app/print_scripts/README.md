# Printer Test Scripts

## printer_test.py

Standalone printer connectivity test script that validates printing functionality.

### Usage

Run from the workspace root:
```bash
python backend/app/print_scripts/printer_test.py
```

Or from the print_scripts directory:
```bash
cd backend/app/print_scripts
python printer_test.py
```

### What It Does

1. **Prerequisite Checks**
   - Finds the default printer configured on the system
   - Locates `blank.pdf` test file in `backend/public/`

2. **Printer Status Check**
   - Retrieves current printer status
   - Shows number of jobs in queue

3. **Printing Attempts** (in order, tries next if previous fails)
   - **Step 1**: PowerShell `Start-Process` with PrintTo verb
   - **Step 2**: Win32 `ShellExecute` API
   - **Step 3**: Win32 Print Spooler (most reliable)
   - **Step 4**: LPR/Print command

4. **Results**
   - Reports success/failure
   - Logs errors for debugging
   - Exit code 0 = success, 1 = failure

### Output Example

```
============================================================
PRINTER CONNECTIVITY TEST
============================================================

[PREREQUISITE CHECKS]
✓ Default printer found: HP LaserJet 1020
✓ blank.pdf found at: .../backend/public/blank.pdf
✓ All prerequisites met

[PRINTER STATUS]
  Status: Normal
  Jobs in queue: 0

[PRINTING ATTEMPTS]
[STEP 1] Attempting print via PowerShell Start-Process...
  ✗ PowerShell failed: This command cannot be run...

[STEP 2] Attempting print via Win32 ShellExecute (fallback)...
  ✗ ShellExecute print failed: A device attached...

[STEP 3] Attempting print via Win32 Print Spooler...
  ✓ Print job 2 sent via Win32 Spooler

[RESULTS]
✓ Print command executed successfully
  Check your printer for the test page

============================================================
✅ TEST PASSED
============================================================
```

### Requirements

- Python 3.6+
- `pywin32` package: `pip install pywin32`
- Windows system (requires win32 APIs)
- Default printer configured
- `blank.pdf` file present in `backend/public/`

### Troubleshooting

If the test fails:

1. **"No default printer found"**
   - Configure a default printer in Windows Settings > Printers

2. **"blank.pdf not found"**
   - Ensure `backend/public/blank.pdf` exists

3. **All print methods failed**
   - Check printer power and connectivity
   - Verify printer drivers are installed
   - Test printing directly from Windows (Print menu)
   - Check printer status: `Get-Printer` in PowerShell

4. **pywin32 not installed**
   - Run: `pip install pywin32`
   - Then: `python -m pywin32_postinstall -install`

### Integration with Backend

The backend `/connection/validate-printer` endpoint uses the same Win32 Spooler method from this script. If this test passes, the connectivity check should also succeed.
