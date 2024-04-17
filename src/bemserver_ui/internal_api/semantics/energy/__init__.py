"""Energy semantics internal API"""

import flask

from bemserver_ui.extensions import auth

from . import (
    consumption,  # noqa
    production,  # noqa
)

blp = flask.Blueprint("energy", __name__, url_prefix="/energy")


def register_blueprint(parent_blp):
    blp.register_blueprint(consumption.blp)
    blp.register_blueprint(production.blp)
    parent_blp.register_blueprint(blp)


@blp.route("/")
@auth.signin_required
def list():
    energies_resp = flask.g.api_client.energies.getall()
    return flask.jsonify(energies_resp.toJSON())
