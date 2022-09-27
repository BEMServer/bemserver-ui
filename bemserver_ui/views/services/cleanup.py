"""Cleanup service views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("cleanup", __name__, url_prefix="/cleanup")


def _ensure_cleanup_campaign_data(cleanup_campaign):
    campaign_ctxt_data = flask.g.campaign_ctxt.get_data_for(
        cleanup_campaign["campaign_id"]
    )
    if campaign_ctxt_data is not None:
        if cleanup_campaign.get("campaign_name") is None:
            cleanup_campaign["campaign_name"] = campaign_ctxt_data["name"]
        cleanup_campaign["campaign_state"] = campaign_ctxt_data["state"]
        cleanup_campaign["campaign_timezone"] = campaign_ctxt_data["timezone"]
    else:
        cleanup_campaign["campaign_name"] = "?"
        cleanup_campaign["campaign_state"] = "?"
        cleanup_campaign["campaign_timezone"] = (
            flask.current_app.config.get("BEMSERVER_TIMEZONE_NAME") or "UTC"
        )
    return cleanup_campaign


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    ui_filters = {
        "campaign_state": "overall",
        "service_state": "all",
    }
    api_filters = {}
    # Get requested filters.
    if flask.request.method == "POST":
        ui_filters["campaign_state"] = flask.request.form["campaign_state"]
        ui_filters["service_state"] = flask.request.form["service_state"]
        if ui_filters["service_state"] == "on":
            api_filters["is_enabled"] = True
        elif ui_filters["service_state"] == "off":
            api_filters["is_enabled"] = False

    is_filtered = (
        ui_filters["campaign_state"] != "overall"
        or ui_filters["service_state"] != "all"
    )

    try:
        # Get cleanup campaign list.
        cleanup_campaigns_resp = flask.g.api_client.st_cleanup_by_campaign.get_full(
            sort="+campaign_name",
            **api_filters,
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    cleanup_campaigns = []
    for cleanup_camp in cleanup_campaigns_resp.data:
        cleanup_camp = _ensure_cleanup_campaign_data(cleanup_camp)
        if (
            ui_filters["campaign_state"] == "overall"
            or cleanup_camp["campaign_state"] == ui_filters["campaign_state"]
        ):
            cleanup_campaigns.append(cleanup_camp)

    return flask.render_template(
        "pages/services/cleanup/list.html",
        cleanup_campaigns=cleanup_campaigns,
        filters=ui_filters,
        is_filtered=is_filtered,
    )


def _get_cleanup_data(cleanup_id):
    try:
        cleanup_campaign_resp = flask.g.api_client.st_cleanup_by_campaign.getone(
            cleanup_id
        )
    except bac.BEMServerAPINotFoundError:
        cleanup_campaign = None
        cleanup_campaign_etag = None
    else:
        cleanup_campaign = cleanup_campaign_resp.data
        cleanup_campaign_etag = cleanup_campaign_resp.etag
    return (
        cleanup_campaign,
        cleanup_campaign_etag,
    )


def _get_cleanup_data_for_campaign(campaign_id):
    svc_resp = flask.g.api_client.st_cleanup_by_campaign.get_full(
        campaign_id=campaign_id,
    )
    cleanup_campaign = None
    if len(svc_resp.data) == 1:
        cleanup_campaign = svc_resp.data[0]
        cleanup_campaign_etag = None
    # Campaign ID is used to load cleanup data through the sidebar.
    # But sometimes cleanup can have its own id (and etag), check this.
    if cleanup_campaign is not None and cleanup_campaign["id"] is not None:
        cleanup_campaign, cleanup_campaign_etag = _get_cleanup_data(
            cleanup_campaign["id"]
        )
    return (
        cleanup_campaign,
        cleanup_campaign_etag,
    )


def _manage(cleanup_campaign, cleanup_campaign_etag):
    cleanup_campaign = _ensure_cleanup_campaign_data(cleanup_campaign)

    try:
        cleanup_ts_resp = flask.g.api_client.st_cleanup_by_timeseries.get_full(
            campaign_id=cleanup_campaign["campaign_id"],
            sort="-last_timestamp,+timeseries_name",
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    return flask.render_template(
        "pages/services/cleanup/manage.html",
        cleanup_campaign=cleanup_campaign,
        etag=cleanup_campaign_etag,
        cleanup_timeseries=cleanup_ts_resp.data,
    )


@blp.route("/<int:id>/manage")
@auth.signin_required
def manage(id):
    cleanup_data, cleanup_etag = _get_cleanup_data(id)
    return _manage(cleanup_data, cleanup_etag)


@blp.route("/manage/campaign/<int:id>")
@auth.signin_required
def manage_campaign(id):
    cleanup_data, cleanup_etag = _get_cleanup_data_for_campaign(id)
    return _manage(cleanup_data, cleanup_etag)
