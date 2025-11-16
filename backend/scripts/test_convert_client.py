import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.app import create_app

app, socketio = create_app()

with app.test_client() as client:
    payload = {
        "files": ["processed_doc_20251023_194132_125dcb3d.jpg"],
        "format": "pdf",
        "merge_pdf": False,
        "filename": "test_merged.pdf",
    }
    resp = client.post('/convert', json=payload)
    print('Status Code:', resp.status_code)
    print('Data:', resp.get_json())
