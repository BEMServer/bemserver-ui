"""BEMServer UI application extensions"""
from . import jinja_custom_filters
from . import error_handlers
from . import api_client
from . import auth
from . import campaign_context
from . import flask_es6
from . import partners
from . import timezones
from .auth import Roles  # noqa
from .campaign_context import ensure_campaign_context  # noqa
from . import plugins


EXT_MODULES = (
    jinja_custom_filters,
    error_handlers,
    auth,
    api_client,
    campaign_context,
    flask_es6,
    partners,
    timezones,
    plugins,
)


def init_app(app):
    """Initialize extensions with app"""
    for extension in EXT_MODULES:
        extension.init_app(app)
