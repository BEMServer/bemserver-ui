"""Services internal API"""
import flask

from . import completeness  # noqa
from . import energy_consumption  # noqa


blp = flask.Blueprint("analysis", __name__, url_prefix="/analysis")


def register_blueprint(api_blp):
    blp.register_blueprint(completeness.blp)
    energy_consumption.register_blueprint(blp)
    api_blp.register_blueprint(blp)
