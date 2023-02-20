"""Timeseries internal API"""
from . import timeseries  # noqa
from . import datastates  # noqa
from . import data  # noqa


def register_blueprint(api_blp):
    timeseries.blp.register_blueprint(datastates.blp)
    timeseries.blp.register_blueprint(data.blp)
    api_blp.register_blueprint(timeseries.blp)
