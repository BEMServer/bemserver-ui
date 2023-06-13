"""All analysis views (energy consumption, ...)"""
import flask

from . import energy_consumption  # noqa
from . import degree_days  # noqa
from . import weather  # noqa


blp = flask.Blueprint("analysis", __name__, url_prefix="/analysis")


def init_app(app):
    blp.register_blueprint(energy_consumption.blp)
    blp.register_blueprint(degree_days.blp)
    blp.register_blueprint(weather.blp)
    app.register_blueprint(blp)
