"""Application internal API

It is a kind of proxy of BEMServer API.
To be used in browser client code such as ES6 fetch.
"""

import flask

from . import (
    analysis,
    campaign_scopes,
    campaigns,
    events,
    notifications,
    semantics,
    structural_elements,
    tasks,
    timeseries,
    user_groups,
    users,
)

blp = flask.Blueprint("api", __name__, url_prefix="/api")


MODULES = (
    structural_elements,
    campaigns,
    campaign_scopes,
    timeseries,
    user_groups,
    users,
    analysis,
    events,
    notifications,
    semantics,
    tasks,
)


def init_app(app):
    """Init application internal API"""
    for module in MODULES:
        module.register_blueprint(blp)
    app.register_blueprint(blp)
