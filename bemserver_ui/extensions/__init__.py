"""BEMServer UI application extensions"""
from . import api_client
from .auth import signin_required  # noqa


def init_app(app):
    """Initialize extensions with app"""
    api_client.init_app(app)
