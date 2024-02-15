"""Services internal API"""

import flask

from . import completeness  # noqa
from . import energy_consumption  # noqa
from . import degree_days  # noqa
from . import weather  # noqa


blp = flask.Blueprint("analysis", __name__, url_prefix="/analysis")


def register_blueprint(api_blp):
    blp.register_blueprint(completeness.blp)
    blp.register_blueprint(energy_consumption.blp)
    blp.register_blueprint(degree_days.blp)
    blp.register_blueprint(weather.blp)
    api_blp.register_blueprint(blp)
