"""BEMServer UI application extensions"""
from . import error_handlers
from . import api_client
from . import auth
from . import campaign_context
from .auth import Roles  # noqa


EXT_MODULES = (
    error_handlers,
    auth,
    api_client,
    campaign_context,
)


def init_app(app):
    """Initialize extensions with app"""
    for extension in EXT_MODULES:
        extension.init_app(app)
