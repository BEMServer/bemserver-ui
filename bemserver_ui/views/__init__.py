"""Application views"""
from . import auth
from . import main


MODULES = (
    auth,
    main,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        app.register_blueprint(module.blp)
