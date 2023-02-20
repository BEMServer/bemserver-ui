"""All timeseries views (properties, data states...)"""
from . import timeseries  # noqa
from . import datastates  # noqa
from . import properties  # noqa
from . import data  # noqa


def init_app(app):
    timeseries.blp.register_blueprint(datastates.blp)
    timeseries.blp.register_blueprint(properties.blp)
    timeseries.blp.register_blueprint(data.blp)
    app.register_blueprint(timeseries.blp)
