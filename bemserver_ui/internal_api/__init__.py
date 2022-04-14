"""Application internal API

It is a kind of proxy of BEMServer API.
To be used in browser client code such as ES6 fetch.
"""
import flask

from . import structural_elements


blp = flask.Blueprint("api", __name__, url_prefix="/api")


MODULES = (
    structural_elements,
)


def init_app(app):
    """Init application API"""
    for module in MODULES:
        blp.register_blueprint(module.blp)
    app.register_blueprint(blp)
