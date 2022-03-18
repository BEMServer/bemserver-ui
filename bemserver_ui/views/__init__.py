"""Application views"""
from . import auth
from . import main
from . import users


MODULES = (
    auth,
    main,
    users,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        app.register_blueprint(module.blp)
