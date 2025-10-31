"""
API Integration Tests for Voice AI Endpoints
Tests all REST endpoints for voice functionality
"""

import io
import json
import os

# Import Flask app
import sys
import unittest
import wave
from unittest.mock import Mock, patch

import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app


class TestVoiceAIEndpoints(unittest.TestCase):
    """Test cases for Voice AI API endpoints"""

    def setUp(self):
        """Set up test client"""
        self.client = app.test_client()
        self.client.testing = True

    @patch("modules.voice_ai.voice_ai_orchestrator.start_session")
    def test_start_voice_session_success(self, mock_start):
        """Test successful voice session start"""
        mock_start.return_value = {
            "success": True,
            "message": "Voice AI session started",
            "whisper_loaded": True,
            "ollama_available": True,
        }

        response = self.client.post("/voice/start")
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data["success"])
        self.assertTrue(data["whisper_loaded"])
        self.assertTrue(data["ollama_available"])

    @patch("modules.voice_ai.voice_ai_orchestrator.start_session")
    def test_start_voice_session_failure(self, mock_start):
        """Test voice session start failure"""
        mock_start.return_value = {"success": False, "error": "Ollama not available"}

        response = self.client.post("/voice/start")
        data = json.loads(response.data)

        self.assertEqual(response.status_code, 503)
        self.assertFalse(data["success"])
        self.assertIn("error", data)

    def test_transcribe_voice_no_session(self):
        """Test transcription without active session"""
        audio_data = self._create_dummy_audio()

        response = self.client.post(
            "/voice/transcribe",
            data={"audio": (io.BytesIO(audio_data), "test.wav")},
            content_type="multipart/form-data",
        )

        data = json.loads(response.data)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(data["success"])
        self.assertIn("No active voice session", data["error"])

    @patch("modules.voice_ai.voice_ai_orchestrator.whisper_service.transcribe_audio")
    def test_transcribe_voice_success(self, mock_transcribe):
        """Test successful voice transcription"""
        # Mock active session
        with patch("modules.voice_ai.voice_ai_orchestrator.session_active", True):
            mock_transcribe.return_value = {
                "success": True,
                "text": "Hello PrintChakra",
                "language": "en",
                "segments": [],
                "duration": 2.0,
            }

            audio_data = self._create_dummy_audio()

            response = self.client.post(
                "/voice/transcribe",
                data={"audio": (io.BytesIO(audio_data), "test.wav")},
                content_type="multipart/form-data",
            )

            data = json.loads(response.data)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(data["success"])
            self.assertEqual(data["text"], "Hello PrintChakra")

    def test_transcribe_voice_no_file(self):
        """Test transcription without audio file"""
        with patch("modules.voice_ai.voice_ai_orchestrator.session_active", True):
            response = self.client.post("/voice/transcribe")

            data = json.loads(response.data)
            self.assertEqual(response.status_code, 400)
            self.assertFalse(data["success"])
            self.assertIn("No audio file", data["error"])

    def test_chat_with_ai_no_session(self):
        """Test chat without active session"""
        response = self.client.post(
            "/voice/chat", data=json.dumps({"message": "Hello"}), content_type="application/json"
        )

        data = json.loads(response.data)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(data["success"])
        self.assertIn("No active voice session", data["error"])

    @patch("modules.voice_ai.voice_ai_orchestrator.chat_service.generate_response")
    def test_chat_with_ai_success(self, mock_chat):
        """Test successful chat interaction"""
        with patch("modules.voice_ai.voice_ai_orchestrator.session_active", True):
            mock_chat.return_value = {
                "success": True,
                "response": "Hello! How can I help you?",
                "model": "smollm2:135m",
                "timestamp": "2025-10-28T10:00:00",
            }

            response = self.client.post(
                "/voice/chat",
                data=json.dumps({"message": "Hello"}),
                content_type="application/json",
            )

            data = json.loads(response.data)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(data["success"])
            self.assertEqual(data["response"], "Hello! How can I help you?")

    def test_chat_with_ai_no_message(self):
        """Test chat without message"""
        with patch("modules.voice_ai.voice_ai_orchestrator.session_active", True):
            response = self.client.post(
                "/voice/chat", data=json.dumps({}), content_type="application/json"
            )

            data = json.loads(response.data)
            self.assertEqual(response.status_code, 400)
            self.assertFalse(data["success"])

    @patch("modules.voice_ai.voice_ai_orchestrator.process_voice_input")
    def test_process_voice_complete_success(self, mock_process):
        """Test complete voice processing pipeline"""
        with patch("modules.voice_ai.voice_ai_orchestrator.session_active", True):
            mock_process.return_value = {
                "success": True,
                "user_text": "What is the weather?",
                "ai_response": "I cannot check the weather, but I can help with documents!",
                "session_ended": False,
            }

            audio_data = self._create_dummy_audio()

            response = self.client.post(
                "/voice/process",
                data={"audio": (io.BytesIO(audio_data), "test.wav")},
                content_type="multipart/form-data",
            )

            data = json.loads(response.data)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(data["success"])
            self.assertEqual(data["user_text"], "What is the weather?")
            self.assertFalse(data["session_ended"])

    @patch("modules.voice_ai.voice_ai_orchestrator.process_voice_input")
    def test_process_voice_complete_with_bye(self, mock_process):
        """Test complete voice processing with exit keyword"""
        with patch("modules.voice_ai.voice_ai_orchestrator.session_active", True):
            mock_process.return_value = {
                "success": True,
                "user_text": "Bye PrintChakra",
                "ai_response": "Goodbye! Voice session ended.",
                "session_ended": True,
            }

            audio_data = self._create_dummy_audio()

            response = self.client.post(
                "/voice/process",
                data={"audio": (io.BytesIO(audio_data), "test.wav")},
                content_type="multipart/form-data",
            )

            data = json.loads(response.data)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(data["success"])
            self.assertTrue(data["session_ended"])

    @patch("modules.voice_ai.voice_ai_orchestrator.end_session")
    def test_end_voice_session(self, mock_end):
        """Test ending voice session"""
        response = self.client.post("/voice/end")

        data = json.loads(response.data)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(data["success"])
        mock_end.assert_called_once()

    @patch("modules.voice_ai.voice_ai_orchestrator.session_active", True)
    @patch("modules.voice_ai.voice_ai_orchestrator.whisper_service.is_loaded", True)
    @patch("modules.voice_ai.voice_ai_orchestrator.chat_service.check_ollama_available")
    def test_voice_status(self, mock_ollama):
        """Test voice AI status endpoint"""
        mock_ollama.return_value = True

        with patch("modules.voice_ai.voice_ai_orchestrator.chat_service.conversation_history", []):
            response = self.client.get("/voice/status")

            data = json.loads(response.data)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(data["session_active"])
            self.assertTrue(data["whisper_loaded"])
            self.assertTrue(data["ollama_available"])
            self.assertEqual(data["conversation_length"], 0)

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


class TestVoiceAIIntegration(unittest.TestCase):
    """Integration tests for complete voice AI workflow"""

    def setUp(self):
        """Set up test client"""
        self.client = app.test_client()
        self.client.testing = True

    @patch("modules.voice_ai.voice_ai_orchestrator.start_session")
    @patch("modules.voice_ai.voice_ai_orchestrator.process_voice_input")
    @patch("modules.voice_ai.voice_ai_orchestrator.end_session")
    def test_complete_conversation_flow(self, mock_end, mock_process, mock_start):
        """Test complete conversation flow: start → chat → end"""
        # 1. Start session
        mock_start.return_value = {
            "success": True,
            "whisper_loaded": True,
            "ollama_available": True,
        }

        with patch("modules.voice_ai.voice_ai_orchestrator.session_active", True):
            response = self.client.post("/voice/start")
            self.assertEqual(response.status_code, 200)

            # 2. Send voice message
            mock_process.return_value = {
                "success": True,
                "user_text": "How do I scan a document?",
                "ai_response": "To scan a document, use the phone camera feature!",
                "session_ended": False,
            }

            audio_data = self._create_dummy_audio()
            response = self.client.post(
                "/voice/process",
                data={"audio": (io.BytesIO(audio_data), "test.wav")},
                content_type="multipart/form-data",
            )

            data = json.loads(response.data)
            self.assertTrue(data["success"])
            self.assertIn("scan", data["ai_response"].lower())

            # 3. End session
            response = self.client.post("/voice/end")
            self.assertEqual(response.status_code, 200)
            mock_end.assert_called_once()

    def _create_dummy_audio(self, duration=1.0, sample_rate=16000):
        """Create dummy WAV audio for testing"""
        t = np.linspace(0, duration, int(sample_rate * duration))
        audio = np.sin(2 * np.pi * 440 * t)
        audio = (audio * 32767).astype(np.int16)

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio.tobytes())

        return buffer.getvalue()


def run_tests():
    """Run all API tests"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestVoiceAIEndpoints))
    suite.addTests(loader.loadTestsFromTestCase(TestVoiceAIIntegration))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
