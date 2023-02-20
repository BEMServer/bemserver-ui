"""Application internal API

It is a kind of proxy of BEMServer API.
To be used in browser client code such as ES6 fetch.
"""
import flask

from . import structural_elements
from . import campaigns
from . import campaign_scopes
from . import timeseries
from . import user_groups
from . import users
from . import analysis
from . import services
from . import events
from . import notifications


blp = flask.Blueprint("api", __name__, url_prefix="/api")


MODULES = (
    structural_elements,
    campaigns,
    campaign_scopes,
    user_groups,
    users,
    events,
    notifications,
)


def init_app(app):
    """Init application internal API"""
    for module in MODULES:
        blp.register_blueprint(module.blp)
    timeseries.register_blueprint(blp)
    services.register_blueprint(blp)
    analysis.register_blueprint(blp)
    app.register_blueprint(blp)
