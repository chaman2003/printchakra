"""Shared helpers for backend feature registration."""

from flask import Blueprint


def register_blueprint(app, blueprint: Blueprint, *, url_prefix: str) -> None:
    """Register blueprint unless app already has matching object."""

    existing = app.blueprints.get(blueprint.name)
    if existing is blueprint:
        return

    app.register_blueprint(blueprint, url_prefix=url_prefix)
