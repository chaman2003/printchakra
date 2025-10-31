"""
Unit Tests for Voice AI Module
Tests Whisper transcription, Smollm2 chat, and orchestration
"""

import io
import os
import sys
import unittest
import wave
from unittest.mock import MagicMock, Mock, patch

import numpy as np

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from modules.voice_ai import Smollm2ChatService, VoiceAIOrchestrator, WhisperTranscriptionService


class TestWhisperTranscriptionService(unittest.TestCase):
    """Test cases for Whisper transcription service"""

    def setUp(self):
        """Set up test fixtures"""
        self.service = WhisperTranscriptionService()

    def test_initialization(self):
        """Test service initialization"""
        self.assertEqual(self.service.model_name, "large-v3-turbo")
        self.assertFalse(self.service.is_loaded)
        self.assertIsNone(self.service.model)

    @patch("modules.voice_ai.whisper.load_model")
    def test_load_model_success(self, mock_load):
        """Test successful model loading"""
        mock_model = Mock()
        mock_load.return_value = mock_model

        result = self.service.load_model()

        self.assertTrue(result)
        self.assertTrue(self.service.is_loaded)
        self.assertEqual(self.service.model, mock_model)
        mock_load.assert_called_once_with("large-v3-turbo")

    @patch("modules.voice_ai.whisper.load_model")
    def test_load_model_failure(self, mock_load):
        """Test model loading failure"""
        mock_load.side_effect = Exception("Model not found")

        result = self.service.load_model()

        self.assertFalse(result)
        self.assertFalse(self.service.is_loaded)

    def test_transcribe_audio_model_not_loaded(self):
        """Test transcription when model not loaded"""
        audio_data = self._create_dummy_audio()

        with patch.object(self.service, "load_model", return_value=False):
            result = self.service.transcribe_audio(audio_data)

        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertEqual(result["text"], "")

    @patch("modules.voice_ai.whisper.load_model")
    def test_transcribe_audio_success(self, mock_load):
        """Test successful audio transcription"""
        # Setup mock model
        mock_model = Mock()
        mock_model.transcribe.return_value = {
            "text": "Hello, this is a test.",
            "language": "en",
            "segments": [{"start": 0.0, "end": 2.0, "text": "Hello, this is a test."}],
        }
        mock_load.return_value = mock_model
        self.service.load_model()

        # Create dummy audio
        audio_data = self._create_dummy_audio()

        result = self.service.transcribe_audio(audio_data)

        self.assertTrue(result["success"])
        self.assertEqual(result["text"], "Hello, this is a test.")
        self.assertEqual(result["language"], "en")
        self.assertGreater(result["duration"], 0)

    def _create_dummy_audio(self, duration=1.0, sample_rate=16000):
        """Create dummy WAV audio for testing"""
        # Generate sine wave
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio = np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
        audio = (audio * 32767).astype(np.int16)

        # Write to bytes buffer
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio.tobytes())

        return buffer.getvalue()


class TestSmollm2ChatService(unittest.TestCase):
    """Test cases for Smollm2 chat service"""

    def setUp(self):
        """Set up test fixtures"""
        self.service = Smollm2ChatService()

    def test_initialization(self):
        """Test service initialization"""
        self.assertEqual(self.service.model_name, "smollm2:135m")
        self.assertEqual(self.service.conversation_history, [])
        self.assertIn("PrintChakra AI", self.service.system_prompt)

    @patch("modules.voice_ai.requests.get")
    def test_check_ollama_available_success(self, mock_get):
        """Test Ollama availability check - success"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "models": [{"name": "smollm2:135m"}, {"name": "llama2:7b"}]
        }
        mock_get.return_value = mock_response

        result = self.service.check_ollama_available()

        self.assertTrue(result)

    @patch("modules.voice_ai.requests.get")
    def test_check_ollama_available_no_model(self, mock_get):
        """Test Ollama availability check - model not found"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"models": [{"name": "llama2:7b"}]}
        mock_get.return_value = mock_response

        result = self.service.check_ollama_available()

        self.assertFalse(result)

    @patch("modules.voice_ai.requests.get")
    def test_check_ollama_available_connection_error(self, mock_get):
        """Test Ollama availability check - connection error"""
        mock_get.side_effect = Exception("Connection refused")

        result = self.service.check_ollama_available()

        self.assertFalse(result)

    @patch("modules.voice_ai.requests.post")
    def test_generate_response_success(self, mock_post):
        """Test successful response generation"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "message": {"content": "Hello! How can I help you today?"}
        }
        mock_post.return_value = mock_response

        result = self.service.generate_response("Hello")

        self.assertTrue(result["success"])
        self.assertEqual(result["response"], "Hello! How can I help you today?")
        self.assertEqual(len(self.service.conversation_history), 2)  # User + assistant

    @patch("modules.voice_ai.requests.post")
    def test_generate_response_api_error(self, mock_post):
        """Test response generation with API error"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        result = self.service.generate_response("Hello")

        self.assertFalse(result["success"])
        self.assertIn("error", result)

    def test_reset_conversation(self):
        """Test conversation history reset"""
        # Add some messages
        self.service.conversation_history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"},
        ]

        self.service.reset_conversation()

        self.assertEqual(len(self.service.conversation_history), 0)

    @patch("modules.voice_ai.requests.post")
    def test_conversation_history_limit(self, mock_post):
        """Test that conversation history is limited to 20 messages"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": {"content": "Response"}}
        mock_post.return_value = mock_response

        # Add 15 exchanges (30 messages)
        for i in range(15):
            self.service.generate_response(f"Message {i}")

        # Should keep only last 20
        self.assertEqual(len(self.service.conversation_history), 20)


class TestVoiceAIOrchestrator(unittest.TestCase):
    """Test cases for Voice AI orchestrator"""

    def setUp(self):
        """Set up test fixtures"""
        self.orchestrator = VoiceAIOrchestrator()

    def test_initialization(self):
        """Test orchestrator initialization"""
        self.assertIsInstance(self.orchestrator.whisper_service, WhisperTranscriptionService)
        self.assertIsInstance(self.orchestrator.chat_service, Smollm2ChatService)
        self.assertFalse(self.orchestrator.session_active)

    @patch.object(WhisperTranscriptionService, "load_model")
    @patch.object(Smollm2ChatService, "check_ollama_available")
    def test_start_session_success(self, mock_ollama, mock_whisper):
        """Test successful session start"""
        mock_whisper.return_value = True
        mock_ollama.return_value = True

        result = self.orchestrator.start_session()

        self.assertTrue(result["success"])
        self.assertTrue(self.orchestrator.session_active)

    @patch.object(WhisperTranscriptionService, "load_model")
    def test_start_session_whisper_failure(self, mock_whisper):
        """Test session start with Whisper load failure"""
        mock_whisper.return_value = False

        result = self.orchestrator.start_session()

        self.assertFalse(result["success"])
        self.assertFalse(self.orchestrator.session_active)

    @patch.object(WhisperTranscriptionService, "load_model")
    @patch.object(Smollm2ChatService, "check_ollama_available")
    def test_start_session_ollama_unavailable(self, mock_ollama, mock_whisper):
        """Test session start with Ollama unavailable"""
        mock_whisper.return_value = True
        mock_ollama.return_value = False

        result = self.orchestrator.start_session()

        self.assertFalse(result["success"])

    def test_process_voice_input_no_session(self):
        """Test voice processing without active session"""
        audio_data = b"dummy audio"

        result = self.orchestrator.process_voice_input(audio_data)

        self.assertFalse(result["success"])
        self.assertIn("No active session", result["error"])

    @patch.object(WhisperTranscriptionService, "transcribe_audio")
    @patch.object(Smollm2ChatService, "generate_response")
    def test_process_voice_input_success(self, mock_chat, mock_transcribe):
        """Test successful voice input processing"""
        self.orchestrator.session_active = True

        mock_transcribe.return_value = {
            "success": True,
            "text": "What is the weather today?",
            "language": "en",
        }

        mock_chat.return_value = {
            "success": True,
            "response": "I can help you with that!",
            "model": "smollm2:135m",
        }

        audio_data = b"dummy audio"
        result = self.orchestrator.process_voice_input(audio_data)

        self.assertTrue(result["success"])
        self.assertEqual(result["user_text"], "What is the weather today?")
        self.assertEqual(result["ai_response"], "I can help you with that!")
        self.assertFalse(result["session_ended"])

    @patch.object(WhisperTranscriptionService, "transcribe_audio")
    def test_process_voice_input_bye_keyword(self, mock_transcribe):
        """Test voice processing with exit keyword"""
        self.orchestrator.session_active = True

        mock_transcribe.return_value = {
            "success": True,
            "text": "Bye PrintChakra",
            "language": "en",
        }

        audio_data = b"dummy audio"
        result = self.orchestrator.process_voice_input(audio_data)

        self.assertTrue(result["success"])
        self.assertTrue(result["session_ended"])
        self.assertFalse(self.orchestrator.session_active)

    @patch.object(WhisperTranscriptionService, "transcribe_audio")
    def test_process_voice_input_transcription_failure(self, mock_transcribe):
        """Test voice processing with transcription failure"""
        self.orchestrator.session_active = True

        mock_transcribe.return_value = {
            "success": False,
            "error": "Audio quality too low",
            "text": "",
        }

        audio_data = b"dummy audio"
        result = self.orchestrator.process_voice_input(audio_data)

        self.assertFalse(result["success"])
        self.assertEqual(result["stage"], "transcription")

    def test_end_session(self):
        """Test session end"""
        self.orchestrator.session_active = True
        self.orchestrator.chat_service.conversation_history = [{"role": "user", "content": "Hello"}]

        self.orchestrator.end_session()

        self.assertFalse(self.orchestrator.session_active)
        self.assertEqual(len(self.orchestrator.chat_service.conversation_history), 0)


def run_tests():
    """Run all tests"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestWhisperTranscriptionService))
    suite.addTests(loader.loadTestsFromTestCase(TestSmollm2ChatService))
    suite.addTests(loader.loadTestsFromTestCase(TestVoiceAIOrchestrator))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
