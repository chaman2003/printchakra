"""File conversion feature service layer."""

import os
from typing import Any, Dict, Optional


class ConversionService:
    """Service coordinating converter module interactions."""

    def __init__(self, converter_module, converted_dir: str):
        self.converter = converter_module
        self.converted_dir = converted_dir
        os.makedirs(converted_dir, exist_ok=True)

    def convert_file(
        self,
        input_path: str,
        output_format: str,
        output_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            if output_name is None:
                base_name = os.path.splitext(os.path.basename(input_path))[0]
                output_name = f"{base_name}.{output_format}"

            output_path = os.path.join(self.converted_dir, output_name)
            if hasattr(self.converter, "convert"):
                result = self.converter.convert(
                    input_path=input_path,
                    output_path=output_path,
                    format=output_format,
                )
            else:
                success, message = self.converter.convert_file(
                    input_path,
                    output_path,
                    source_format=os.path.splitext(input_path)[1].lstrip("."),
                    target_format=output_format,
                )
                if not success:
                    return {"success": False, "error": message}
                result = {"message": message}
            return {
                "success": True,
                "output_path": output_path,
                "output_name": output_name,
                "result": result,
            }
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "error": str(exc)}

    def batch_convert(self, input_paths: list, output_format: str) -> Dict[str, Any]:
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
        return ["pdf", "jpg", "jpeg", "png", "tiff", "bmp"]

    def list_converted_files(self) -> list:
        if not os.path.exists(self.converted_dir):
            return []

        return [
            filename
            for filename in os.listdir(self.converted_dir)
            if os.path.isfile(os.path.join(self.converted_dir, filename))
        ]
