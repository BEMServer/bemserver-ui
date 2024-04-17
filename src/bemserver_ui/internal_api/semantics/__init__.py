"""Semantics internal API"""

import flask

from . import (
    energy,  # noqa
    weather,  # noqa
)

blp = flask.Blueprint("semantics", __name__, url_prefix="/semantics")


def register_blueprint(api_blp):
    blp.register_blueprint(weather.blp)
    energy.register_blueprint(blp)
    api_blp.register_blueprint(blp)
