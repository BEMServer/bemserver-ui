"""Analysis energy consumption breakdowns internal API"""
import flask

from . import breakdowns  # noqa
from . import setup  # noqa


blp = flask.Blueprint("energy_consumption", __name__, url_prefix="/energy_consumption")


def register_blueprint(api_blp):
    blp.register_blueprint(breakdowns.blp)
    blp.register_blueprint(setup.blp)
    api_blp.register_blueprint(blp)
