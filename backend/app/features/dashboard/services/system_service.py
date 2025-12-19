"""
PrintChakra Backend - System Service

Service for system-related operations including printer management.
"""

import os
import platform
import subprocess
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class SystemService:
    """Service for system information and configuration."""
    
    def get_system_info(self) -> Dict[str, Any]:
        """
        Get comprehensive system information.
        
        Returns:
            Dictionary containing system details
        """
        return {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "platform_version": platform.version(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "printers": self.get_printers(),
            "default_printer": self.get_default_printer(),
        }
    
    def get_printers(self) -> List[Dict[str, Any]]:
        """
        Get list of available printers.
        
        Returns:
            List of printer information dictionaries
        """
        system = platform.system()
        printers = []
        
        try:
            if system == "Windows":
                printers = self._get_windows_printers()
            elif system == "Darwin":  # macOS
                printers = self._get_macos_printers()
            elif system == "Linux":
                printers = self._get_linux_printers()
        except Exception as e:
            logger.error(f"Error getting printers: {e}")
        
        return printers
    
    def _get_windows_printers(self) -> List[Dict[str, Any]]:
        """Get printers on Windows."""
        printers = []
        try:
            result = subprocess.run(
                ["powershell", "-Command", 
                 "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"],
                capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0 and result.stdout.strip():
                import json
                data = json.loads(result.stdout)
                if isinstance(data, dict):
                    data = [data]
                for p in data:
                    printers.append({
                        "name": p.get("Name", "Unknown"),
                        "driver": p.get("DriverName", "Unknown"),
                        "port": p.get("PortName", "Unknown"),
                        "status": self._parse_printer_status(p.get("PrinterStatus", 0)),
                    })
        except Exception as e:
            logger.error(f"Error getting Windows printers: {e}")
        
        return printers
    
    def _get_macos_printers(self) -> List[Dict[str, Any]]:
        """Get printers on macOS."""
        printers = []
        try:
            result = subprocess.run(
                ["lpstat", "-p"], capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split("\n"):
                    if line.startswith("printer"):
                        parts = line.split()
                        if len(parts) >= 2:
                            printers.append({
                                "name": parts[1],
                                "status": "idle" if "idle" in line.lower() else "busy",
                            })
        except Exception as e:
            logger.error(f"Error getting macOS printers: {e}")
        
        return printers
    
    def _get_linux_printers(self) -> List[Dict[str, Any]]:
        """Get printers on Linux."""
        printers = []
        try:
            result = subprocess.run(
                ["lpstat", "-p"], capture_output=True, text=True, timeout=15
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split("\n"):
                    if line.startswith("printer"):
                        parts = line.split()
                        if len(parts) >= 2:
                            printers.append({
                                "name": parts[1],
                                "status": "idle" if "idle" in line.lower() else "busy",
                            })
        except Exception as e:
            logger.error(f"Error getting Linux printers: {e}")
        
        return printers
    
    def _parse_printer_status(self, status_code: int) -> str:
        """Parse Windows printer status code."""
        status_map = {
            0: "ready",
            1: "paused",
            2: "error",
            3: "pending_deletion",
            4: "paper_jam",
            5: "paper_out",
            6: "manual_feed",
            7: "paper_problem",
            8: "offline",
            9: "io_active",
            10: "busy",
            11: "printing",
            12: "output_bin_full",
            13: "not_available",
            14: "waiting",
            15: "processing",
            16: "initializing",
            17: "warming_up",
            18: "toner_low",
            19: "no_toner",
            20: "page_punt",
            21: "user_intervention",
            22: "out_of_memory",
            23: "door_open",
            24: "server_unknown",
            25: "power_save",
        }
        return status_map.get(status_code, "unknown")
    
    def get_default_printer(self) -> Optional[str]:
        """
        Get the default printer name.
        
        Returns:
            Default printer name or None
        """
        system = platform.system()
        
        try:
            if system == "Windows":
                result = subprocess.run(
                    ["powershell", "-Command",
                     "(Get-WmiObject -Query 'SELECT * FROM Win32_Printer WHERE Default=TRUE').Name"],
                    capture_output=True, text=True, timeout=15
                )
                if result.returncode == 0 and result.stdout.strip():
                    return result.stdout.strip()
            
            elif system in ["Darwin", "Linux"]:
                result = subprocess.run(
                    ["lpstat", "-d"], capture_output=True, text=True, timeout=15
                )
                if result.returncode == 0:
                    # Parse "system default destination: printer_name"
                    output = result.stdout.strip()
                    if ":" in output:
                        return output.split(":")[-1].strip()
        
        except Exception as e:
            logger.error(f"Error getting default printer: {e}")
        
        return None
    
    def set_default_printer(self, printer_name: str) -> Dict[str, Any]:
        """
        Set the default printer.
        
        Args:
            printer_name: Name of printer to set as default
            
        Returns:
            Result dictionary with success status
        """
        system = platform.system()
        
        try:
            if system == "Windows":
                result = subprocess.run(
                    ["powershell", "-Command",
                     f'(Get-WmiObject -Query "SELECT * FROM Win32_Printer WHERE Name=\'{printer_name}\'").SetDefaultPrinter()'],
                    capture_output=True, text=True, timeout=15
                )
                if result.returncode == 0:
                    return {"success": True, "printer": printer_name}
                else:
                    return {"success": False, "error": result.stderr or "Failed to set default printer"}
            
            elif system in ["Darwin", "Linux"]:
                result = subprocess.run(
                    ["lpoptions", "-d", printer_name],
                    capture_output=True, text=True, timeout=15
                )
                if result.returncode == 0:
                    return {"success": True, "printer": printer_name}
                else:
                    return {"success": False, "error": result.stderr or "Failed to set default printer"}
            
            else:
                return {"success": False, "error": f"Unsupported platform: {system}"}
        
        except Exception as e:
            logger.error(f"Error setting default printer: {e}")
            return {"success": False, "error": str(e)}
