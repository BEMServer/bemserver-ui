"""Services internal API"""
import flask

from . import cleanup  # noqa


blp = flask.Blueprint("services", __name__, url_prefix="/services")


def register_blueprint(api_blp):
    blp.register_blueprint(cleanup.blp)
    api_blp.register_blueprint(blp)
