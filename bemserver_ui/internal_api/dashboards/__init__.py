"""Dashboards internal API"""
import flask

from . import energy_consumption  # noqa


blp = flask.Blueprint("dashboards", __name__, url_prefix="/dashboards")


def register_blueprint(api_blp):
    blp.register_blueprint(energy_consumption.blp)
    api_blp.register_blueprint(blp)
