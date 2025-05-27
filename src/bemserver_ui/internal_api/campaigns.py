"""Campaigns internal API"""

import flask

from bemserver_ui.extensions import auth
from bemserver_ui.extensions.campaign_context import deduce_campaign_state
from bemserver_ui.extensions.timezones import get_tz_info

blp = flask.Blueprint("campaigns", __name__, url_prefix="/campaigns")


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


@blp.route("/")
@auth.signin_required
def retrieve_list():
    campaigns_resp = flask.g.api_client.campaigns.getall()
    campaigns_data = campaigns_resp.toJSON()
    campaigns_data["data"] = [_prepare_campaign_data(x) for x in campaigns_data["data"]]
    return flask.jsonify(campaigns_data)


@blp.route("/<int:id>")
@auth.signin_required
def retrieve_data(id):
    campaign_resp = flask.g.api_client.campaigns.getone(id)
    campaign_data = campaign_resp.toJSON()
    campaign_data["data"] = _prepare_campaign_data(campaign_data["data"])
    return flask.jsonify(campaign_data)


def _prepare_campaign_data(campaign_data):
    campaign_data["state"] = deduce_campaign_state(campaign_data)
    campaign_data["timezone_info"] = get_tz_info(campaign_data["timezone"])
    return campaign_data
