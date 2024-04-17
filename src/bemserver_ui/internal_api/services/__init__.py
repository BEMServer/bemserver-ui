"""Services internal API"""

import flask

from . import (
    cleanup,  # noqa
    missing_data,  # noqa
    outlier_data,  # noqa
    weather_data,  # noqa
)

blp = flask.Blueprint("services", __name__, url_prefix="/services")


def register_blueprint(api_blp):
    blp.register_blueprint(cleanup.blp)
    blp.register_blueprint(missing_data.blp)
    blp.register_blueprint(outlier_data.blp)
    blp.register_blueprint(weather_data.blp)
    api_blp.register_blueprint(blp)
