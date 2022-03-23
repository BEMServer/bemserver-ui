"""BEMServer UI application extensions"""
from . import api_client
from . import auth
from .auth import Roles  # noqa


EXT_MODULES = (
    auth,
    api_client,
)


def init_app(app):
    """Initialize extensions with app"""
    for extension in EXT_MODULES:
        extension.init_app(app)
