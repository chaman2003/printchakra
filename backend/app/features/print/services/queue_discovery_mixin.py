"""Printer queue discovery helpers split from PrinterService."""

import json
import logging
import subprocess
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class PrinterQueueDiscoveryMixin:
    """Mixin for Windows/CUPS queue discovery and status normalization."""

    def _get_windows_queues(self) -> List[Dict[str, Any]]:
        """Get printer queues on Windows using PowerShell."""
        script = """
$printers = Get-Printer | Sort-Object -Property Name
$result = @()
foreach ($printer in $printers) {
    $jobs = @()

    # Method 1: Try Get-PrintJob (standard API)
    try {
        $jobs = Get-PrintJob -PrinterName $printer.Name -ErrorAction Stop | ForEach-Object {
            [PSCustomObject]@{
                id = $_.Id
                document = $_.DocumentName
                owner = $_.UserName
                status = ($_.JobStatus -join ',')
                submitted = $_.TimeSubmitted.ToString('o')
                totalPages = $_.TotalPages
                pagesPrinted = $_.PagesPrinted
                sizeBytes = $_.Size
            }
        }
    } catch {
        # Method 2: Fallback to WMI if Get-PrintJob fails
        try {
            $wmiJobs = Get-WmiObject -Class Win32_PrintJob -Filter "Name like '%$($printer.Name)%'" -ErrorAction Stop
            $jobs = $wmiJobs | ForEach-Object {
                [PSCustomObject]@{
                    id = $_.JobId
                    document = $_.Document
                    owner = $_.Owner
                    status = $_.Status
                    submitted = $_.TimeSubmitted
                    totalPages = $_.TotalPages
                    pagesPrinted = $_.PagesPrinted
                    sizeBytes = $_.Size
                }
            }
        } catch {
            # Method 3: Last resort - check spool directory for .SPL/.SHD files
            try {
                $spoolPath = Join-Path $env:windir 'System32\spool\PRINTERS'
                if (Test-Path $spoolPath) {
                    $spoolFiles = Get-ChildItem -Path $spoolPath -Filter '*.SPL' -ErrorAction SilentlyContinue
                    $jobs = $spoolFiles | ForEach-Object {
                        [PSCustomObject]@{
                            id = $_.BaseName
                            document = $_.Name
                            owner = 'unknown'
                            status = 'spooling'
                            submitted = $_.CreationTime.ToString('o')
                            totalPages = $null
                            pagesPrinted = $null
                            sizeBytes = $_.Length
                        }
                    }
                }
            } catch {}
        }
    }

    $result += [PSCustomObject]@{
        name = $printer.Name
        status = $printer.PrinterStatus
        isDefault = $printer.Default
        jobs = @($jobs)
    }
}
$result | ConvertTo-Json -Depth 6
""".strip()

        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", script],
                capture_output=True,
                text=True,
                timeout=40,
            )

            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or "Failed to query printers")

            output = result.stdout.strip() or "[]"
            raw_printers = json.loads(output)

            printers = []
            for printer in raw_printers:
                jobs = printer.get("jobs", []) or []
                printers.append(
                    {
                        "name": printer.get("name"),
                        "status": self._normalize_status(printer.get("status")),
                        "isDefault": printer.get("isDefault", False),
                        "jobs": [
                            {
                                "id": job.get("id"),
                                "document": job.get("document"),
                                "owner": job.get("owner"),
                                "status": job.get("status") or "in queue",
                                "submitted": job.get("submitted"),
                                "pagesPrinted": job.get("pagesPrinted"),
                                "totalPages": job.get("totalPages"),
                                "sizeBytes": job.get("sizeBytes"),
                            }
                            for job in jobs
                        ],
                    }
                )

            return printers

        except subprocess.TimeoutExpired:
            logger.error("Printer query timed out")
            return []
        except Exception as exc:
            logger.error(f"Failed to get Windows printer queues: {exc}")
            return []

    def _get_cups_queues(self) -> List[Dict[str, Any]]:
        """Get printer queues on Linux/macOS using CUPS."""
        printers = {}

        try:
            printers_result = subprocess.run(
                ["lpstat", "-p"],
                capture_output=True,
                text=True,
                timeout=15,
            )

            if printers_result.returncode == 0:
                for line in printers_result.stdout.splitlines():
                    parts = line.split()
                    if len(parts) >= 3 and parts[0] == "printer":
                        name = parts[1]
                        status_fragment = " ".join(parts[3:]).strip()
                        status = status_fragment.split(".")[0] if status_fragment else "unknown"
                        printers[name] = {
                            "name": name,
                            "status": status,
                            "isDefault": False,
                            "jobs": [],
                        }

            jobs_result = subprocess.run(
                ["lpstat", "-W", "not-completed", "-o"],
                capture_output=True,
                text=True,
                timeout=15,
            )

            if jobs_result.returncode == 0:
                for line in jobs_result.stdout.splitlines():
                    parts = line.split()
                    if not parts:
                        continue
                    job_id = parts[0]
                    printer_name = job_id.split("-", 1)[0]
                    owner = parts[1] if len(parts) > 1 else "unknown"
                    submitted = " ".join(parts[2:]) if len(parts) > 2 else ""

                    job = {
                        "id": job_id,
                        "document": job_id,
                        "owner": owner,
                        "status": "pending",
                        "submitted": submitted,
                        "totalPages": None,
                        "pagesPrinted": None,
                        "sizeBytes": None,
                    }

                    if printer_name in printers:
                        printers[printer_name]["jobs"].append(job)
                    else:
                        printers[printer_name] = {
                            "name": printer_name,
                            "status": "unknown",
                            "isDefault": False,
                            "jobs": [job],
                        }

            return list(printers.values())

        except Exception as exc:
            logger.error(f"Failed to get CUPS printer queues: {exc}")
            return []

    def _normalize_status(self, code: int) -> str:
        """Convert Windows printer status code to string."""
        status_map = {
            0: "ready",
            1: "paused",
            2: "error",
            3: "pending deletion",
            4: "paper jam",
            5: "paper out",
            6: "manual feed",
            7: "paper problem",
            8: "offline",
            9: "io active",
            10: "busy",
            11: "printing",
            12: "output bin full",
            13: "not available",
            14: "waiting",
            15: "processing",
            16: "initializing",
            17: "warming up",
            18: "toner low",
            19: "no toner",
            20: "page punt",
            21: "user intervention",
            22: "out of memory",
            23: "door open",
            24: "server unknown",
            25: "power save",
        }
        return status_map.get(int(code) if code is not None else -1, "unknown")
