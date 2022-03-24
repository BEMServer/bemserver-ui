"""Application views"""
from . import auth
from . import main
from . import users
from . import user_groups


MODULES = (
    auth,
    main,
    users,
    user_groups,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        app.register_blueprint(module.blp)
