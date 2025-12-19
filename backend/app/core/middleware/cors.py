"""
PrintChakra Backend - CORS Utilities

CORS-related utilities and helper functions.
"""

from flask import Response


def add_cors_headers(response: Response) -> Response:
    """
    Add CORS headers to a response.
    
    Args:
        response: Flask response object
        
    Returns:
        Response with CORS headers
    """
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS, PUT, PATCH"
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, ngrok-skip-browser-warning, "
        "X-Requested-With, Accept"
    )
    response.headers["Access-Control-Max-Age"] = "3600"
    return response


def create_options_response() -> tuple:
    """
    Create a response for OPTIONS preflight requests.
    
    Returns:
        Tuple of (response, status_code)
    """
    from flask import jsonify
    response = jsonify({"status": "ok"})
    response = add_cors_headers(response)
    return response, 200
