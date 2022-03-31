"""Campaigns views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("campaigns", __name__, url_prefix="/campaigns")


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    try:
        campaigns = flask.g.api_client.campaigns.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/campaigns/list.html", campaigns=campaigns.data)
