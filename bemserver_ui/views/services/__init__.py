"""All services views (cleanup...)"""
import flask

from . import cleanup  # noqa
from . import missing_data  # noqa
from . import outlier_data  # noqa


blp = flask.Blueprint("services", __name__, url_prefix="/services")


def init_app(app):
    blp.register_blueprint(cleanup.blp)
    blp.register_blueprint(missing_data.blp)
    blp.register_blueprint(outlier_data.blp)
    app.register_blueprint(blp)
