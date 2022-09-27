"""All services views (cleanup...)"""
import flask

from . import cleanup  # noqa


blp = flask.Blueprint("services", __name__, url_prefix="/services")


def init_app(app):
    blp.register_blueprint(cleanup.blp)
    app.register_blueprint(blp)
