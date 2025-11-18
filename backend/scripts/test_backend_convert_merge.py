import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import app

with app.app.test_client() as client:
    payload = {
        "files": [
            "processed_doc_20251023_194132_125dcb3d.jpg",
            "processed_doc_20251025_090458_77e78fb1.jpg",
        ],
        "format": "pdf",
        "merge_pdf": True,
        "filename": "my_merged.pdf",
    }
    resp = client.post('/convert', json=payload)
    print('Status Code:', resp.status_code)
    print('Data:', resp.get_json())
