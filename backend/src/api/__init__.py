"""API blueprint aggregation for PrintChakra backend."""

from typing import Dict

from flask import Flask

from src.features import (
    register_conversion_feature,
    register_file_feature,
    register_ocr_feature,
    register_print_feature,
    register_scan_feature,
)


def register_feature_blueprints(
    app: Flask,
    *,
    services: Dict[str, object],
    modules: Dict[str, object] | None = None,
) -> None:
    """Wire up all feature blueprints and store service references."""

    modules = modules or {}

    file_service = register_file_feature(
        app,
        upload_dir=app.config["UPLOAD_FOLDER"],
        processed_dir=app.config["PROCESSED_FOLDER"],
    )

    scan_service = register_scan_feature(
        app,
        scanner_module=modules.get("scanner"),
        file_service=file_service,
    )

    print_service = register_print_feature(
        app,
        printer_module=modules.get("printer"),
        file_service=file_service,
    )

    ocr_service = register_ocr_feature(
        app,
        processed_dir=app.config["PROCESSED_FOLDER"],
        file_service=file_service,
    )

    conversion_service = register_conversion_feature(
        app,
        converter_module=modules.get("converter"),
        converted_dir=app.config["CONVERTED_FOLDER"],
        file_service=file_service,
    )

    services.update(
        {
            "file": file_service,
            "scan": scan_service,
            "print": print_service,
            "ocr": ocr_service,
            "conversion": conversion_service,
        }
    )
