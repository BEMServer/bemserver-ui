"""Campaigns internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth
from bemserver_ui.extensions.campaign_context import deduce_campaign_state


blp = flask.Blueprint("campaigns", __name__, url_prefix="/campaigns")


@blp.route("/<int:id>")
@auth.signin_required
def retrieve_data(id):
    try:
        campaign_resp = flask.g.api_client.campaigns.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign not found!")

    campaign_data = campaign_resp.toJSON()
    campaign_data["data"]["state"] = deduce_campaign_state(campaign_data["data"])

    return flask.jsonify(campaign_data)
