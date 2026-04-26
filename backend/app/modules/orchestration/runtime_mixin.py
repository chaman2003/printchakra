"""Runtime and history behaviors for the print/scan orchestrator."""

import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List

from .parsers import parse_voice_configuration_updates

logger = logging.getLogger(__name__)


class OrchestratorRuntimeMixin:
    """Mixin that holds runtime execution, status, and history helpers."""

    def _handle_status_inquiry(self) -> Dict[str, Any]:
        """Handle status inquiry."""
        return {
            "success": True,
            "intent": "status",
            "current_state": self.current_state.value,
            "selected_document": self.selected_document,
            "pending_action": self.pending_action,
            "configuration": self.configuration,
            "message": self._get_status_message(),
            "available_documents_count": len(self._get_available_documents()),
        }

    def _handle_configuration(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle configuration changes."""
        state_cls = self.current_state.__class__
        self.current_state = state_cls.CONFIGURING

        return {
            "success": True,
            "intent": "configure",
            "message": "What would you like to configure? (print settings / scan settings)",
            "current_configuration": self.configuration,
            "workflow_state": self.current_state.value,
        }

    def _handle_list_documents(self) -> Dict[str, Any]:
        """Handle document listing request."""
        documents = self._get_available_documents()

        if not documents:
            message = "No documents available. Upload or scan a document to get started."
        else:
            doc_list = ", ".join([doc["filename"] for doc in documents[:5]])
            message = f"Available documents ({len(documents)}): {doc_list}"
            if len(documents) > 5:
                message += f" and {len(documents) - 5} more..."

        return {
            "success": True,
            "intent": "list_documents",
            "message": message,
            "documents": documents,
            "count": len(documents),
        }

    def _handle_help_request(self) -> Dict[str, Any]:
        """Handle help request."""
        return {
            "success": True,
            "intent": "help",
            "message": "I can help you with document operations! Here's what I can do:",
            "capabilities": [
                {
                    "action": "Print",
                    "description": "Print documents with custom settings (copies, color, duplex)",
                    "examples": [
                        "Print this document",
                        "Print 2 copies in color",
                        "Print double-sided",
                    ],
                },
                {
                    "action": "Scan",
                    "description": "Scan or capture documents with quality settings",
                    "examples": ["Scan a document", "Scan in high quality", "Capture as PDF"],
                },
                {
                    "action": "Status",
                    "description": "Check current workflow status and progress",
                    "examples": ["What's the status?", "Show progress", "What's happening?"],
                },
                {
                    "action": "List",
                    "description": "View available documents",
                    "examples": ["List documents", "Show files", "What documents are available?"],
                },
                {
                    "action": "Configure",
                    "description": "Change default settings",
                    "examples": [
                        "Configure print settings",
                        "Change scan quality",
                        "Set up options",
                    ],
                },
            ],
        }

    def confirm_action(self) -> Dict[str, Any]:
        """Confirm and execute pending action."""
        with self.state_lock:
            state_cls = self.current_state.__class__
            if self.current_state != state_cls.AWAITING_CONFIRMATION:
                return {
                    "success": False,
                    "error": "No action pending confirmation",
                    "current_state": self.current_state.value,
                }

            if not self.pending_action:
                return {"success": False, "error": "No action configured"}

            self.current_state = state_cls.EXECUTING
            action_type = self.pending_action["type"]

            try:
                if action_type == "print":
                    result = self._execute_print()
                elif action_type == "scan":
                    result = self._execute_scan()
                else:
                    result = {"success": False, "error": f"Unknown action type: {action_type}"}

                if result["success"]:
                    self.current_state = state_cls.COMPLETED
                else:
                    self.current_state = state_cls.FAILED

                self.workflow_history.append(
                    {
                        "timestamp": datetime.now().isoformat(),
                        "action": self.pending_action,
                        "result": result,
                    }
                )

                self.pending_action = None
                return result

            except Exception as exc:
                logger.error(f"[ERROR] Action execution failed: {exc}")
                self.current_state = state_cls.FAILED
                return {"success": False, "error": str(exc), "action": self.pending_action}

    def cancel_action(self) -> Dict[str, Any]:
        """Cancel pending action."""
        with self.state_lock:
            state_cls = self.current_state.__class__
            if self.current_state != state_cls.AWAITING_CONFIRMATION:
                return {"success": False, "message": "No action to cancel"}

            cancelled_action = self.pending_action
            self.pending_action = None
            self.current_state = state_cls.IDLE

            return {
                "success": True,
                "message": "Action cancelled",
                "cancelled_action": cancelled_action,
            }

    def _execute_print(self) -> Dict[str, Any]:
        """Execute print operation."""
        logger.info("[PRINT] Executing print operation...")

        document = self.pending_action.get("document")
        config = self.pending_action.get("configuration")

        if not document:
            return {"success": False, "error": "No document selected"}

        file_path = os.path.join(self.processed_dir, document["filename"])
        if not os.path.exists(file_path):
            return {"success": False, "error": f"Document not found: {document['filename']}"}

        return {
            "success": True,
            "action": "print",
            "message": f"Print job sent: {document['filename']}",
            "document": document,
            "configuration": config,
            "job_id": f"print_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
        }

    def _execute_scan(self) -> Dict[str, Any]:
        """Execute scan operation."""
        logger.info("[SCAN] Executing scan operation...")

        config = self.pending_action.get("configuration")

        return {
            "success": True,
            "action": "scan",
            "message": "Opening scan interface...",
            "configuration": config,
            "next_steps": [
                "Open phone capture interface",
                "Position document in frame",
                "Capture when ready",
            ],
            "redirect_to": "/phone",
            "timestamp": datetime.now().isoformat(),
        }

    def select_document(self, filename: str) -> Dict[str, Any]:
        """Select a document for operation."""
        documents = self._get_available_documents()
        document = next((doc for doc in documents if doc["filename"] == filename), None)

        if not document:
            return {"success": False, "error": f"Document not found: {filename}"}

        self.selected_document = document
        return {"success": True, "message": f"Selected document: {filename}", "document": document}

    def parse_voice_configuration(self, voice_text: str, action_type: str) -> Dict[str, Any]:
        """Parse voice commands for configuration changes."""
        return parse_voice_configuration_updates(voice_text, action_type)

    def update_configuration(self, action_type: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration for print or scan."""
        if action_type not in ["print", "scan"]:
            return {"success": False, "error": f"Invalid action type: {action_type}"}

        normalized_settings = dict(settings)
        if action_type == "scan" and "page_size" in normalized_settings and "paper_size" not in normalized_settings:
            normalized_settings["paper_size"] = normalized_settings.pop("page_size")

        self.configuration[action_type].update(normalized_settings)

        frontend_state = self._build_frontend_state(action_type)
        frontend_updates = self._build_frontend_updates(action_type, normalized_settings)

        return {
            "success": True,
            "message": f"{action_type.capitalize()} configuration updated",
            "configuration": self.configuration[action_type],
            "frontend_state": frontend_state,
            "frontend_updates": frontend_updates,
        }

    def _get_available_documents(self) -> List[Dict[str, Any]]:
        """Get list of available processed documents with index positions."""
        if not os.path.exists(self.processed_dir):
            return []

        documents = []
        for filename in os.listdir(self.processed_dir):
            if filename.lower().endswith((".png", ".jpg", ".jpeg", ".pdf")):
                file_path = os.path.join(self.processed_dir, filename)
                if os.path.exists(file_path):
                    stat = os.stat(file_path)
                    documents.append(
                        {
                            "filename": filename,
                            "size": stat.st_size,
                            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                            "path": file_path,
                        }
                    )

        documents.sort(key=lambda x: x["created"], reverse=True)

        for idx, doc in enumerate(documents):
            doc["index"] = idx + 1
            doc["position"] = idx

        return documents

    def get_documents_by_relative_position(self, position_desc: str) -> List[Dict[str, Any]]:
        """Get documents by relative position descriptions like last 2 or first 3."""
        documents = self._get_available_documents()
        if not documents:
            return []

        position_lower = position_desc.lower().strip()

        if position_lower in ["last", "latest", "newest", "most recent", "recent"]:
            return [documents[0]]

        if position_lower in ["first", "oldest", "earliest"]:
            return [documents[-1]]

        last_match = re.search(r"(?:last|latest|recent|newest)\s+(\d+)", position_lower)
        if last_match:
            count = int(last_match.group(1))
            return documents[: min(count, len(documents))]

        first_match = re.search(r"(?:first|oldest|earliest)\s+(\d+)", position_lower)
        if first_match:
            count = int(first_match.group(1))
            return documents[-min(count, len(documents)) :][::-1]

        return []

    def _get_status_message(self) -> str:
        """Generate human-readable status message."""
        state_cls = self.current_state.__class__

        if self.current_state == state_cls.IDLE:
            return "Ready for commands. What would you like to do?"
        if self.current_state == state_cls.AWAITING_CONFIRMATION:
            action_type = self.pending_action.get("type", "action") if self.pending_action else "action"
            return f"Awaiting confirmation for {action_type} operation."
        if self.current_state == state_cls.EXECUTING:
            return "Executing operation..."
        if self.current_state == state_cls.CONFIGURING:
            return "In configuration mode."
        if self.current_state == state_cls.COMPLETED:
            return "Last operation completed successfully."
        if self.current_state == state_cls.FAILED:
            return "Last operation failed. Ready for new commands."
        return "Unknown state."

    def get_workflow_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get workflow history."""
        return self.workflow_history[-limit:]

    def reset_state(self) -> Dict[str, Any]:
        """Reset orchestrator to idle state."""
        with self.state_lock:
            state_cls = self.current_state.__class__
            self.current_state = state_cls.IDLE
            self.pending_action = None
            self.selected_document = None

            return {
                "success": True,
                "message": "Orchestrator reset to idle state",
                "current_state": self.current_state.value,
            }

    def reset(self) -> None:
        """Reset the orchestrator state (alias for reset_state)."""
        self.reset_state()

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get orchestration history."""
        return self.workflow_history[-limit:]

    def execute_print(self, files: List[str], settings: Dict[str, Any]) -> Dict[str, Any]:
        """Execute print workflow for files."""
        with self.state_lock:
            state_cls = self.current_state.__class__
            self.current_state = state_cls.EXECUTING

        try:
            workflow_entry = {
                "type": "print",
                "files": files,
                "settings": settings,
                "timestamp": datetime.now().isoformat(),
                "status": "executing",
            }

            try:
                from app.features.print.services.print_job_service import PrintJobService

                job_service = PrintJobService()

                results = []
                for filename in files:
                    copies = settings.get("copies", 1)
                    result = job_service.print_document(filename, copies)
                    results.append(
                        {
                            "filename": filename,
                            "success": result.get("success", False),
                            "message": result.get("message") or result.get("error"),
                        }
                    )

                success_count = sum(1 for r in results if r["success"])

                workflow_entry["status"] = "completed" if success_count > 0 else "failed"
                workflow_entry["results"] = results
                self.workflow_history.append(workflow_entry)

                with self.state_lock:
                    self.current_state = state_cls.COMPLETED if success_count > 0 else state_cls.FAILED

                return {
                    "success": success_count > 0,
                    "message": f"Printed {success_count}/{len(files)} files",
                    "results": results,
                }

            except ImportError:
                workflow_entry["status"] = "failed"
                workflow_entry["error"] = "Print service not available"
                self.workflow_history.append(workflow_entry)

                with self.state_lock:
                    self.current_state = state_cls.FAILED

                return {
                    "success": False,
                    "error": "Print service not available",
                }

        except Exception as exc:
            with self.state_lock:
                self.current_state = state_cls.FAILED

            return {
                "success": False,
                "error": str(exc),
            }

    def execute_scan(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Execute scan workflow."""
        with self.state_lock:
            state_cls = self.current_state.__class__
            self.current_state = state_cls.EXECUTING

        try:
            workflow_entry = {
                "type": "scan",
                "settings": settings,
                "timestamp": datetime.now().isoformat(),
                "status": "executing",
            }

            workflow_entry["status"] = "completed"
            workflow_entry["message"] = "Scan operation initiated"
            self.workflow_history.append(workflow_entry)

            with self.state_lock:
                self.current_state = state_cls.COMPLETED

            return {
                "success": True,
                "message": "Scan operation initiated",
                "settings": settings,
            }

        except Exception as exc:
            with self.state_lock:
                self.current_state = state_cls.FAILED

            return {
                "success": False,
                "error": str(exc),
            }
