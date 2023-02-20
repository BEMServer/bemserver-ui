"""All strucural elements views (sites, buildings...)"""
from . import structural_elements  # noqa
from . import properties  # noqa


def init_app(app):
    structural_elements.blp.register_blueprint(properties.blp)
    app.register_blueprint(structural_elements.blp)
