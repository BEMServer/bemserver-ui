"""BEMServer UI application extensions"""

from . import (
    api_client,
    auth,
    campaign_context,
    error_handlers,
    flask_es6,
    flask_helpers,
    jinja_custom_filters,
    partners,
    plugins,
    timezones,
)
from .auth import Roles  # noqa
from .campaign_context import ensure_campaign_context  # noqa

EXT_MODULES = (
    jinja_custom_filters,
    error_handlers,
    auth,
    api_client,
    campaign_context,
    flask_es6,
    flask_helpers,
    partners,
    timezones,
    plugins,
)


def init_app(app):
    """Initialize extensions with app"""
    for extension in EXT_MODULES:
        extension.init_app(app)
