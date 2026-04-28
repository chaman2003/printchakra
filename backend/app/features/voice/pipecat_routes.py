"""
Pipecat Voice Bot Routes for PrintChakra Backend
Integrates the Pipecat Web Voice Bot into the existing Flask backend
"""

import json
import logging
from flask import Blueprint, request, jsonify, Response
from flask_socketio import emit
import sys
import os
import urllib.error
import urllib.request

# Add pipecat-web-voice to path (repo_root/pipecat-web-voice)
pipecat_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "pipecat-web-voice")
)
if pipecat_path not in sys.path:
    sys.path.insert(0, pipecat_path)

try:
    from voice_bot import voice_bot
    from config import config as pipecat_config
    from language_manager import LanguageManager
    PIPECAT_AVAILABLE = True
except ImportError as e:
    PIPECAT_AVAILABLE = False
    voice_bot = None
    pipecat_config = None
    logging.warning(f"Pipecat voice bot not available: {e}")

pipecat_bp = Blueprint('pipecat', __name__)
logger = logging.getLogger(__name__)

def _pipecat_http_base() -> str:
    """Pipecat FastAPI runs in a separate process; models load there, not in Flask."""
    return (os.environ.get("PIPECAT_HTTP_BASE") or "http://127.0.0.1:8765").rstrip("/")


def _fetch_pipecat_json(path: str) -> dict | None:
    url = _pipecat_http_base() + (path if path.startswith("/") else "/" + path)
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        logger.debug("Pipecat service GET %s: %s", url, e)
        return None


def _post_pipecat_json(path: str, payload: dict, timeout: float = 120.0) -> tuple[dict | None, int | None]:
    """Forward POST to Pipecat FastAPI (8765)."""
    url = _pipecat_http_base() + (path if path.startswith("/") else "/" + path)
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            return (json.loads(raw) if raw else {}, resp.status)
    except urllib.error.HTTPError as e:
        try:
            raw = e.read().decode()
            return (json.loads(raw) if raw else {"error": e.reason}, e.code)
        except Exception:
            return ({"error": str(e.reason)}, e.code)
    except Exception as e:
        logger.warning("Pipecat POST %s failed: %s", url, e)
        return (None, None)


def _merge_llm_ollama_connected(status: dict) -> dict:
    """Augment LLM.connected using a live Ollama /api/tags check."""
    if not isinstance(status, dict):
        return status
    components = status.get("components")
    if not isinstance(components, dict):
        return status
    llm_component = components.get("llm")
    if not isinstance(llm_component, dict):
        return status
    llm_base_url = llm_component.get("base_url")
    llm_component["connected"] = bool(_check_ollama_connected(llm_base_url))
    llm_component.setdefault("provider", "ollama")
    components["llm"] = llm_component
    status["components"] = components
    return status


def _resolved_voice_status() -> dict:
    """Prefer live status from the Pipecat uvicorn process."""
    remote = _fetch_pipecat_json("/status")
    if isinstance(remote, dict) and remote:
        return _merge_llm_ollama_connected(remote)
    status = voice_bot.get_status()
    components = status.get("components", {}) if isinstance(status, dict) else {}
    llm_component = components.get("llm", {}) if isinstance(components, dict) else {}
    llm_base_url = llm_component.get("base_url") if isinstance(llm_component, dict) else None
    if isinstance(llm_component, dict):
        llm_component["connected"] = bool(_check_ollama_connected(llm_base_url))
        llm_component.setdefault("provider", "ollama")
        components["llm"] = llm_component
        status["components"] = components
    return status


def _check_ollama_connected(base_url: str | None) -> bool:
    """Best-effort connectivity check for Ollama API."""
    if not base_url:
        return False
    try:
        url = base_url.rstrip("/") + "/api/tags"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return 200 <= getattr(resp, "status", 0) < 300
    except Exception:
        return False


@pipecat_bp.route('/status', methods=['GET'])
def get_pipecat_status():
    """Get Pipecat voice bot status"""
    if not PIPECAT_AVAILABLE:
        return jsonify({
            'available': False,
            'error': 'Pipecat voice bot not available'
        }), 503
    
    try:
        status = _resolved_voice_status()

        return jsonify({
            'available': True,
            'status': status
        })
    except Exception as e:
        logger.error(f"Error getting Pipecat status: {e}")
        return jsonify({
            'available': False,
            'error': str(e)
        }), 500


@pipecat_bp.route('/conversation/text', methods=['POST'])
def pipecat_text_conversation():
    """Typed chat → Pipecat FastAPI (same LLM + TTS as voice)."""
    if not PIPECAT_AVAILABLE:
        return jsonify({'error': 'Pipecat voice bot not available'}), 503
    payload = request.get_json()
    if not isinstance(payload, dict):
        return jsonify({'error': 'JSON body required'}), 400
    remote, status = _post_pipecat_json('/conversation/text', payload, timeout=180)
    if remote is None or status is None:
        return jsonify({
            'error': 'Pipecat server unreachable — start pipecat-web-voice on port 8765',
            'reply': '',
            'audio_wav_base64': None,
        }), 502
    return jsonify(remote), status


@pipecat_bp.route('/languages', methods=['GET'])
def get_supported_languages():
    """Get supported languages for Pipecat voice bot"""
    if not PIPECAT_AVAILABLE:
        return jsonify({
            'available': False,
            'error': 'Pipecat voice bot not available'
        }), 503
    
    try:
        return jsonify({
            'available': True,
            'current': voice_bot.language_manager.get_current_language(),
            'supported': pipecat_config.supported_languages,
            'default': pipecat_config.default_language
        })
    except Exception as e:
        logger.error(f"Error getting languages: {e}")
        return jsonify({
            'available': False,
            'error': str(e)
        }), 500


@pipecat_bp.route('/reset-language', methods=['POST'])
def reset_language():
    """Reset Pipecat voice bot language to default"""
    if not PIPECAT_AVAILABLE:
        return jsonify({
            'available': False,
            'error': 'Pipecat voice bot not available'
        }), 503
    
    try:
        remote, st = _post_pipecat_json('/reset-language', {}, timeout=15)
        if remote is not None and st is not None and st < 400:
            voice_bot.language_manager.reset_language()
            voice_bot.tts_service.set_language(voice_bot.language_manager.get_current_language())
            return jsonify({
                'success': True,
                'message': remote.get('message', 'Language reset to default'),
                'language': remote.get('language', pipecat_config.default_language),
            })
        voice_bot.language_manager.reset_language()
        return jsonify({
            'success': True,
            'message': 'Language reset to default',
            'language': pipecat_config.default_language
        })
    except Exception as e:
        logger.error(f"Error resetting language: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pipecat_bp.route('/switch-language', methods=['POST'])
def switch_language():
    """Switch Pipecat voice bot to specific language"""
    if not PIPECAT_AVAILABLE:
        return jsonify({
            'available': False,
            'error': 'Pipecat voice bot not available'
        }), 503
    
    try:
        data = request.get_json() or {}
        language = data.get('language')
        
        if not language:
            return jsonify({
                'success': False,
                'error': 'Language parameter required'
            }), 400
        
        if language not in pipecat_config.supported_languages:
            return jsonify({
                'success': False,
                'error': f'Unsupported language: {language}'
            }), 400

        remote, st = _post_pipecat_json('/switch-language', {'language': language}, timeout=15)
        if remote is not None and st is not None and st < 400 and remote.get('success'):
            voice_bot.language_manager.switch_language(language)
            voice_bot.tts_service.set_language(language)
            return jsonify(remote)

        success = voice_bot.language_manager.switch_language(language)
        if success:
            voice_bot.tts_service.set_language(language)
            response_msg = voice_bot.language_manager.get_language_response(language)
            return jsonify({
                'success': True,
                'message': response_msg,
                'language': language
            })
        return jsonify({
            'success': False,
            'error': 'Failed to switch language'
        }), 500
            
    except Exception as e:
        logger.error(f"Error switching language: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pipecat_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for Pipecat voice bot"""
    if not PIPECAT_AVAILABLE:
        return jsonify({
            'status': 'unavailable',
            'error': 'Pipecat voice bot not available'
        }), 503
    
    try:
        # Environment-aware WebSocket URL for the separate Pipecat FastAPI server.
        # We assume Pipecat runs on the same host as this backend, but a different port.
        forwarded_proto = (request.headers.get("X-Forwarded-Proto") or "").split(",")[0].strip()
        forwarded_host = (request.headers.get("X-Forwarded-Host") or "").split(",")[0].strip()

        scheme = forwarded_proto or request.scheme or "http"
        ws_scheme = "wss" if scheme == "https" else "ws"

        # Prefer forwarded host when behind a proxy/tunnel; otherwise use request.host.
        hostport = forwarded_host or request.host
        hostname = hostport.split(":")[0] if hostport else "localhost"

        pipecat_port = getattr(pipecat_config, "port", 8765)

        # Provide a stable REST base URL too (useful for frontend config).
        rest_base_url = (forwarded_proto or request.scheme or "http") + "://" + hostport

        public_ws = (os.environ.get("PIPECAT_PUBLIC_WEBSOCKET_URL") or "").strip()
        if public_ws:
            websocket_url = public_ws
        else:
            websocket_url = f"{ws_scheme}://{hostname}:{pipecat_port}/ws"

        remote_health = _fetch_pipecat_json("/health")
        if isinstance(remote_health, dict) and isinstance(remote_health.get("bot_status"), dict):
            bot_status = _merge_llm_ollama_connected(dict(remote_health["bot_status"]))
        else:
            bot_status = _resolved_voice_status()

        return jsonify({
            'status': 'healthy',
            'websocket_url': websocket_url,
            'rest_base_url': rest_base_url,
            'bot_status': bot_status
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500


# WebSocket handler for Pipecat integration
def handle_pipecat_websocket():
    """Handle WebSocket connections for Pipecat voice bot"""
    if not PIPECAT_AVAILABLE:
        logger.warning("Pipecat voice bot not available for WebSocket connections")
        return
    
    # This would be handled by the separate FastAPI server
    # The frontend will connect directly to the FastAPI WebSocket endpoint
    pass


# SocketIO event handlers for integration with existing SocketIO
def register_socketio_handlers(socketio):
    """Register SocketIO event handlers for Pipecat integration"""
    
    @socketio.on('pipecat_status_request')
    def handle_pipecat_status():
        """Handle Pipecat status request via SocketIO"""
        if not PIPECAT_AVAILABLE:
            emit('pipecat_status', {
                'available': False,
                'error': 'Pipecat voice bot not available'
            })
            return
        
        try:
            status = _resolved_voice_status()
            emit('pipecat_status', {
                'available': True,
                'status': status
            })
        except Exception as e:
            logger.error(f"SocketIO Pipecat status error: {e}")
            emit('pipecat_status', {
                'available': False,
                'error': str(e)
            })
    
    @socketio.on('pipecat_language_switch')
    def handle_language_switch(data):
        """Handle language switch request via SocketIO"""
        if not PIPECAT_AVAILABLE:
            emit('pipecat_language_response', {
                'success': False,
                'error': 'Pipecat voice bot not available'
            })
            return
        
        try:
            language = data.get('language')
            if not language:
                emit('pipecat_language_response', {
                    'success': False,
                    'error': 'Language parameter required'
                })
                return
            
            success = voice_bot.language_manager.switch_language(language)
            if success:
                voice_bot.tts_service.set_language(language)
                response_msg = voice_bot.language_manager.get_language_response(language)
                emit('pipecat_language_response', {
                    'success': True,
                    'message': response_msg,
                    'language': language
                })
            else:
                emit('pipecat_language_response', {
                    'success': False,
                    'error': 'Failed to switch language'
                })
        except Exception as e:
            logger.error(f"SocketIO language switch error: {e}")
            emit('pipecat_language_response', {
                'success': False,
                'error': str(e)
            })
