"""Application internal API

It is a kind of proxy of BEMServer API.
To be used in browser client code such as ES6 fetch.
"""
import flask

from . import structural_elements
from . import campaigns
from . import campaign_scopes
from . import timeseries
from . import timeseries_data
from . import timeseries_datastates
from . import user_groups
from . import users


blp = flask.Blueprint("api", __name__, url_prefix="/api")


MODULES = (
    structural_elements,
    campaigns,
    campaign_scopes,
    timeseries,
    timeseries_data,
    timeseries_datastates,
    user_groups,
    users,
)


def init_app(app):
    """Init application API"""
    for module in MODULES:
        blp.register_blueprint(module.blp)
    app.register_blueprint(blp)
