"""Application internal API

It is a kind of proxy of BEMServer API.
To be used in browser client code such as ES6 fetch.
"""
import flask

from . import sites
from . import buildings
from . import storeys
from . import spaces
from . import zones


blp = flask.Blueprint("api", __name__, url_prefix="/api")


MODULES = (
    sites,
    buildings,
    storeys,
    spaces,
    zones,
)


def init_app(app):
    """Init application API"""
    for module in MODULES:
        blp.register_blueprint(module.blp)
    app.register_blueprint(blp)
