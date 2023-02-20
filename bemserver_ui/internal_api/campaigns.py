"""Campaigns internal API"""
import flask

from bemserver_ui.extensions import auth
from bemserver_ui.extensions.campaign_context import deduce_campaign_state
from bemserver_ui.extensions.timezones import get_tz_info


blp = flask.Blueprint("campaigns", __name__, url_prefix="/campaigns")


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


@blp.route("/<int:id>")
@auth.signin_required
def retrieve_data(id):
    campaign_resp = flask.g.api_client.campaigns.getone(id)

    campaign_data = campaign_resp.toJSON()
    campaign_data["data"]["state"] = deduce_campaign_state(campaign_data["data"])
    campaign_data["data"]["timezone_info"] = get_tz_info(
        campaign_data["data"]["timezone"]
    )

    return flask.jsonify(campaign_data)
