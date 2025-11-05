"""
Entry point for PrintChakra backend Flask application
"""

from src.app import create_app

if __name__ == "__main__":
    import os
    
    app, socketio = create_app()
    port = int(os.getenv("PORT", 5000))
    
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=True,
        allow_unsafe_werkzeug=True
    )
