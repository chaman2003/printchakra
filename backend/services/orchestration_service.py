"""
AI Orchestration Service - Intelligent Print & Scan Orchestration
Provides hands-free, context-aware document operations with autonomous workflow execution
"""

import os
import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from enum import Enum
import threading

logger = logging.getLogger(__name__)


class IntentType(Enum):
    """Supported orchestration intents"""
    PRINT = "print"
    SCAN = "scan"
    VIEW_STATUS = "view_status"
    CONFIGURE = "configure"
    LIST_DOCUMENTS = "list_documents"
    HELP = "help"
    UNKNOWN = "unknown"


class WorkflowState(Enum):
    """Workflow execution states"""
    IDLE = "idle"
    AWAITING_CONFIRMATION = "awaiting_confirmation"
    EXECUTING = "executing"
    CONFIGURING = "configuring"
    COMPLETED = "completed"
    FAILED = "failed"


class PrintScanOrchestrator:
    """
    Intelligent orchestrator for print and scan operations
    Handles intent detection, workflow execution, and state management
    """
    
    def __init__(self, data_dir: str):
        """
        Initialize orchestrator
        
        Args:
            data_dir: Base data directory for documents
        """
        self.data_dir = data_dir
        self.processed_dir = os.path.join(data_dir, 'processed')
        self.upload_dir = os.path.join(data_dir, 'uploads')
        
        # Workflow state
        self.current_state = WorkflowState.IDLE
        self.pending_action = None
        self.selected_document = None
        self.configuration = self._default_configuration()
        self.workflow_history = []
        self.state_lock = threading.Lock()
        
        logger.info("🤖 AI Orchestrator initialized")
    
    def _default_configuration(self) -> Dict[str, Any]:
        """Get default print/scan configuration"""
        return {
            'print': {
                'copies': 1,
                'paper_size': 'A4',
                'orientation': 'portrait',
                'color_mode': 'color',
                'duplex': False,
                'pages': 'all',
                'quality': 'high'
            },
            'scan': {
                'resolution': 300,
                'color_mode': 'color',
                'paper_size': 'A4',
                'orientation': 'portrait',
                'format': 'pdf',
                'quality': 'high'
            }
        }
    
    def detect_intent(self, user_input: str) -> Tuple[IntentType, Dict[str, Any]]:
        """
        Detect user intent from natural language input
        
        Args:
            user_input: User's text or voice input
            
        Returns:
            Tuple of (intent_type, extracted_parameters)
        """
        user_input_lower = user_input.lower()
        parameters = {}
        
        # Print intent patterns
        print_keywords = ['print', 'printing', 'printout', 'hard copy', 'paper copy']
        if any(keyword in user_input_lower for keyword in print_keywords):
            # Extract parameters
            if 'color' in user_input_lower:
                parameters['color_mode'] = 'color'
            elif 'black' in user_input_lower or 'grayscale' in user_input_lower:
                parameters['color_mode'] = 'grayscale'
            
            # Extract number of copies
            copy_match = re.search(r'(\d+)\s*cop(?:y|ies)', user_input_lower)
            if copy_match:
                parameters['copies'] = int(copy_match.group(1))
            
            # Extract paper size
            if 'a4' in user_input_lower:
                parameters['paper_size'] = 'A4'
            elif 'letter' in user_input_lower:
                parameters['paper_size'] = 'letter'
            
            # Extract duplex
            if 'both sides' in user_input_lower or 'duplex' in user_input_lower or 'double sided' in user_input_lower:
                parameters['duplex'] = True
            
            return IntentType.PRINT, parameters
        
        # Scan intent patterns
        scan_keywords = ['scan', 'scanning', 'capture', 'digitize', 'photo']
        if any(keyword in user_input_lower for keyword in scan_keywords):
            # Extract parameters
            if 'high quality' in user_input_lower or 'high resolution' in user_input_lower:
                parameters['resolution'] = 600
                parameters['quality'] = 'high'
            elif 'low quality' in user_input_lower or 'low resolution' in user_input_lower:
                parameters['resolution'] = 150
                parameters['quality'] = 'low'
            
            if 'pdf' in user_input_lower:
                parameters['format'] = 'pdf'
            elif 'jpg' in user_input_lower or 'jpeg' in user_input_lower:
                parameters['format'] = 'jpg'
            
            return IntentType.SCAN, parameters
        
        # Status inquiry
        status_keywords = ['status', 'what\'s happening', 'progress', 'how\'s it going']
        if any(keyword in user_input_lower for keyword in status_keywords):
            return IntentType.VIEW_STATUS, {}
        
        # Configuration
        config_keywords = ['configure', 'settings', 'set up', 'change settings', 'options']
        if any(keyword in user_input_lower for keyword in config_keywords):
            return IntentType.CONFIGURE, parameters
        
        # List documents
        list_keywords = ['list', 'show documents', 'what documents', 'available files', 'show files']
        if any(keyword in user_input_lower for keyword in list_keywords):
            return IntentType.LIST_DOCUMENTS, {}
        
        # Help
        help_keywords = ['help', 'what can you do', 'capabilities', 'how to']
        if any(keyword in user_input_lower for keyword in help_keywords):
            return IntentType.HELP, {}
        
        return IntentType.UNKNOWN, {}
    
    def process_command(self, user_input: str) -> Dict[str, Any]:
        """
        Process user command and execute workflow
        
        Args:
            user_input: Natural language command
            
        Returns:
            Response dictionary with action results
        """
        with self.state_lock:
            intent, parameters = self.detect_intent(user_input)
            
            logger.info(f"🎯 Detected intent: {intent.value}, Parameters: {parameters}")
            
            # Route to appropriate handler
            if intent == IntentType.PRINT:
                return self._handle_print_intent(parameters)
            elif intent == IntentType.SCAN:
                return self._handle_scan_intent(parameters)
            elif intent == IntentType.VIEW_STATUS:
                return self._handle_status_inquiry()
            elif intent == IntentType.CONFIGURE:
                return self._handle_configuration(parameters)
            elif intent == IntentType.LIST_DOCUMENTS:
                return self._handle_list_documents()
            elif intent == IntentType.HELP:
                return self._handle_help_request()
            else:
                return {
                    'success': False,
                    'intent': 'unknown',
                    'message': 'I didn\'t understand that command. Try "help" to see what I can do.',
                    'suggestions': [
                        'Print a document',
                        'Scan a document',
                        'List available documents',
                        'Show status',
                        'Help'
                    ]
                }
    
    def _handle_print_intent(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle print intent
        
        Args:
            parameters: Extracted parameters
            
        Returns:
            Response dictionary
        """
        # Check if this is a voice-triggered orchestration request
        voice_triggered = parameters.pop('voice_triggered', False)
        
        # Get available documents
        documents = self._get_available_documents()
        
        if not documents:
            return {
                'success': False,
                'intent': 'print',
                'message': 'No documents available to print. Please upload or scan a document first.',
                'requires_action': 'upload_or_scan'
            }
        
        # If only one document, select it automatically
        if len(documents) == 1:
            self.selected_document = documents[0]
        
        # Update configuration with parameters
        if parameters:
            self.configuration['print'].update(parameters)
        
        # Prepare confirmation message
        doc_name = self.selected_document['filename'] if self.selected_document else 'a document'
        config = self.configuration['print']
        
        config_summary = f"{config['copies']} cop{'y' if config['copies'] == 1 else 'ies'}"
        if config['color_mode']:
            config_summary += f", {config['color_mode']}"
        if config['duplex']:
            config_summary += ", duplex"
        if config['paper_size']:
            config_summary += f", {config['paper_size']}"
        
        # Set state based on trigger type
        if voice_triggered:
            self.current_state = WorkflowState.CONFIGURING
            message = "What options would you like to change or edit?"
        else:
            self.current_state = WorkflowState.AWAITING_CONFIRMATION
            message = f'Ready to print {doc_name} ({config_summary}). Shall we proceed?'
        
        self.pending_action = {
            'type': 'print',
            'document': self.selected_document,
            'configuration': self.configuration['print'].copy(),
            'voice_triggered': voice_triggered
        }
        
        return {
            'success': True,
            'intent': 'print',
            'requires_confirmation': not voice_triggered,
            'requires_options': voice_triggered,
            'message': message,
            'document': self.selected_document,
            'configuration': self.configuration['print'],
            'available_documents': documents if not self.selected_document else None,
            'workflow_state': self.current_state.value,
            'open_ui': voice_triggered,
            'skip_mode_selection': voice_triggered
        }
    
    def _handle_scan_intent(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle scan intent
        
        Args:
            parameters: Extracted parameters
            
        Returns:
            Response dictionary
        """
        # Check if this is a voice-triggered orchestration request
        voice_triggered = parameters.pop('voice_triggered', False)
        
        # Update configuration with parameters
        if parameters:
            self.configuration['scan'].update(parameters)
        
        config = self.configuration['scan']
        config_summary = f"{config['resolution']} DPI, {config['color_mode']}, {config['format'].upper()}"
        
        # Set state based on trigger type
        if voice_triggered:
            self.current_state = WorkflowState.CONFIGURING
            message = "What options would you like to change or edit?"
        else:
            self.current_state = WorkflowState.AWAITING_CONFIRMATION
            message = f'Ready to scan document ({config_summary}). Shall we proceed?'
        
        self.pending_action = {
            'type': 'scan',
            'configuration': self.configuration['scan'].copy(),
            'voice_triggered': voice_triggered
        }
        
        return {
            'success': True,
            'intent': 'scan',
            'requires_confirmation': not voice_triggered,
            'requires_options': voice_triggered,
            'message': message,
            'configuration': self.configuration['scan'],
            'workflow_state': self.current_state.value,
            'next_step': 'Open phone capture interface or use connected scanner' if not voice_triggered else None,
            'open_ui': voice_triggered,
            'skip_mode_selection': voice_triggered
        }
    
    def _handle_status_inquiry(self) -> Dict[str, Any]:
        """Handle status inquiry"""
        return {
            'success': True,
            'intent': 'status',
            'current_state': self.current_state.value,
            'selected_document': self.selected_document,
            'pending_action': self.pending_action,
            'configuration': self.configuration,
            'message': self._get_status_message(),
            'available_documents_count': len(self._get_available_documents())
        }
    
    def _handle_configuration(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle configuration changes"""
        self.current_state = WorkflowState.CONFIGURING
        
        return {
            'success': True,
            'intent': 'configure',
            'message': 'What would you like to configure? (print settings / scan settings)',
            'current_configuration': self.configuration,
            'workflow_state': self.current_state.value
        }
    
    def _handle_list_documents(self) -> Dict[str, Any]:
        """Handle document listing request"""
        documents = self._get_available_documents()
        
        if not documents:
            message = 'No documents available. Upload or scan a document to get started.'
        else:
            doc_list = ', '.join([doc['filename'] for doc in documents[:5]])
            message = f'Available documents ({len(documents)}): {doc_list}'
            if len(documents) > 5:
                message += f' and {len(documents) - 5} more...'
        
        return {
            'success': True,
            'intent': 'list_documents',
            'message': message,
            'documents': documents,
            'count': len(documents)
        }
    
    def _handle_help_request(self) -> Dict[str, Any]:
        """Handle help request"""
        return {
            'success': True,
            'intent': 'help',
            'message': 'I can help you with document operations! Here\'s what I can do:',
            'capabilities': [
                {
                    'action': 'Print',
                    'description': 'Print documents with custom settings (copies, color, duplex)',
                    'examples': ['Print this document', 'Print 2 copies in color', 'Print double-sided']
                },
                {
                    'action': 'Scan',
                    'description': 'Scan or capture documents with quality settings',
                    'examples': ['Scan a document', 'Scan in high quality', 'Capture as PDF']
                },
                {
                    'action': 'Status',
                    'description': 'Check current workflow status and progress',
                    'examples': ['What\'s the status?', 'Show progress', 'What\'s happening?']
                },
                {
                    'action': 'List',
                    'description': 'View available documents',
                    'examples': ['List documents', 'Show files', 'What documents are available?']
                },
                {
                    'action': 'Configure',
                    'description': 'Change default settings',
                    'examples': ['Configure print settings', 'Change scan quality', 'Set up options']
                }
            ]
        }
    
    def confirm_action(self) -> Dict[str, Any]:
        """
        Confirm and execute pending action
        
        Returns:
            Execution result
        """
        with self.state_lock:
            if self.current_state != WorkflowState.AWAITING_CONFIRMATION:
                return {
                    'success': False,
                    'error': 'No action pending confirmation',
                    'current_state': self.current_state.value
                }
            
            if not self.pending_action:
                return {
                    'success': False,
                    'error': 'No action configured'
                }
            
            # Execute the pending action
            self.current_state = WorkflowState.EXECUTING
            action_type = self.pending_action['type']
            
            try:
                if action_type == 'print':
                    result = self._execute_print()
                elif action_type == 'scan':
                    result = self._execute_scan()
                else:
                    result = {
                        'success': False,
                        'error': f'Unknown action type: {action_type}'
                    }
                
                if result['success']:
                    self.current_state = WorkflowState.COMPLETED
                else:
                    self.current_state = WorkflowState.FAILED
                
                # Log to history
                self.workflow_history.append({
                    'timestamp': datetime.now().isoformat(),
                    'action': self.pending_action,
                    'result': result
                })
                
                # Clear pending action
                self.pending_action = None
                
                return result
                
            except Exception as e:
                logger.error(f"❌ Action execution failed: {e}")
                self.current_state = WorkflowState.FAILED
                return {
                    'success': False,
                    'error': str(e),
                    'action': self.pending_action
                }
    
    def cancel_action(self) -> Dict[str, Any]:
        """Cancel pending action"""
        with self.state_lock:
            if self.current_state != WorkflowState.AWAITING_CONFIRMATION:
                return {
                    'success': False,
                    'message': 'No action to cancel'
                }
            
            cancelled_action = self.pending_action
            self.pending_action = None
            self.current_state = WorkflowState.IDLE
            
            return {
                'success': True,
                'message': 'Action cancelled',
                'cancelled_action': cancelled_action
            }
    
    def _execute_print(self) -> Dict[str, Any]:
        """Execute print operation"""
        logger.info("🖨️  Executing print operation...")
        
        document = self.pending_action.get('document')
        config = self.pending_action.get('configuration')
        
        if not document:
            return {
                'success': False,
                'error': 'No document selected'
            }
        
        # Construct file path
        file_path = os.path.join(self.processed_dir, document['filename'])
        
        if not os.path.exists(file_path):
            return {
                'success': False,
                'error': f'Document not found: {document["filename"]}'
            }
        
        # Trigger print (this would interface with actual print module)
        # For now, return success with configuration
        return {
            'success': True,
            'action': 'print',
            'message': f'Print job sent: {document["filename"]}',
            'document': document,
            'configuration': config,
            'job_id': f'print_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
            'timestamp': datetime.now().isoformat()
        }
    
    def _execute_scan(self) -> Dict[str, Any]:
        """Execute scan operation"""
        logger.info("📸 Executing scan operation...")
        
        config = self.pending_action.get('configuration')
        
        # Trigger scan interface
        return {
            'success': True,
            'action': 'scan',
            'message': 'Opening scan interface...',
            'configuration': config,
            'next_steps': [
                'Open phone capture interface',
                'Position document in frame',
                'Capture when ready'
            ],
            'redirect_to': '/phone',
            'timestamp': datetime.now().isoformat()
        }
    
    def select_document(self, filename: str) -> Dict[str, Any]:
        """
        Select a document for operation
        
        Args:
            filename: Document filename
            
        Returns:
            Selection result
        """
        documents = self._get_available_documents()
        document = next((doc for doc in documents if doc['filename'] == filename), None)
        
        if not document:
            return {
                'success': False,
                'error': f'Document not found: {filename}'
            }
        
        self.selected_document = document
        
        return {
            'success': True,
            'message': f'Selected document: {filename}',
            'document': document
        }
    
    def parse_voice_configuration(self, voice_text: str, action_type: str) -> Dict[str, Any]:
        """
        Parse voice commands for configuration changes
        
        Args:
            voice_text: User's voice command text
            action_type: 'print' or 'scan'
            
        Returns:
            Parsed configuration updates
        """
        updates = {}
        text_lower = voice_text.lower()
        
        # Common stop phrases indicating no more changes
        stop_phrases = ['no changes', "that's all", 'nothing else', 'done', 'proceed', 
                       'continue', "i'm good", 'all set', 'looks good']
        
        if any(phrase in text_lower for phrase in stop_phrases):
            return {'no_changes': True}
        
        if action_type == 'print':
            # Orientation
            if 'landscape' in text_lower:
                updates['orientation'] = 'landscape'
            elif 'portrait' in text_lower:
                updates['orientation'] = 'portrait'
            
            # Copies
            import re
            copies_match = re.search(r'(\d+)\s*cop(?:y|ies)', text_lower)
            if copies_match:
                updates['copies'] = int(copies_match.group(1))
            
            # Color mode
            if 'color' in text_lower and 'black' not in text_lower:
                updates['color_mode'] = 'color'
            elif 'black and white' in text_lower or 'grayscale' in text_lower or 'monochrome' in text_lower:
                updates['color_mode'] = 'bw'
            
            # Duplex
            if 'double sided' in text_lower or 'duplex' in text_lower or 'both sides' in text_lower:
                updates['duplex'] = True
            elif 'single sided' in text_lower or 'one side' in text_lower:
                updates['duplex'] = False
            
            # Paper size
            paper_sizes = ['a4', 'letter', 'legal', 'a3']
            for size in paper_sizes:
                if size in text_lower:
                    updates['paper_size'] = size
                    break
            
            # Quality
            if 'high quality' in text_lower or 'best quality' in text_lower:
                updates['quality'] = 'high'
            elif 'draft' in text_lower or 'low quality' in text_lower:
                updates['quality'] = 'draft'
            elif 'normal quality' in text_lower:
                updates['quality'] = 'normal'
        
        elif action_type == 'scan':
            # Resolution
            import re
            dpi_match = re.search(r'(\d+)\s*dpi', text_lower)
            if dpi_match:
                updates['resolution'] = int(dpi_match.group(1))
            elif '300' in text_lower:
                updates['resolution'] = 300
            elif '600' in text_lower:
                updates['resolution'] = 600
            elif '1200' in text_lower:
                updates['resolution'] = 1200
            
            # Color mode
            if 'color' in text_lower and 'black' not in text_lower:
                updates['color_mode'] = 'color'
            elif 'black and white' in text_lower or 'grayscale' in text_lower:
                updates['color_mode'] = 'grayscale'
            
            # Format
            formats = ['pdf', 'png', 'jpg', 'jpeg', 'tiff']
            for fmt in formats:
                if fmt in text_lower:
                    updates['format'] = fmt
                    break
            
            # Page size
            page_sizes = ['a4', 'letter', 'legal']
            for size in page_sizes:
                if size in text_lower:
                    updates['page_size'] = size
                    break
        
        return updates
    
    def update_configuration(self, action_type: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update configuration for print or scan
        
        Args:
            action_type: 'print' or 'scan'
            settings: Settings to update
            
        Returns:
            Update result
        """
        if action_type not in ['print', 'scan']:
            return {
                'success': False,
                'error': f'Invalid action type: {action_type}'
            }
        
        self.configuration[action_type].update(settings)
        
        return {
            'success': True,
            'message': f'{action_type.capitalize()} configuration updated',
            'configuration': self.configuration[action_type]
        }
    
    def _get_available_documents(self) -> List[Dict[str, Any]]:
        """Get list of available processed documents"""
        if not os.path.exists(self.processed_dir):
            return []
        
        documents = []
        for filename in os.listdir(self.processed_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.pdf')):
                file_path = os.path.join(self.processed_dir, filename)
                if os.path.exists(file_path):
                    stat = os.stat(file_path)
                    documents.append({
                        'filename': filename,
                        'size': stat.st_size,
                        'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        'path': file_path
                    })
        
        # Sort by creation time (newest first)
        documents.sort(key=lambda x: x['created'], reverse=True)
        
        return documents
    
    def _get_status_message(self) -> str:
        """Generate human-readable status message"""
        if self.current_state == WorkflowState.IDLE:
            return 'Ready for commands. What would you like to do?'
        elif self.current_state == WorkflowState.AWAITING_CONFIRMATION:
            action_type = self.pending_action.get('type', 'action') if self.pending_action else 'action'
            return f'Awaiting confirmation for {action_type} operation.'
        elif self.current_state == WorkflowState.EXECUTING:
            return 'Executing operation...'
        elif self.current_state == WorkflowState.CONFIGURING:
            return 'In configuration mode.'
        elif self.current_state == WorkflowState.COMPLETED:
            return 'Last operation completed successfully.'
        elif self.current_state == WorkflowState.FAILED:
            return 'Last operation failed. Ready for new commands.'
        else:
            return 'Unknown state.'
    
    def get_workflow_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get workflow history
        
        Args:
            limit: Maximum number of history items
            
        Returns:
            List of workflow history items
        """
        return self.workflow_history[-limit:]
    
    def reset_state(self) -> Dict[str, Any]:
        """Reset orchestrator to idle state"""
        with self.state_lock:
            self.current_state = WorkflowState.IDLE
            self.pending_action = None
            self.selected_document = None
            
            return {
                'success': True,
                'message': 'Orchestrator reset to idle state',
                'current_state': self.current_state.value
            }


# Global orchestrator instance
_orchestrator_instance = None
_orchestrator_lock = threading.Lock()


def get_orchestrator(data_dir: str) -> PrintScanOrchestrator:
    """
    Get or create global orchestrator instance
    
    Args:
        data_dir: Data directory path
        
    Returns:
        PrintScanOrchestrator instance
    """
    global _orchestrator_instance
    
    with _orchestrator_lock:
        if _orchestrator_instance is None:
            _orchestrator_instance = PrintScanOrchestrator(data_dir)
        
        return _orchestrator_instance
