"""Missing data service internal API"""
import flask

from bemserver_ui.extensions import auth
from bemserver_ui.extensions.campaign_context import CAMPAIGN_STATE_OVERALL
from bemserver_ui.views.services.missing_data import _extend_data


blp = flask.Blueprint("missing_data", __name__, url_prefix="/missing_data")


@blp.route("/list")
@auth.signin_required
def retrieve_list():
    campaign_state_filter = CAMPAIGN_STATE_OVERALL
    filters = {}
    if "in_campaign_name" in flask.request.args:
        filters["in_campaign_name"] = flask.request.args["in_campaign_name"]
    if "campaign_state" in flask.request.args:
        campaign_state_filter = flask.request.args["campaign_state"]
    if "service_state" in flask.request.args:
        if flask.request.args["service_state"] == "on":
            filters["is_enabled"] = True
        elif flask.request.args["service_state"] == "off":
            filters["is_enabled"] = False

    # Get check missing data service state for each campaign.
    missing_data_camp_resp = flask.g.api_client.st_check_missing_by_campaign.get_full(
        sort="+campaign_name",
        **filters,
    )
    missing_data_campaigns = []
    for md_camp_data in missing_data_camp_resp.data:
        md_camp_data = _extend_data(md_camp_data)
        if campaign_state_filter in [
            CAMPAIGN_STATE_OVERALL,
            md_camp_data["campaign_state"],
        ]:
            missing_data_campaigns.append(md_camp_data)

    return flask.jsonify(
        {
            "data": missing_data_campaigns,
        }
    )


@blp.route("/", methods=["POST"])
@auth.signin_required
def enable():
    payload = {
        "campaign_id": flask.request.json["campaign_id"],
        "is_enabled": flask.request.json["is_enabled"],
    }
    service_resp = flask.g.api_client.st_check_missing_by_campaign.create(payload)
    return flask.jsonify(service_resp.toJSON())


@blp.route("/<int:id>/", methods=["PUT"])
@auth.signin_required
def update_state(id):
    payload = {"is_enabled": flask.request.json["is_enabled"]}
    etag = flask.request.headers["ETag"]
    service_resp = flask.g.api_client.st_check_missing_by_campaign.update(
        id,
        payload,
        etag=etag,
    )
    return flask.jsonify(service_resp.toJSON())
