"""
API module for PrintChakra backend.
Contains blueprints for document, conversion, and other API endpoints.
"""

from .document import document_bp

__all__ = ["document_bp"]
