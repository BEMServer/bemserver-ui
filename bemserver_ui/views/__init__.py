"""Application views"""
from . import main


MODULES = (
    main,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        app.register_blueprint(module.blp)
