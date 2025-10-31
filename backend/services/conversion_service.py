"""
Conversion service
Handles file format conversions
"""

import os
from typing import Any, Dict, Optional

from utils.file_utils import get_file_extension


class ConversionService:
    """Service for file conversions"""

    def __init__(self, converter_module, converted_dir: str):
        """
        Initialize conversion service

        Args:
            converter_module: File converter module instance
            converted_dir: Directory for converted files
        """
        self.converter = converter_module
        self.converted_dir = converted_dir
        os.makedirs(converted_dir, exist_ok=True)

    def convert_file(
        self, input_path: str, output_format: str, output_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Convert file to specified format

        Args:
            input_path: Input file path
            output_format: Target format (e.g., 'pdf', 'jpg', 'png')
            output_name: Optional output filename

        Returns:
            Conversion result dictionary
        """
        try:
            # Generate output path
            if output_name is None:
                base_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{base_name}.{output_format}"

            output_path = os.path.join(self.converted_dir, output_name)

            # Perform conversion
            result = self.converter.convert(
                input_path=input_path, output_path=output_path, format=output_format
            )

            return {
                "success": True,
                "output_path": output_path,
                "output_name": output_name,
                "result": result,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def batch_convert(self, input_paths: list, output_format: str) -> Dict[str, Any]:
        """
        Convert multiple files to specified format

        Args:
            input_paths: List of input file paths
            output_format: Target format

        Returns:
            Batch conversion result dictionary
        """
        results = []
        errors = []

        for input_path in input_paths:
            result = self.convert_file(input_path, output_format)
            if result["success"]:
                results.append(result)
            else:
                errors.append({"file": input_path, "error": result.get("error", "Unknown error")})

        return {
            "success": len(errors) == 0,
            "converted": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors,
        }

    def get_supported_formats(self) -> list:
        """
        Get list of supported output formats

        Returns:
            List of format strings
        """
        return ["pdf", "jpg", "jpeg", "png", "tiff", "bmp"]

    def list_converted_files(self) -> list:
        """
        List all converted files

        Returns:
            List of converted filenames
        """
        if not os.path.exists(self.converted_dir):
            return []

        return [
            f
            for f in os.listdir(self.converted_dir)
            if os.path.isfile(os.path.join(self.converted_dir, f))
        ]
